const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    // COMMON FIELDS

    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['participant', 'organizer', 'admin'],
        default: 'participant'
    },

    // PARTICIPANTS

    participantType: {
        type: String,
        enum: ['IIIT', 'Non-IIIT'],
        required: function () { return this.role === 'participant'; }
    },

    firstName: {
        type: String,
        required: function () { return this.role === 'participant'; }
    },
    lastName: {
        type: String
    },
    contactNumber: {
        type: String
    },

    college: {
        type: String
    },

    interests: [{ type: String }],

    hasCompletedOnboarding: {
        type: Boolean,
        default: false
    },

    followedClubs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],

    // ORGANIZER

    organizerName: {
        type: String,
        required: function () { return this.role === 'organizer'; }
    },
    category: {
        type: String
    },
    description: {
        type: String
    },
    website: {
        type: String
    },

    discordWebhook: {
        type: String,
        default: ''
    },

    contactEmail: {
        type: String
    },

    isDisabled: {
        type: Boolean,
        default: false
    },
},
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);