const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mernchat', {
            // Mongoose 7+ doesn't need these options, but keeping for clarity
        });
        console.log(`  ✅ MongoDB connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`  ❌ MongoDB connection error: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
