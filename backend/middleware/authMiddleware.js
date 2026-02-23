const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (req.user?.isDisabled) {
                return res.status(403).json({ message: 'This account has been disabled. Contact admin.' });
            }

            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed.' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, No token.' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

const organizer = (req, res, next) => {
    if (req.user && req.user.role === 'organizer') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an an organizer' });
    }
};

module.exports = { protect, admin, organizer };