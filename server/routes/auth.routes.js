const express = require('express');
const router = express.Router();
const { login, verifyToken } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Public routes
router.post('/login', login);

// Protected routes
router.get('/verify', authMiddleware, verifyToken);

module.exports = router;