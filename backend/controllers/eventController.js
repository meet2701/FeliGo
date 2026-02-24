const Event = require('../models/Event');
const User = require('../models/User');
const mongoose = require('mongoose');

// Fire a Discord webhook when an event is published
const notifyDiscord = async (webhookUrl, event) => {
    if (!webhookUrl) return;
    try {
        const payload = {
            content: null,
            embeds: [{
                title: `New Event Published: ${event.name}`,
                color: 0x3b82f6,
                fields: [
                    { name: 'Type', value: event.type, inline: true },
                    { name: 'Location', value: event.location || 'TBA', inline: true },
                    { name: 'Start', value: new Date(event.startDate).toLocaleString(), inline: false },
                    { name: 'Eligibility', value: event.eligibility || 'Open to All', inline: true },
                    { name: 'Price', value: event.price ? `₹${event.price}` : 'Free', inline: true }
                ]
            }]
        };
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Discord webhook error:', err.message);
    }
};

// Auto-update event statuses based on current time
const syncEventStatuses = async () => {
    const now = new Date();
    await Event.updateMany(
        { status: 'Published', startDate: { $lte: now } },
        { $set: { status: 'Ongoing' } }
    );
    await Event.updateMany(
        { status: 'Ongoing', endDate: { $lte: now } },
        { $set: { status: 'Completed' } }
    );
};

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Organizer only)
const createEvent = async (req, res) => {
    try {
        const {
            name,
            description,
            type,
            startDate,
            endDate,
            registrationDeadline,
            registrationLimit,
            price,
            location,
            tags,
            eligibility,
            status,
            formFields,
            stock,
            purchaseLimit,
            itemDetails
        } = req.body;

        if (status === 'Published') {
            if (!name || !description || !type || !startDate || !endDate || !registrationDeadline || !eligibility) {
                return res.status(400).json({ message: 'Please fill in all required fields before publishing' });
            }
        } else {
            if (!name) {
                return res.status(400).json({ message: 'Event name is required' });
            }
        }

        if (registrationDeadline && startDate && new Date(registrationDeadline) > new Date(startDate)) {
            return res.status(400).json({ message: 'Registration deadline must be on or before the event start date' });
        }

        const eventData = {
            organizer: req.user.id,
            name, description, type,
            startDate, endDate, registrationDeadline, registrationLimit,
            price, location, tags, eligibility,
            status: status || 'Draft',
            formFields: formFields || []
        };

        if (type === 'merchandise') {
            eventData.stock = stock || 0;
            eventData.purchaseLimit = purchaseLimit || 1;
            if (itemDetails) eventData.itemDetails = itemDetails;
            if (!req.body.upiId || !req.body.upiId.trim()) {
                return res.status(400).json({ message: 'UPI ID is required for merchandise events' });
            }
            eventData.upiId = req.body.upiId.trim();
        }

        const event = await Event.create(eventData);

        if (event.status === 'Published') {
            const organizer = await User.findById(req.user.id).select('discordWebhook');
            await notifyDiscord(organizer?.discordWebhook, event);
        }

        res.status(201).json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get events
// @route   GET /api/events
// @access  Public (or Private based on needs)
const getEvents = async (req, res) => {
    try {
        await syncEventStatuses();
        let events;
        if (req.query.organizer) {
            events = await Event.find({ organizer: req.query.organizer }).populate('organizer', 'organizerName name email');
        } else {
            events = await Event.find({ status: { $in: ['Published', 'Ongoing'] } }).populate('organizer', 'organizerName name email');
        }
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get logged in organizer's events
// @route   GET /api/events/myevents
// @access  Private (Organizer)
const getMyEvents = async (req, res) => {
    try {
        await syncEventStatuses();
        const events = await Event.find({ organizer: req.user.id });
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res) => {
    try {
        await syncEventStatuses();
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Event ID' });
        }
        const event = await Event.findById(req.params.id).populate('organizer', 'name email organizerName');
        if (event) {
            res.json(event);
        } else {
            res.status(404).json({ message: 'Event not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Organizer)
const updateEvent = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Event ID' });
        }
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.organizer.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to edit this event' });
        }

        const currentStatus = event.status;
        const hasRegistrations = event.participants && event.participants.length > 0;

        if (currentStatus === 'Ongoing' || currentStatus === 'Completed') {
            if (req.body.action === 'cancel') {
                event.status = 'Cancelled';
                await event.save();
                return res.json(event);
            }
            return res.status(400).json({ message: `Cannot edit a ${currentStatus} event. Only cancellation is allowed.` });
        }

        if (currentStatus === 'Cancelled') {
            return res.status(400).json({ message: 'Cannot edit a Cancelled event.' });
        }

        // Published: description, extend deadline, increase limit, close registrations, cancel, or form fields (if no registrations yet)
        if (currentStatus === 'Published') {
            const allowed = {};

            if (req.body.description !== undefined) allowed.description = req.body.description;

            // Allow form field updates only if no one has registered yet
            if (req.body.formFields && !hasRegistrations) allowed.formFields = req.body.formFields;

            // Can only extend deadline (new deadline must be >= current)
            if (req.body.registrationDeadline) {
                if (new Date(req.body.registrationDeadline) >= new Date(event.registrationDeadline)) {
                    allowed.registrationDeadline = req.body.registrationDeadline;
                }
            }

            // Can only increase limit (not decrease)
            if (req.body.registrationLimit !== undefined) {
                if (Number(req.body.registrationLimit) >= (event.registrationLimit || 0)) {
                    allowed.registrationLimit = req.body.registrationLimit;
                }
            }

            // Close registrations: set deadline to now
            if (req.body.action === 'closeRegistrations') {
                allowed.registrationDeadline = new Date();
            }

            // Cancel event
            if (req.body.action === 'cancel') {
                allowed.status = 'Cancelled';
            }

            if (Object.keys(allowed).length === 0) {
                return res.status(400).json({ message: 'No valid updates provided for a Published event.' });
            }

            const updatedEvent = await Event.findByIdAndUpdate(req.params.id, allowed, { new: true });
            return res.json(updatedEvent);
        }

        if (hasRegistrations && req.body.formFields) {
            delete req.body.formFields;
        }

        const isPublishing = currentStatus === 'Draft' && req.body.status === 'Published';

        if (req.body.type === 'merchandise' || (event.type === 'merchandise')) {
            const upiCandidate = req.body.upiId || event.upiId;
            if (!upiCandidate || !upiCandidate.trim()) {
                return res.status(400).json({ message: 'UPI ID is required for merchandise events' });
            }
            req.body.upiId = upiCandidate.trim();
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (isPublishing && updatedEvent) {
            const organizer = await User.findById(req.user.id).select('discordWebhook');
            await notifyDiscord(organizer?.discordWebhook, updatedEvent);
        }

        res.json(updatedEvent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};



// @desc    Get top 5 trending events by registrations in last 24h
// @route   GET /api/events/trending
// @access  Public
async function getTrendingEvents(req, res) {
    try {
        await syncEventStatuses();
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const events = await Event.find({ status: { $in: ['Published', 'Ongoing'] } })
            .populate('organizer', 'organizerName');

        const withCounts = events.map(e => ({
            ...e.toObject(),
            recentRegistrations: e.participants.filter(
                p => new Date(p.registeredAt) >= since
            ).length
        }));

        const trending = withCounts
            .filter(e => e.recentRegistrations > 0)
            .sort((a, b) => b.recentRegistrations - a.recentRegistrations)
            .slice(0, 5);

        res.json(trending);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
}


module.exports = {
    createEvent,
    getEvents,
    getMyEvents,
    getEventById,
    updateEvent,
    syncEventStatuses,
    getTrendingEvents
};
