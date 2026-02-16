const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const adminEmail = "admin@felicity.iiit.ac.in";
        const existingAdmin = await User.findOne({ email : adminEmail});

        if(existingAdmin) {
            console.log('Admin already exists');
            process.exit();
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("admin123", salt);

        await User.create({
            firstName: "Super",
            lastName: "Admin",
            email: adminEmail,
            password: hashedPassword,
            role: "admin"
        });

        console.log('Admin Account Created!');
        process.exit();
    } catch(error) {
        console.error(error);
        process.exit(1);
    }
};

seedAdmin();