const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// IMPORTANT: Webhook Route MUST be before body parsers
// ============================================
// Paystack webhook endpoint (needs raw body for signature verification)
app.post('/api/payments/webhook', 
    express.raw({ type: 'application/json' }), 
    async (req, res) => {
        try {
            const { webhook } = require('./controllers/payment.controller');
            await webhook(req, res);
        } catch (error) {
            console.error('Webhook route error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-paystack-signature']
}));

// ============================================
// BODY PARSERS (after webhook route)
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// STATIC FILES
// ============================================
// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve CSS, JS, and other static files
app.use('/css', express.static(path.join(__dirname, '../client/css')));
app.use('/js', express.static(path.join(__dirname, '../client/js')));
app.use('/images', express.static(path.join(__dirname, '../client/images')));

// Create upload directories
const fs = require('fs');
const uploadDirs = [
    'uploads/contestants', 
    'uploads/events', 
    'uploads/profiles',
    'uploads/nominations'  // Added for nomination photos
];
uploadDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/contestants', require('./routes/contestant.routes'));
app.use('/api/events', require('./routes/event.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/nominations', require('./routes/nomination.routes'));
app.use('/api/votes', require('./routes/vote.routes'));
app.use('/api/results', require('./routes/results.routes'));
app.use('/api/payments', require('./routes/payment.routes'));

// ============================================
// ADDITIONAL HELPER ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'TekVotes API is running',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            contestants: '/api/contestants',
            events: '/api/events',
            categories: '/api/categories',
            nominations: '/api/nominations',
            votes: '/api/votes',
            results: '/api/results',
            payments: '/api/payments'
        },
        id_format: 'Contestant IDs: {3 letters from event name}{2 random digits} (e.g., FOS24, MIS12, MRT34)'
    });
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
    try {
        const pool = require('./config/database');
        const [rows] = await pool.query('SELECT 1 as connected');
        res.json({ success: true, message: 'Database connected successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// SERVE HTML FILES
// ============================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../client/index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, '../client/index.html')));
app.get('/contestants.html', (req, res) => res.sendFile(path.join(__dirname, '../client/contestants.html')));
app.get('/events.html', (req, res) => res.sendFile(path.join(__dirname, '../client/events.html')));
app.get('/profile.html', (req, res) => res.sendFile(path.join(__dirname, '../client/profile.html')));
app.get('/vote.html', (req, res) => res.sendFile(path.join(__dirname, '../client/vote.html')));
app.get('/results.html', (req, res) => res.sendFile(path.join(__dirname, '../client/results.html')));
app.get('/nominate.html', (req, res) => res.sendFile(path.join(__dirname, '../client/nominate.html')));
app.get('/success.html', (req, res) => res.sendFile(path.join(__dirname, '../client/success.html')));
app.get('/admin-login.html', (req, res) => res.sendFile(path.join(__dirname, '../client/admin-login.html')));
app.get('/admin-dashboard.html', (req, res) => res.sendFile(path.join(__dirname, '../client/admin-dashboard.html')));

// Catch-all for other HTML requests
app.get('*.html', (req, res) => {
    const fileName = req.path.substring(1);
    const filePath = path.join(__dirname, '../client', fileName);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).sendFile(path.join(__dirname, '../client/index.html'));
    }
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ 
            success: false, 
            message: 'API endpoint not found',
            requestedEndpoint: req.path,
            availableEndpoints: [
                '/api/auth/login',
                '/api/contestants',
                '/api/events',
                '/api/categories',
                '/api/nominations',
                '/api/votes',
                '/api/results',
                '/api/payments/initialize',
                '/api/health'
            ]
        });
    }
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Global error:', err.message);
    console.error('Stack:', err.stack);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
            success: false, 
            message: 'File size too large. Max 5MB allowed.' 
        });
    }
    
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// ============================================
// START SERVER WITH PORT FALLBACK
// ============================================
const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                         TekVotes Server                               ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Status:     ✅ Running                                              ║
║  Port:       ${port}                                                     ║
║  Mode:       ${process.env.NODE_ENV || 'development'}                                   ║
║  URL:        http://localhost:${port}                                   ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Contestant ID Format: {3 letters from event name}{2 random digits}   ║
║  Examples:    FOS24, MIS12, MRT34, TEE56                              ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Upload Directories:                                                 ║
║  - /uploads/contestants                                              ║
║  - /uploads/events                                                   ║
║  - /uploads/profiles                                                 ║
║  - /uploads/nominations                                              ║
╠═══════════════════════════════════════════════════════════════════════╣
║  API Endpoints:                                                       ║
║  - POST   /api/auth/login                                             ║
║  - GET    /api/contestants                                            ║
║  - GET    /api/events                                                 ║
║  - GET    /api/categories                                             ║
║  - POST   /api/nominations (with photo upload)                        ║
║  - GET    /api/results                                                ║
║  - POST   /api/payments/initialize                                    ║
║  - GET    /api/health                                                 ║
╚═══════════════════════════════════════════════════════════════════════╝
        `);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${port} is busy, trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });
};

startServer(PORT);

module.exports = app;