const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    description: {
        type: String,
        default: '',
        maxlength: 200,
    },
    type: {
        type: String,
        enum: ['public', 'private', 'dm'],
        default: 'public',
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    icon: {
        type: String,
        default: '💬',
    },
    lastMessage: {
        content: String,
        sender: String,
        timestamp: Date,
    },
}, { timestamps: true });

roomSchema.index({ name: 1 });
roomSchema.index({ members: 1 });

module.exports = mongoose.model('Room', roomSchema);
