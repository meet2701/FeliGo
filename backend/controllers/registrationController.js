const Event = require('../models/Event');
const User = require('../models/User');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { sendEmail, buildTicketEmail } = require('../utils/email');

// @desc    Register user for an event (with custom form answers)
// @route   POST /api/events/:id/register
// @access  Private (Participant)
const registerForEvent = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Event ID' });
        }

        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.status !== 'Published') {
            return res.status(400).json({ message: 'Registrations are not open for this event' });
        }

        if (new Date(event.registrationDeadline) < new Date()) {
            return res.status(400).json({ message: 'Registration deadline has passed' });
        }

        if (event.eligibility === 'IIIT Only' && req.user.participantType !== 'IIIT') {
            return res.status(403).json({ message: 'This event is restricted to IIIT students only' });
        }

        // ---- Normal Event ----
        if (event.type === 'normal') {
            const alreadyRegistered = event.participants.find(
                (r) => r.user.toString() === req.user.id
            );
            if (alreadyRegistered) {
                return res.status(400).json({ message: 'You are already registered for this event' });
            }

            if (event.registrationLimit > 0 && event.participants.length >= event.registrationLimit) {
                return res.status(400).json({ message: 'Event is fully booked' });
            }

            const { responses } = req.body;
            const answersMap = {};

            if (event.formFields && event.formFields.length > 0) {
                for (const field of event.formFields) {
                    const answer = responses ? responses[field.label] : undefined;

                    if (field.required && (answer === undefined || answer === null || answer === '')) {
                        return res.status(400).json({
                            message: `Required field missing: "${field.label}"`
                        });
                    }

                    if (field.fieldType === 'dropdown' && answer && field.options.length > 0) {
                        if (!field.options.includes(answer)) {
                            return res.status(400).json({
                                message: `Invalid option for "${field.label}". Valid options: ${field.options.join(', ')}`
                            });
                        }
                    }

                    if (answer !== undefined) {
                        answersMap[field.label] = answer;
                    }
                }
            }

            event.participants.push({
                user: req.user.id,
                responses: answersMap,
                registeredAt: new Date()
            });

            await event.save();

            const organizer = await User.findById(event.organizer).select('organizerName');
            const newEntry = event.participants[event.participants.length - 1];
            const qrBuffer = await QRCode.toBuffer(JSON.stringify({
                ticketId: newEntry._id,
                eventName: event.name,
                registeredAt: newEntry.registeredAt
            }));
            const qrBase64 = qrBuffer.toString('base64');
            await sendEmail({
                to: req.user.email,
                toName: req.user.firstName || req.user.email,
                subject: `Registration Confirmed — ${event.name}`,
                htmlContent: buildTicketEmail({
                    participantName: req.user.firstName || req.user.email,
                    eventName: event.name,
                    eventDate: event.startDate,
                    eventLocation: event.location,
                    organizer: organizer?.organizerName || 'FeliGo',
                    ticketId: newEntry._id,
                    registeredAt: newEntry.registeredAt,
                    type: 'normal',
                    qrBase64
                }),
                qrBase64
            });

            return res.status(200).json({ message: 'Registration Successful!' });
        }

        // ---- Merchandise Event ----
        if (event.type === 'merchandise') {
            if (event.stock <= 0) {
                return res.status(400).json({ message: 'Out of stock' });
            }

            if (event.registrationLimit > 0) {
                const approvedCount = event.participants.filter(p => p.paymentStatus === 'Approved').length;
                if (approvedCount >= event.registrationLimit) {
                    return res.status(400).json({ message: 'Event is fully booked' });
                }
            }

            const userPurchases = event.participants.filter(
                (p) => p.user.toString() === req.user.id && p.paymentStatus !== 'Rejected'
            ).length;

            if (userPurchases >= (event.purchaseLimit || 1)) {
                return res.status(400).json({
                    message: `Purchase limit reached (max ${event.purchaseLimit} per person)`
                });
            }

            const { paymentProofUrl, responses } = req.body;
            if (!paymentProofUrl) {
                return res.status(400).json({ message: 'Payment proof is required for merchandise orders' });
            }

            const answersMap = {};
            if (event.itemDetails && event.itemDetails.size > 0) {
                for (const [variantName, options] of event.itemDetails.entries()) {
                    const answer = responses ? responses[variantName] : undefined;
                    if (!answer || answer === '') {
                        return res.status(400).json({ message: `Please select a value for: "${variantName}"` });
                    }
                    if (!options.includes(answer)) {
                        return res.status(400).json({
                            message: `Invalid option for "${variantName}". Valid options: ${options.join(', ')}`
                        });
                    }
                    answersMap[variantName] = answer;
                }
            }

            if (event.formFields && event.formFields.length > 0) {
                for (const field of event.formFields) {
                    const answer = responses ? responses[field.label] : undefined;
                    if (field.required && (answer === undefined || answer === null || answer === '')) {
                        return res.status(400).json({ message: `Required field missing: "${field.label}"` });
                    }
                    if (answer !== undefined) answersMap[field.label] = answer;
                }
            }

            event.participants.push({
                user: req.user.id,
                registeredAt: new Date(),
                paymentStatus: 'Pending',
                paymentProofUrl,
                responses: answersMap
            });
            await event.save();

            const newEntry = event.participants[event.participants.length - 1];
            return res.status(200).json({
                message: 'Order placed. Awaiting payment verification by organizer.',
                orderId: newEntry._id
            });
        }

        res.status(400).json({ message: 'Unknown event type' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all events the logged-in participant has registered for
// @route   GET /api/events/my-registrations
// @access  Private (Participant)
const getRegisteredEvents = async (req, res) => {
    try {
        const events = await Event.find({ 'participants.user': req.user.id })
            .populate('organizer', 'organizerName email category');

        // Approved > Pending > Rejected
        const STATUS_PRIORITY = { Approved: 0, Pending: 1, Rejected: 2 };
        const result = events.map(event => {
            const myEntries = event.participants.filter(
                p => p.user.toString() === req.user.id
            );
            const myEntry = myEntries.sort(
                (a, b) => (STATUS_PRIORITY[a.paymentStatus] ?? 1) - (STATUS_PRIORITY[b.paymentStatus] ?? 1)
            )[0];
            return {
                ...event.toObject(),
                myRegistration: {
                    ticketId: myEntry?._id,
                    registeredAt: myEntry?.registeredAt,
                    paymentStatus: myEntry?.paymentStatus || 'Approved',
                    paymentNote: myEntry?.paymentNote || '',
                    responses: myEntry?.responses ? Object.fromEntries(myEntry.responses) : {}
                }
            };
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};



// @desc    Get all participants for an organizer's event (with form answers)
// @route   GET /api/events/:id/participants
// @access  Private (Organizer only)
async function getEventParticipants(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Event ID' });
        }

        const event = await Event.findById(req.params.id)
            .populate('participants.user', 'firstName lastName email participantType college contactNumber');

        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view this event\'s participants' });
        }

        const participants = event.participants.map((p, index) => ({
            srNo: index + 1,
            participantId: p._id,
            name: p.user ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() : 'Deleted User',
            email: p.user?.email || 'N/A',
            participantType: p.user?.participantType || 'N/A',
            college: p.user?.college || 'N/A',
            contactNumber: p.user?.contactNumber || 'N/A',
            registeredAt: p.registeredAt,
            paymentStatus: p.paymentStatus || 'Approved',
            attendanceMarked: p.attendanceMarked || false,
            attendanceAt: p.attendanceAt || null,
            responses: p.responses ? Object.fromEntries(p.responses) : {}
        }));

        const totalRegistrations = participants.length;
        const approvedCount = event.participants.filter(p => p.paymentStatus === 'Approved').length;
        const pendingCount = event.participants.filter(p => p.paymentStatus === 'Pending').length;
        const revenue = event.type === 'merchandise'
            ? approvedCount * (event.price || 0)
            : totalRegistrations * (event.price || 0);

        res.json({
            eventName: event.name,
            eventType: event.type,
            formFields: event.formFields || [],
            totalRegistrations,
            approvedCount,
            pendingCount,
            revenue,
            participants
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
}


// @desc    Get all merchandise orders for an organizer's event (with payment proof)
// @route   GET /api/events/:id/orders
// @access  Private (Organizer)
const getPaymentOrders = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid Event ID' });
        }
        const event = await Event.findById(req.params.id)
            .populate('participants.user', 'firstName lastName email');
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const orders = event.participants.map((p, i) => ({
            orderId: p._id,
            srNo: i + 1,
            name: p.user ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() : 'Deleted',
            email: p.user?.email || 'N/A',
            registeredAt: p.registeredAt,
            paymentStatus: p.paymentStatus,
            paymentProofUrl: p.paymentProofUrl,
            paymentNote: p.paymentNote,
            responses: p.responses ? Object.fromEntries(p.responses) : {}
        }));
        res.json({ eventName: event.name, stock: event.stock, orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Approve a merchandise payment order
// @route   PUT /api/events/:id/orders/:orderId/approve
// @access  Private (Organizer)
const approvePayment = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const entry = event.participants.id(req.params.orderId);
        if (!entry) return res.status(404).json({ message: 'Order not found' });
        if (entry.paymentStatus === 'Approved') {
            return res.status(400).json({ message: 'Already approved' });
        }

        if (event.stock !== null && event.stock !== undefined && event.stock <= 0) {
            return res.status(400).json({
                message: 'Cannot approve — stock is exhausted. Reject this order or increase stock by editing the event.'
            });
        }

        entry.paymentStatus = 'Approved';
        entry.paymentNote = req.body.note || '';
        event.stock = Math.max(0, event.stock - 1);
        await event.save();

        const participant = await User.findById(entry.user).select('email firstName');
        const organizer = await User.findById(event.organizer).select('organizerName discordWebhook');
        const qrBuffer = await QRCode.toBuffer(JSON.stringify({
            ticketId: entry._id,
            eventName: event.name,
            registeredAt: entry.registeredAt
        }));
        const qrBase64 = qrBuffer.toString('base64');
        await sendEmail({
            to: participant.email,
            toName: participant.firstName || participant.email,
            subject: `Purchase Confirmed — ${event.name}`,
            htmlContent: buildTicketEmail({
                participantName: participant.firstName || participant.email,
                eventName: event.name,
                eventDate: event.startDate,
                eventLocation: event.location,
                organizer: organizer?.organizerName || 'FeliGo',
                ticketId: entry._id,
                registeredAt: entry.registeredAt,
                type: 'merchandise',
                responses: entry.responses ? Object.fromEntries(entry.responses) : {},
                price: event.price,
                qrBase64
            }),
            qrBase64
        });

        res.json({ message: 'Order approved. Ticket sent to participant.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reject a merchandise payment order
// @route   PUT /api/events/:id/orders/:orderId/reject
// @access  Private (Organizer)
const rejectPayment = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const entry = event.participants.id(req.params.orderId);
        if (!entry) return res.status(404).json({ message: 'Order not found' });

        entry.paymentStatus = 'Rejected';
        entry.paymentNote = req.body.note || '';
        await event.save();

        res.json({ message: 'Order rejected.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mark attendance for a participant (via QR scan or manual)
// @route   PUT /api/events/:id/participants/:participantId/attendance
// @access  Private (Organizer)
const markAttendance = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const entry = event.participants.id(req.params.participantId);
        if (!entry) return res.status(404).json({ message: 'Participant not found' });

        entry.attendanceMarked = true;
        entry.attendanceAt = new Date();
        await event.save();

        res.json({ message: 'Attendance marked', attendanceAt: entry.attendanceAt });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Unmark attendance for a participant (manual override)
// @route   DELETE /api/events/:id/participants/:participantId/attendance
// @access  Private (Organizer)
const unmarkAttendance = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const entry = event.participants.id(req.params.participantId);
        if (!entry) return res.status(404).json({ message: 'Participant not found' });

        entry.attendanceMarked = false;
        entry.attendanceAt = null;
        await event.save();

        res.json({ message: 'Attendance unmarked' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    registerForEvent,
    getRegisteredEvents,
    getEventParticipants,
    getPaymentOrders,
    approvePayment,
    rejectPayment,
    markAttendance,
    unmarkAttendance
};
