const express = require('express');
const router = express.Router();
const { createEvent, getEvents, getMyEvents, getEventById, updateEvent, getTrendingEvents } = require('../controllers/eventController');
const { registerForEvent, getRegisteredEvents, getEventParticipants, getPaymentOrders, approvePayment, rejectPayment, markAttendance, unmarkAttendance } = require('../controllers/registrationController');
const { protect, organizer } = require('../middleware/authMiddleware');

router.get('/', getEvents);
router.get('/myevents', protect, organizer, getMyEvents);
router.get('/my-registrations', protect, getRegisteredEvents);
router.get('/trending', getTrendingEvents);

// Specific sub-routes MUST come before /:id to avoid Express matching them as IDs
router.get('/:id/participants', protect, organizer, getEventParticipants);
router.get('/:id/orders', protect, organizer, getPaymentOrders);
router.put('/:id/orders/:orderId/approve', protect, organizer, approvePayment);
router.put('/:id/orders/:orderId/reject', protect, organizer, rejectPayment);
router.put('/:id/participants/:participantId/attendance', protect, organizer, markAttendance);
router.delete('/:id/participants/:participantId/attendance', protect, organizer, unmarkAttendance);

router.get('/:id', getEventById);

router.post('/', protect, organizer, createEvent);
router.put('/:id', protect, organizer, updateEvent);
router.post('/:id/register', protect, registerForEvent);

module.exports = router;
