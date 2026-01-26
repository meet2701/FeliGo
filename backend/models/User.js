const mongoose = require('mongoose');

const userSchema  = new mongoose.Schema({
    
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

    firstName: {
        type: String,
        required: function() {return this.role === 'participant'; }
    },
    lastName: {
        type: String
    },
    contactNumber: {
        type: String
    },

    interests: [{ type: String}],
    followedClubs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // ORGANIZER

    organizerName: {
        type: String,
        required: function(){return this.role === 'organizer';}
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
},
{ timestamps: true}
);

module.exports = mongoose.model('User', userSchema);