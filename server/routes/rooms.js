const express = require('express');
const Room = require('../models/Room');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all rooms the user is a member of
router.get('/', auth, async (req, res) => {
    try {
        const rooms = await Room.find({
            $or: [
                { members: req.user._id },
                { type: 'public' },
            ],
        })
            .populate('members', 'username avatar status')
            .sort({ updatedAt: -1 });

        res.json({ rooms });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// Create a room
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, type, icon } = req.body;

        if (!name || name.trim().length < 1) {
            return res.status(400).json({ error: 'Room name is required' });
        }

        const existing = await Room.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ error: 'Room name already exists' });
        }

        const room = new Room({
            name: name.trim(),
            description: description || '',
            type: type || 'public',
            icon: icon || '💬',
            creator: req.user._id,
            members: [req.user._id],
        });
        await room.save();

        // Add system message
        const sysMsg = new Message({
            room: room._id,
            sender: req.user._id,
            senderUsername: 'System',
            type: 'system',
            content: `${req.user.username} created this room`,
        });
        await sysMsg.save();

        const populated = await Room.findById(room._id).populate('members', 'username avatar status');
        res.status(201).json({ room: populated });
    } catch (err) {
        console.error('Create room error:', err);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// Join a room
router.post('/:roomId/join', auth, async (req, res) => {
    try {
        const room = await Room.findById(req.params.roomId);
        if (!room) return res.status(404).json({ error: 'Room not found' });

        if (!room.members.includes(req.user._id)) {
            room.members.push(req.user._id);
            await room.save();

            // System message
            const sysMsg = new Message({
                room: room._id,
                sender: req.user._id,
                senderUsername: 'System',
                type: 'system',
                content: `${req.user.username} joined the room`,
            });
            await sysMsg.save();
        }

        const populated = await Room.findById(room._id).populate('members', 'username avatar status');
        res.json({ room: populated });
    } catch (err) {
        res.status(500).json({ error: 'Failed to join room' });
    }
});

// Leave a room
router.post('/:roomId/leave', auth, async (req, res) => {
    try {
        const room = await Room.findById(req.params.roomId);
        if (!room) return res.status(404).json({ error: 'Room not found' });

        room.members = room.members.filter(m => m.toString() !== req.user._id.toString());
        await room.save();

        res.json({ message: 'Left room successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to leave room' });
    }
});

module.exports = router;
