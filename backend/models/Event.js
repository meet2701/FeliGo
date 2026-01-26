const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: {
        type: String, 
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['normal', 'merchandise'],
        required: true
    },

    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    registrationDeadline: {
        type: Date,
        required: true
    },
    registrationLimit: {
        type: Number
    },

    price: {
        type: Number,
        default: 0
    },
    location: {
        type: String
    },
    tags: [{
        type:String
    }],

    stock: {
        type: Number
    },
    itemDetails: {
        type: Map,
        of: String
    }
},
{timestamps:true});

module.exports = mongoose.model('Event', eventSchema);