const express = require('express');
const router = express.Router();

const { registerUser, loginUser } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.post('/register', registerUser);

router.get('/me', protect, async(req,res) => {
    res.json({ message: "You are authorized!", user: req.user});
});

module.exports = router;