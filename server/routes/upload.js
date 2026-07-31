const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Upload file
router.post('/', auth, (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err.message);
            return res.status(413).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        res.json({
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            url: `/uploads/${req.file.filename}`,
        });
    });
});

module.exports = router;
