const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Room = require('../models/Room');
const { JWT_SECRET } = require('../middleware/auth');

// Track online users: socketId -> { userId, username }
const onlineUsers = new Map();

function setupSocket(io) {
    // Authentication middleware for socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication required'));

            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.userId);
            if (!user) return next(new Error('User not found'));

            socket.userId = user._id.toString();
            socket.username = user.username;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        console.log(`  [+] Connected: ${socket.username} (${socket.id})`);

        // Set user online
        onlineUsers.set(socket.id, {
            userId: socket.userId,
            username: socket.username,
        });

        await User.findByIdAndUpdate(socket.userId, { status: 'online', lastSeen: new Date() });

        // Broadcast online users
        broadcastOnlineUsers(io);

        // Join user's rooms
        const rooms = await Room.find({ members: socket.userId });
        rooms.forEach((room) => {
            socket.join(room._id.toString());
        });

        // ── Join Room ──
        socket.on('join-room', async (roomId) => {
            socket.join(roomId);
            const room = await Room.findById(roomId).populate('members', 'username avatar status');
            if (room) {
                socket.emit('room-data', room);
            }
        });

        // ── Leave Room ──
        socket.on('leave-room', (roomId) => {
            socket.leave(roomId);
        });

        // ── Chat Message ──
        socket.on('chat-message', async (data) => {
            try {
                const { roomId, content, replyTo } = data;
                if (!content || !roomId) return;

                const message = new Message({
                    room: roomId,
                    sender: socket.userId,
                    senderUsername: socket.username,
                    type: 'text',
                    content: content.trim(),
                    replyTo: replyTo || null,
                });
                await message.save();

                // Populate replyTo
                let populated = message.toObject();
                if (replyTo) {
                    const replyMsg = await Message.findById(replyTo).select('content senderUsername type').lean();
                    populated.replyTo = replyMsg;
                }

                // Update room's last message
                await Room.findByIdAndUpdate(roomId, {
                    lastMessage: {
                        content: content.trim().substring(0, 100),
                        sender: socket.username,
                        timestamp: new Date(),
                    },
                });

                io.to(roomId).emit('chat-message', populated);
            } catch (err) {
                console.error('Message error:', err);
            }
        });

        // ── File Message ──
        socket.on('file-message', async (data) => {
            try {
                const { roomId, file } = data;
                if (!file || !roomId) return;

                const isImage = file.mimetype && file.mimetype.startsWith('image/');
                const message = new Message({
                    room: roomId,
                    sender: socket.userId,
                    senderUsername: socket.username,
                    type: isImage ? 'image' : 'file',
                    content: file.originalname,
                    file: {
                        url: file.url,
                        originalname: file.originalname,
                        size: file.size,
                        mimetype: file.mimetype,
                    },
                });
                await message.save();

                // Update room's last message
                await Room.findByIdAndUpdate(roomId, {
                    lastMessage: {
                        content: `📎 ${file.originalname}`,
                        sender: socket.username,
                        timestamp: new Date(),
                    },
                });

                io.to(roomId).emit('file-message', message.toObject());
            } catch (err) {
                console.error('File message error:', err);
            }
        });

        // ── Typing ──
        socket.on('typing', (roomId) => {
            socket.to(roomId).emit('typing', { username: socket.username, roomId });
        });

        socket.on('stop-typing', (roomId) => {
            socket.to(roomId).emit('stop-typing', { username: socket.username, roomId });
        });

        // ── Reactions ──
        socket.on('add-reaction', async (data) => {
            try {
                const { messageId, emoji } = data;
                const message = await Message.findById(messageId);
                if (!message) return;

                // Remove existing reaction from this user on this emoji
                message.reactions = message.reactions.filter(
                    (r) => !(r.user.toString() === socket.userId && r.emoji === emoji)
                );

                // Add reaction
                message.reactions.push({
                    emoji,
                    user: socket.userId,
                    username: socket.username,
                });

                await message.save();

                io.to(message.room.toString()).emit('reaction-updated', {
                    messageId,
                    reactions: message.reactions,
                });
            } catch (err) {
                console.error('Reaction error:', err);
            }
        });

        socket.on('remove-reaction', async (data) => {
            try {
                const { messageId, emoji } = data;
                const message = await Message.findById(messageId);
                if (!message) return;

                message.reactions = message.reactions.filter(
                    (r) => !(r.user.toString() === socket.userId && r.emoji === emoji)
                );

                await message.save();

                io.to(message.room.toString()).emit('reaction-updated', {
                    messageId,
                    reactions: message.reactions,
                });
            } catch (err) {
                console.error('Remove reaction error:', err);
            }
        });

        // ── Read receipts ──
        socket.on('mark-read', async (data) => {
            try {
                const { roomId } = data;
                await Message.updateMany(
                    {
                        room: roomId,
                        'readBy.user': { $ne: socket.userId },
                    },
                    {
                        $addToSet: {
                            readBy: { user: socket.userId, readAt: new Date() },
                        },
                    }
                );

                io.to(roomId).emit('messages-read', {
                    roomId,
                    userId: socket.userId,
                    username: socket.username,
                });
            } catch (err) {
                console.error('Read receipt error:', err);
            }
        });

        // ── Edit message ──
        socket.on('edit-message', async (data) => {
            try {
                const { messageId, content } = data;
                const message = await Message.findById(messageId);
                if (!message || message.sender.toString() !== socket.userId) return;

                message.content = content;
                message.edited = true;
                await message.save();

                io.to(message.room.toString()).emit('message-edited', {
                    messageId,
                    content,
                    edited: true,
                });
            } catch (err) {
                console.error('Edit message error:', err);
            }
        });

        // ── Delete message ──
        socket.on('delete-message', async (data) => {
            try {
                const { messageId } = data;
                const message = await Message.findById(messageId);
                if (!message || message.sender.toString() !== socket.userId) return;

                const roomId = message.room.toString();
                await Message.findByIdAndDelete(messageId);

                io.to(roomId).emit('message-deleted', { messageId });
            } catch (err) {
                console.error('Delete message error:', err);
            }
        });

        // ── Pin message ──
        socket.on('pin-message', async (data) => {
            try {
                const { messageId } = data;
                const message = await Message.findById(messageId);
                if (!message) return;

                message.pinned = true;
                message.pinnedBy = socket.userId;
                await message.save();

                io.to(message.room.toString()).emit('message-pinned', {
                    messageId,
                    pinned: true,
                    pinnedBy: socket.username,
                });
            } catch (err) {
                console.error('Pin message error:', err);
            }
        });

        socket.on('unpin-message', async (data) => {
            try {
                const { messageId } = data;
                const message = await Message.findById(messageId);
                if (!message) return;

                message.pinned = false;
                message.pinnedBy = null;
                await message.save();

                io.to(message.room.toString()).emit('message-unpinned', {
                    messageId,
                });
            } catch (err) {
                console.error('Unpin message error:', err);
            }
        });

        // ── Direct Messages ──
        socket.on('create-dm', async (data) => {
            try {
                const { targetUserId } = data;
                const targetUser = await User.findById(targetUserId);
                if (!targetUser) return;

                // Check if DM room already exists
                const existing = await Room.findOne({
                    type: 'dm',
                    members: { $all: [socket.userId, targetUserId], $size: 2 },
                });

                if (existing) {
                    const populated = await Room.findById(existing._id).populate('members', 'username avatar status');
                    socket.emit('dm-created', populated);
                    return;
                }

                const room = new Room({
                    name: `${socket.username} & ${targetUser.username}`,
                    type: 'dm',
                    creator: socket.userId,
                    members: [socket.userId, targetUserId],
                    icon: '✉️',
                });
                await room.save();

                const populated = await Room.findById(room._id).populate('members', 'username avatar status');

                // Notify both users
                socket.emit('dm-created', populated);
                socket.join(room._id.toString());

                // Find target user's socket and make them join too
                for (const [sid, uData] of onlineUsers.entries()) {
                    if (uData.userId === targetUserId) {
                        const targetSocket = io.sockets.sockets.get(sid);
                        if (targetSocket) {
                            targetSocket.join(room._id.toString());
                            targetSocket.emit('dm-created', populated);
                        }
                    }
                }
            } catch (err) {
                console.error('Create DM error:', err);
            }
        });

        // ── Update user status ──
        socket.on('update-status', async (data) => {
            try {
                const { status, statusMessage } = data;
                const validStatuses = ['online', 'away', 'busy'];
                if (!validStatuses.includes(status)) return;

                await User.findByIdAndUpdate(socket.userId, {
                    status,
                    ...(statusMessage !== undefined && { statusMessage }),
                });

                broadcastOnlineUsers(io);
            } catch (err) {
                console.error('Update status error:', err);
            }
        });

        // ── Disconnect ──
        socket.on('disconnect', async () => {
            console.log(`  [-] Disconnected: ${socket.username}`);
            onlineUsers.delete(socket.id);

            await User.findByIdAndUpdate(socket.userId, {
                status: 'offline',
                lastSeen: new Date(),
            });

            broadcastOnlineUsers(io);
        });
    });
}

async function broadcastOnlineUsers(io) {
    const users = Array.from(onlineUsers.values());
    // Deduplicate by userId (user may have multiple tabs)
    const unique = [];
    const seen = new Set();
    for (const u of users) {
        if (!seen.has(u.userId)) {
            seen.add(u.userId);
            unique.push(u);
        }
    }

    // Fetch status from DB for each user
    try {
        const userIds = unique.map((u) => u.userId);
        const dbUsers = await User.find({ _id: { $in: userIds } }).select('status statusMessage').lean();
        const statusMap = {};
        dbUsers.forEach((u) => {
            statusMap[u._id.toString()] = { status: u.status, statusMessage: u.statusMessage };
        });
        const enriched = unique.map((u) => ({
            ...u,
            status: statusMap[u.userId]?.status || 'online',
            statusMessage: statusMap[u.userId]?.statusMessage || '',
        }));
        io.emit('online-users', enriched);
    } catch {
        io.emit('online-users', unique);
    }
}

module.exports = setupSocket;
