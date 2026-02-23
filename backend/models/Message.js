const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderName: { type: String },
    senderRole: { type: String },    
    text: {
        type: String,
        required: true,
        maxlength: 2000
    },
    isAnnouncement: {
        type: Boolean,
        default: false
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    parentMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    reactions: {
        type: Map,
        of: [String],
        default: {}
    }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
