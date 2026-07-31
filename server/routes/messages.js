const express = require('express');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get messages for a room (with pagination)
router.get('/room/:roomId', auth, async (req, res) => {
    try {
        const { roomId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const messages = await Message.find({ room: roomId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('replyTo', 'content senderUsername type')
            .lean();

        const total = await Message.countDocuments({ room: roomId });

        res.json({
            messages: messages.reverse(),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: skip + limit < total,
            },
        });
    } catch (err) {
        console.error('Fetch messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Search messages
router.get('/search', auth, async (req, res) => {
    try {
        const { q, roomId } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }

        const filter = {
            content: { $regex: q, $options: 'i' },
            type: 'text',
        };
        if (roomId) filter.room = roomId;

        const messages = await Message.find(filter)
            .sort({ createdAt: -1 })
            .limit(30)
            .populate('room', 'name icon')
            .lean();

        res.json({ messages, query: q });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get pinned messages for a room
router.get('/room/:roomId/pinned', auth, async (req, res) => {
    try {
        const messages = await Message.find({
            room: req.params.roomId,
            pinned: true,
        })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ messages });
    } catch (err) {
        console.error('Fetch pinned error:', err);
        res.status(500).json({ error: 'Failed to fetch pinned messages' });
    }
});

module.exports = router;
