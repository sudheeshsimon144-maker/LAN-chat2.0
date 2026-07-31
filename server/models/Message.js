const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
    emoji: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
}, { _id: false });

const messageSchema = new mongoose.Schema({
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    senderUsername: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['text', 'file', 'system', 'image'],
        default: 'text',
    },
    content: {
        type: String,
        default: '',
    },
    file: {
        url: String,
        originalname: String,
        size: Number,
        mimetype: String,
    },
    reactions: [reactionSchema],
    readBy: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
    }],
    edited: {
        type: Boolean,
        default: false,
    },
    pinned: {
        type: Boolean,
        default: false,
    },
    pinnedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null,
    },
}, { timestamps: true });

// Index for search
messageSchema.index({ content: 'text' });
messageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
