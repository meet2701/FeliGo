const express = require('express');
const router = express.Router();
const { createOrganizer } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/create-organizer', protect, admin, createOrganizer);

module.exports = router;