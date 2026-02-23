const express = require('express');
const router = express.Router();
const { createOrganizer, getOrganizers, toggleDisableOrganizer, deleteOrganizer } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');

router.post('/create-organizer', protect, admin, createOrganizer);
router.get('/organizers', protect, admin, getOrganizers);
router.put('/organizers/:id/disable', protect, admin, toggleDisableOrganizer);
router.delete('/organizers/:id', protect, admin, deleteOrganizer);

// Admin: get all password reset requests
router.get('/password-reset-requests', protect, admin, async (req, res) => {
    try {
        const requests = await PasswordResetRequest.find()
            .populate('organizer', 'organizerName email category')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Admin: approve a reset request — auto-generates new password
router.put('/password-reset-requests/:id/approve', protect, admin, async (req, res) => {
    try {
        const request = await PasswordResetRequest.findById(req.params.id).populate('organizer');
        if (!request) return res.status(404).json({ message: 'Request not found' });
        if (request.status !== 'Pending') return res.status(400).json({ message: 'Request already processed' });

        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
        let newPassword = '';
        for (let i = 0; i < 10; i++) newPassword += chars[Math.floor(Math.random() * chars.length)];

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        await User.findByIdAndUpdate(request.organizer._id, { password: hashed });

        request.status = 'Approved';
        request.adminNote = req.body.note || '';
        request.newPassword = newPassword;
        await request.save();

        res.json({ message: 'Password reset approved', newPassword, organizerEmail: request.organizer.email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Admin: reject a reset request
router.put('/password-reset-requests/:id/reject', protect, admin, async (req, res) => {
    try {
        const request = await PasswordResetRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });
        if (request.status !== 'Pending') return res.status(400).json({ message: 'Request already processed' });

        request.status = 'Rejected';
        request.adminNote = req.body.adminNote || '';
        await request.save();

        res.json({ message: 'Request rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;