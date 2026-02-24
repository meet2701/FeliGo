const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Event = require('./models/Event');
const Message = require('./models/Message');
const Notification = require('./models/Notification');

const app = express();
const server = http.createServer(app);

// Allow localhost in dev and the deployed Vercel frontend in production
const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL 
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            cb(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' })); 

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', require('./routes/eventRoutes'));

// ---- Forum REST endpoints ----
// GET messages for an event (REST fallback / initial load)
app.get('/api/forum/:eventId', async (req, res) => {
    try {
        const messages = await Message.find({
            event: req.params.eventId,
            isDeleted: false,
            parentMessage: null
        })
            .populate('sender', 'firstName organizerName role')
            .sort({ isPinned: -1, createdAt: 1 })
            .lean();

        const withReplies = await Promise.all(messages.map(async (msg) => {
            const replies = await Message.find({ parentMessage: msg._id, isDeleted: false })
                .populate('sender', 'firstName organizerName role')
                .sort({ createdAt: 1 })
                .lean();
            return { ...msg, replies };
        }));

        res.json(withReplies);
    } catch (e) {
        res.status(500).json({ message: 'Server Error' });
    }
});

app.get('/', (req, res) => {
    res.send('FeliGo backend running');
});

// ---- Notifications REST endpoints ----
const { protect } = require('./middleware/authMiddleware');

// GET notifications for logged-in user
app.get('/api/notifications', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        res.json(notifications);
    } catch (e) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT mark all as read
app.put('/api/notifications/read', protect, async (req, res) => {
    try {
        const filter = { user: req.user.id, isRead: false };
        if (req.body.eventId) filter.event = req.body.eventId;
        await Notification.updateMany(filter, { isRead: true });
        res.json({ message: 'Notifications marked as read' });
    } catch (e) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// ---- Socket.io Forum ----
// Track connected users per event room: { eventId: Set<userId> }
const roomUsers = {};
// Track socket per user for direct live notifications: { userId: socketId }
const userSockets = {};

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('No token'));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return next(new Error('User not found'));
        socket.user = user;
        next();
    } catch {
        next(new Error('Auth failed'));
    }
});

io.on('connection', (socket) => {
    // Tracking ALL sockets for a user 
    const uid = socket.user._id.toString();
    if (!userSockets[uid]) userSockets[uid] = new Set();
    userSockets[uid].add(socket.id);

    socket.on('join_forum', async ({ eventId }) => {
        try {
            const event = await Event.findById(eventId);
            if (!event) return;
            const isOrganizer = event.organizer.toString() === socket.user._id.toString();
            const isRegistered = event.participants.some(
                p => p.user.toString() === socket.user._id.toString() && p.paymentStatus !== 'Rejected'
            );
            if (!isOrganizer && !isRegistered) {
                socket.emit('error', { message: 'Not authorized to join this forum' });
                return;
            }
            socket.join(eventId);
            if (!roomUsers[eventId]) roomUsers[eventId] = new Set();
            roomUsers[eventId].add(socket.user._id.toString());
            socket.currentEventId = eventId;
            socket.emit('joined', { eventId });
        } catch (e) {
            socket.emit('error', { message: 'Join failed' });
        }
    });

    // Post a message
    socket.on('send_message', async ({ eventId, text, parentMessageId }) => {
        try {
            const event = await Event.findById(eventId);
            if (!event) return;
            const isOrganizer = event.organizer.toString() === socket.user._id.toString();
            const isRegistered = event.participants.some(
                p => p.user.toString() === socket.user._id.toString() && p.paymentStatus !== 'Rejected'
            );
            if (!isOrganizer && !isRegistered) return;

            const senderName = socket.user.role === 'organizer'
                ? socket.user.organizerName
                : `${socket.user.firstName || ''} ${socket.user.lastName || ''}`.trim();

            const msg = await Message.create({
                event: eventId,
                sender: socket.user._id,
                senderName,
                senderRole: socket.user.role,
                text: text.slice(0, 2000),
                isAnnouncement: isOrganizer && !parentMessageId,
                parentMessage: parentMessageId || null
            });

            const populated = await msg.populate('sender', 'firstName organizerName role');
            io.to(eventId).emit('new_message', { ...populated.toObject(), replies: [] });

            const onlineUsers = roomUsers[eventId] || new Set();
            const senderId = socket.user._id.toString();
            let usersToNotify = [];

            if (isOrganizer && !parentMessageId) {
                usersToNotify = event.participants
                    .filter(p => p.paymentStatus !== 'Rejected')
                    .map(p => p.user.toString())
                    .filter(uid => uid !== senderId);
            } else if (parentMessageId) {
                // Notify parent author + everyone who has replied to this thread
                const threadMessages = await Message.find({
                    $or: [{ _id: parentMessageId }, { parentMessage: parentMessageId }]
                }).select('sender');
                const threadParticipants = [...new Set(threadMessages.map(m => m.sender.toString()))];
                usersToNotify = threadParticipants.filter(uid => uid !== senderId);
            }

            const notifPayload = {
                eventId,
                eventName: event.name,
                senderName,
                text: text.slice(0, 200),
                isReply: !!parentMessageId
            };

            // save to DB for Notifications tab
            if (usersToNotify.length > 0) {
                const notifDocs = usersToNotify.map(uid => ({
                    user: uid,
                    event: eventId,
                    message: msg._id,
                    text: text.slice(0, 200),
                    senderName,
                    eventName: event.name
                }));
                Notification.insertMany(notifDocs).catch(err => console.error('Notification save error:', err.message));
            }
            // live popup to all online sockets for each user
            for (const uid of usersToNotify) {
                const socketIds = userSockets[uid];
                if (socketIds) {
                    for (const sid of socketIds) {
                        io.to(sid).emit('live_notification', notifPayload);
                    }
                }
            }
        } catch (e) {
            socket.emit('error', { message: 'Send failed' });
        }
    });

    // React to a message
    socket.on('react', async ({ messageId, emoji }) => {
        try {
            const msg = await Message.findById(messageId);
            if (!msg || msg.isDeleted) return;
            const uid = socket.user._id.toString();
            const current = msg.reactions.get(emoji) || [];
            const alreadyReacted = current.includes(uid);
            if (alreadyReacted) {
                msg.reactions.set(emoji, current.filter(id => id !== uid));
            } else {
                msg.reactions.set(emoji, [...current, uid]);
            }
            await msg.save();
            io.to(msg.event.toString()).emit('reaction_update', {
                messageId,
                reactions: Object.fromEntries(msg.reactions)
            });

            const authorId = msg.sender.toString();
            if (!alreadyReacted && authorId !== uid) {
                const onlineUsers = roomUsers[msg.event.toString()] || new Set();
                if (!onlineUsers.has(authorId)) {
                    const event = await Event.findById(msg.event).select('name');
                    const senderName = socket.user.role === 'organizer'
                        ? socket.user.organizerName
                        : `${socket.user.firstName || ''} ${socket.user.lastName || ''}`.trim();
                    Notification.create({
                        user: authorId,
                        event: msg.event,
                        message: messageId,
                        text: `${emoji} reacted to your message: "${msg.text.slice(0, 80)}"`,
                        senderName,
                        eventName: event?.name || ''
                    }).catch(err => console.error('Reaction notification error:', err.message));
                }
            }
        } catch (e) {
            socket.emit('error', { message: 'React failed' });
        }
    });

    // Organizer: delete message
    socket.on('delete_message', async ({ messageId, eventId }) => {
        try {
            const event = await Event.findById(eventId);
            if (!event) return;
            if (event.organizer.toString() !== socket.user._id.toString()) return;
            await Message.findByIdAndUpdate(messageId, { isDeleted: true });
            io.to(eventId).emit('message_deleted', { messageId });
        } catch (e) {
            socket.emit('error', { message: 'Delete failed' });
        }
    });

    // Organizer: pin/unpin message
    socket.on('pin_message', async ({ messageId, eventId }) => {
        try {
            const event = await Event.findById(eventId);
            if (!event) return;
            if (event.organizer.toString() !== socket.user._id.toString()) return;
            const msg = await Message.findById(messageId);
            if (!msg) return;
            msg.isPinned = !msg.isPinned;
            await msg.save();
            io.to(eventId).emit('message_pinned', { messageId, isPinned: msg.isPinned });
        } catch (e) {
            socket.emit('error', { message: 'Pin failed' });
        }
    });

    socket.on('disconnect', () => {
        if (socket.currentEventId && roomUsers[socket.currentEventId]) {
            roomUsers[socket.currentEventId].delete(socket.user._id.toString());
            if (roomUsers[socket.currentEventId].size === 0) delete roomUsers[socket.currentEventId];
        }
        const uid = socket.user._id.toString();
        if (userSockets[uid]) {
            userSockets[uid].delete(socket.id);
            if (userSockets[uid].size === 0) delete userSockets[uid];
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
});
