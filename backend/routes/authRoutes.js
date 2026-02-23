const express = require('express');
const router = express.Router();

const { registerUser, loginUser, updateProfile, getAllOrganizers, getOrganizerById } = require('../controllers/authController');
const { protect, admin, organizer } = require('../middleware/authMiddleware');
const PasswordResetRequest = require('../models/PasswordResetRequest');

router.post('/login', loginUser);
router.post('/register', registerUser);
router.put('/profile', protect, updateProfile);
router.get('/organizers', getAllOrganizers);
router.get('/organizers/:id', getOrganizerById);

router.get('/me', protect, async (req, res) => {
    res.json({ message: "You are authorized!", user: req.user });
});

// Organizer submits a password reset request
router.post('/password-reset-request', protect, organizer, async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ message: 'Reason is required' });
        const existing = await PasswordResetRequest.findOne({ organizer: req.user._id, status: 'Pending' });
        if (existing) return res.status(400).json({ message: 'You already have a pending reset request' });
        const request = await PasswordResetRequest.create({ organizer: req.user._id, reason });
        res.status(201).json({ message: 'Password reset request submitted', requestId: request._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Organizer views their own reset request history
router.get('/password-reset-request/mine', protect, organizer, async (req, res) => {
    try {
        const requests = await PasswordResetRequest.find({ organizer: req.user._id }).sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;