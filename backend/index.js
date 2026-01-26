const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // allows frontend to communicate with backend
app.use(express.json()); // to parse JSON bodies

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('Hello from the Felicity backend team!');
});

app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
});