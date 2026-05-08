/**
 * File Upload Middleware
 * Handles image uploads for contestants, events, and profiles
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['contestants', 'events', 'profiles'];
uploadDirs.forEach(dir => {
    const uploadDir = path.join(__dirname, '../uploads', dir);
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
});

// Configure storage for contestant images
const contestantStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/contestants'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `contestant-${uniqueSuffix}${ext}`);
    }
});

// Configure storage for event images
const eventStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/events'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `event-${uniqueSuffix}${ext}`);
    }
});

// Configure storage for profile images
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/profiles'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `profile-${uniqueSuffix}${ext}`);
    }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
};

// Create multer instances
const uploadContestant = multer({
    storage: contestantStorage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

const uploadEvent = multer({
    storage: eventStorage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

const uploadProfile = multer({
    storage: profileStorage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

// Multiple file upload for events (event_image + hero_image)
const uploadEventImages = multer({
    storage: eventStorage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
    fileFilter: fileFilter
}).fields([
    { name: 'event_image', maxCount: 1 },
    { name: 'hero_image', maxCount: 1 }
]);

module.exports = { 
    uploadContestant, 
    uploadEvent, 
    uploadProfile,
    uploadEventImages
};