const express = require('express');
const User = require('../models/User');
const Room = require('../models/Room');
const { auth, generateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check existing user
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            return res.status(400).json({ error: 'Username already taken' });
        }

        const user = new User({ username, email, password });
        await user.save();

        // Auto-join "General" room
        const generalRoom = await Room.findOne({ name: 'General' });
        if (generalRoom) {
            generalRoom.members.push(user._id);
            await generalRoom.save();
        }

        const token = generateToken(user._id);
        res.status(201).json({ user, token });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        user.status = 'online';
        user.lastSeen = new Date();
        await user.save();

        const token = generateToken(user._id);
        res.json({ user, token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    res.json({ user: req.user });
});

// Update profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { bio, statusMessage, avatar } = req.body;
        const updates = {};

        if (bio !== undefined) updates.bio = bio;
        if (statusMessage !== undefined) updates.statusMessage = statusMessage;
        if (avatar !== undefined) updates.avatar = avatar;

        const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Get all users (for starting DMs etc.)
router.get('/users', auth, async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } })
            .select('username avatar status statusMessage lastSeen')
            .sort('username');
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

module.exports = router;
