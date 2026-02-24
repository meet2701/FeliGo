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
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled'],
        default: 'Draft' 
    },
    eligibility: {
        type: String,
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
        type: String
    }],

    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        registeredAt: {
            type: Date,
            default: Date.now
        },
        responses: {
            type: Map, of: String
        },
        paymentStatus: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Approved' 
        },
        paymentProofUrl: {
            type: String
        },
        paymentNote: {
            type: String 
        },
        attendanceMarked: {
            type: Boolean,
            default: false
        },
        attendanceAt: {
            type: Date
        }
    }],

    formFields: [{
        label: { type: String, required: true }, 
        fieldType: { type: String, enum: ['text', 'number', 'dropdown', 'checkbox', 'file'], default: 'text' },
        options: [{ type: String }], 
        required: { type: Boolean, default: true }
    }],

    stock: {
        type: Number,
        default: 0
    },
    purchaseLimit: {
        type: Number,
        default: 1
    },
    itemDetails: {
        type: Map,
        of: [String]
    }
    ,
    upiId: {
        type: String
    }
},
    { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);