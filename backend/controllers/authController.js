const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


//@desc Register a new user
//@route POST /api/auth/register
//@access Public
const registerUser = async (req, res) => {
    try{
        const {firstName, lastName, email, password, role, organizerName, category, description } = req.body;

        const userExists = await User.findOne({email});
        if(userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = {
            email,
            password: hashedPassword,
            role: role || 'participant'
        };

        if(userData.role === 'participant') {
            userData.firstName = firstName;
            userData.lastName = lastName;
        }
        else if(userData.role === 'organizer') {
            userData.organizerName = organizerName;
            userData.category = category;
            userData.description = description; 
        }

        const user = await User.create(userData);

        if(user)
        {
            res.status(201).json({
                _id: user.id,
                email: user.email,
                role: user.role,
                message: "User Registered Successfully  "
            });
        }
        else
        {
            res.status(400).json({ message: 'Invalid user data'});
        }
    } catch(error){
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message});
    }
};


// @desc Login user and get token
// @route POST /api/auth/login
// @access Public
const loginUser = async(req,res) => {
    try{
        const { email, password } = req.body;

        const user = await User.findOne({ email }); // check if user exists

        if(user && (await bcrypt.compare(password,user.password))){

            const token = jwt.sign(
                {
                    id: user._id, role: user.role
                },
                process.env.JWT_SECRET || 'fallback_secret',
                { expiresIn: '30d' }
            )

            res.json({
                _id: user.id,
                firstName: user.firstName,
                email: user.email,
                role: user.role,
                token: token
            });
        }
        else{
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch(error){
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports = { registerUser, loginUser};