const express = require('express');
const router = express.Router();
const {
    initializePayment,
    verifyPayment,
    getAllTransactions,
    getDashboardStats,
    webhook
} = require('../controllers/payment.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Webhook (must be raw body parser)
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

// Public routes
router.post('/initialize', express.json(), initializePayment);
router.get('/verify/:reference', verifyPayment);

// Admin routes
router.get('/transactions', authMiddleware, getAllTransactions);
router.get('/dashboard', authMiddleware, getDashboardStats);

module.exports = router;