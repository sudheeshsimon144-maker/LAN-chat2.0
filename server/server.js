const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
const setupSocket = require('./socket/handler');

// Route imports
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const roomRoutes = require('./routes/rooms');
const uploadRoutes = require('./routes/upload');

// Models for seeding
const Room = require('./models/Room');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    },
    maxHttpBufferSize: 100 * 1024 * 1024,
});

// Middleware
app.use(cors({
    origin: true, // Allow any origin dynamically (localhost, LAN IP, etc.)
    credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Seed default rooms
async function seedDefaultRooms() {
    const defaults = [
        { name: 'General', description: 'General discussion for everyone', icon: '💬', type: 'public' },
        { name: 'Random', description: 'Off-topic fun and memes', icon: '🎲', type: 'public' },
        { name: 'Tech Talk', description: 'Technology and programming', icon: '💻', type: 'public' },
        { name: 'Music', description: 'Share and discuss music', icon: '🎵', type: 'public' },
        { name: 'Gaming', description: 'Game discussions and LFG', icon: '🎮', type: 'public' },
    ];

    for (const room of defaults) {
        const existing = await Room.findOne({ name: room.name });
        if (!existing) {
            // Create a system/admin user if not exists for room creation
            let admin = await User.findOne({ username: 'system' });
            if (!admin) {
                admin = new User({
                    username: 'system',
                    email: 'system@mernchat.local',
                    password: 'system-no-login-password123!',
                });
                await admin.save();
            }

            await Room.create({
                ...room,
                creator: admin._id,
                members: [admin._id],
            });
            console.log(`  📁 Created room: ${room.icon} ${room.name}`);
        }
    }
}

// Get LAN IP
function getLanIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Start server
const PORT = process.env.PORT || 5000;

async function start() {
    // Connect to MongoDB
    await connectDB();

    // Seed default rooms
    await seedDefaultRooms();

    // Setup Socket.IO
    setupSocket(io);

    server.listen(PORT, '0.0.0.0', () => {
        const lanIP = getLanIP();
        console.log('');
        console.log('  ╔═══════════════════════════════════════════════╗');
        console.log('  ║       LAN Chat Server Running  🚀           ║');
        console.log('  ╠═══════════════════════════════════════════════╣');
        console.log(`  ║  API:     http://localhost:${PORT}               ║`);
        console.log(`  ║  LAN:     http://${lanIP}:${PORT}          ║`);
        console.log(`  ║  Client:  http://localhost:5173               ║`);
        console.log('  ╚═══════════════════════════════════════════════╝');
        console.log('');
    });
}

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
