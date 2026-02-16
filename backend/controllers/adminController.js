const User = require('../models/User');
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

        const autoPassword = "Password@123";

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

module.exports = { createOrganizer };