const User = require('../models/User');
const Event = require('../models/Event');
const bcrypt = require('bcryptjs');

// @desc    Create a new Organizer(admin only)
// @route   POST /api/admin/create-organizer
// @acccess Private (Admin)

const createOrganizer = async (req,res) => {
    try{
        const { organizerName, category, email, description, contactNumber, website } = req.body;

        const userExists = await User.findOne({ email });
        if(userExists)
        {
            return res.status(400).json({ message : 'User/Organizer with this email already exists'});
        }

        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
        const autoPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(autoPassword, salt);

        const organizer = await User.create({
            role: 'organizer',
            organizerName,
            category,
            email,
            password: hashedPassword,
            description,
            contactNumber,
            website
        });

        if(organizer)
        {
            res.status(201).json({
                message: "Organizer created successfully",
                organizer: {
                    id: organizer._id,
                    name: organizer.organizerName,
                    email: organizer.email,
                    password: autoPassword
                }
            });
        }
        else
        {
            res.status(400).json({ message: 'Invalid Organizer Data'});
        }
    } catch(error){
        console.error(error);
        res.status(500).json({ message: 'Server Error'});
    }
};

// @desc    Get all organizers with status
// @route   GET /api/admin/organizers
// @access  Private (Admin)
const getOrganizers = async (req, res) => {
    try {
        const organizers = await User.find({ role: 'organizer' })
            .select('organizerName email category description website isDisabled createdAt');
        res.json(organizers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Toggle disable/enable an organizer
// @route   PUT /api/admin/organizers/:id/disable
// @access  Private (Admin)
const toggleDisableOrganizer = async (req, res) => {
    try {
        const organizer = await User.findOne({ _id: req.params.id, role: 'organizer' });
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

        organizer.isDisabled = !organizer.isDisabled;
        await organizer.save();

        res.json({
            message: organizer.isDisabled ? 'Organizer disabled' : 'Organizer re-enabled',
            isDisabled: organizer.isDisabled
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Permanently delete an organizer
// @route   DELETE /api/admin/organizers/:id
// @access  Private (Admin)
const deleteOrganizer = async (req, res) => {
    try {
        const organizer = await User.findOne({ _id: req.params.id, role: 'organizer' });
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

        await organizer.deleteOne();
        // Cascade delete all events by this organizer (per spec)
        await Event.deleteMany({ organizer: req.params.id });
        res.json({ message: 'Organizer and all associated events permanently deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { createOrganizer, getOrganizers, toggleDisableOrganizer, deleteOrganizer };