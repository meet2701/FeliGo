const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


//@desc Register a new user
//@route POST /api/auth/register
//@access Public
const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, participantType } = req.body;

        const role = 'participant';
        if (role === 'participant' && !['IIIT', 'Non-IIIT'].includes(participantType)) {
            return res.status(400).json({ message: 'Invalid Participant Type' });
        }

        if (participantType === 'IIIT') {
            const iiitEmailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?iiit\.ac\.in$/;
            if (!iiitEmailRegex.test(email)) {
                return res.status(400).json({ message: 'Invalid IIIT Email ID. Must end with .iiit.ac.in' });
            }
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role,
            participantType
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                email: user.email,
                role: user.role,
                message: "User Registered Successfully  "
            });
        }
        else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc Login user and get token
// @route POST /api/auth/login
// @access Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }); // check if user exists

        if (user && (await bcrypt.compare(password, user.password))) {

            if (user.isDisabled) {
                return res.status(403).json({ message: 'This account has been disabled. Contact admin.' });
            }

            const token = jwt.sign(
                {
                    id: user._id, role: user.role
                },
                process.env.JWT_SECRET || 'fallback_secret',
                { expiresIn: '30d' }
            )

            res.json({
                _id: user.id,
                name: user.role == 'organizer' ? user.organizerName : user.firstName,
                email: user.email,
                role: user.role,
                participantType: user.participantType || null,
                hasCompletedOnboarding: user.hasCompletedOnboarding,
                interests: user.interests || [],
                followedClubs: user.followedClubs || [],
                token: token
            });
        }
        else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all organizers (for following)
// @route   GET /api/auth/organizers
// @access  Public
const getAllOrganizers = async (req, res) => {
    try {
        const organizers = await User.find({ role: 'organizer', isDisabled: { $ne: true } })
            .select('organizerName category description website email contactEmail _id');
        res.json(organizers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get single organizer by ID
// @route   GET /api/auth/organizers/:id
// @access  Public
const getOrganizerById = async (req, res) => {
    try {
        const organizer = await User.findOne({ _id: req.params.id, role: 'organizer' })
            .select('organizerName category description website email contactEmail _id');
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }
        res.json(organizer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {

            if (req.body.newPassword) {
                if (user.role === 'organizer') {
                    return res.status(403).json({ message: 'Organizers cannot change passwords directly. Submit a reset request to the admin.' });
                }
                if (!req.body.currentPassword) {
                    return res.status(400).json({ message: 'Please provide current password to set a new one.' });
                }
                const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
                if (!isMatch) {
                    return res.status(400).json({ message: 'Current password is incorrect.' });
                }
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(req.body.newPassword, salt);
            }


            user.contactNumber = req.body.contactNumber || user.contactNumber;

            if (user.role === 'participant') {
                user.firstName = req.body.firstName || user.firstName;
                user.lastName = req.body.lastName || user.lastName;
                user.college = req.body.college || user.college;
            
                if (req.body.interests) {
                    user.interests = Array.isArray(req.body.interests) 
                        ? req.body.interests 
                        : req.body.interests.split(',').map(i => i.trim());
                }
                if (req.body.followedClubs) {
                    user.followedClubs = req.body.followedClubs;
                }
                if (req.body.hasCompletedOnboarding) {
                    user.hasCompletedOnboarding = true;
                }
            } 
            else if (user.role === 'organizer') {
                user.organizerName = req.body.organizerName || user.organizerName;
                user.description = req.body.description || user.description;
                user.website = req.body.website || user.website;
                user.category = req.body.category || user.category;
                if (req.body.contactEmail !== undefined) {
                    user.contactEmail = req.body.contactEmail;
                }
                if (req.body.discordWebhook !== undefined) {
                    user.discordWebhook = req.body.discordWebhook;
                }
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.role === 'organizer' ? updatedUser.organizerName : updatedUser.firstName,
                email: updatedUser.email,
                role: updatedUser.role,
                hasCompletedOnboarding: updatedUser.hasCompletedOnboarding,
                interests: updatedUser.interests || [],
                followedClubs: updatedUser.followedClubs || [],
                token: req.headers.authorization.split(' ')[1]
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


module.exports = { registerUser, loginUser, updateProfile, getAllOrganizers, getOrganizerById };