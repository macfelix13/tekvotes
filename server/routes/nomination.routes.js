const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendNominationEmail } = require('../config/email');
const { sendWhatsAppMessage } = require('../config/whatsapp');

// Ensure upload directory exists for nomination photos
const uploadDir = path.join(__dirname, '../uploads/nominations');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure multer for photo upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `nomination-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files allowed'));
        }
    }
});

// Generate unique ID function
function generateUniqueId(prefix) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// ============================================
// PUBLIC ROUTES
// ============================================

// Submit nomination with photo upload
router.post('/', upload.single('photo'), async (req, res) => {
    try {
        const { 
            contestant_name, 
            contestant_phone, 
            contestant_email,
            event_id, 
            category_id, 
            nominator_name, 
            nominator_email, 
            nominator_phone, 
            reason 
        } = req.body;
        
        const photo = req.file ? `/uploads/nominations/${req.file.filename}` : null;
        
        console.log('📝 Nomination received:', { contestant_name, event_id, category_id });
        
        // Validate required fields
        if (!contestant_name || !event_id || !category_id || !nominator_name || !nominator_email || !reason) {
            return res.status(400).json({ 
                success: false, 
                message: 'All required fields must be filled' 
            });
        }
        
        // Check if event exists
        const [eventCheck] = await pool.query('SELECT id, event_name FROM events WHERE id = ?', [event_id]);
        if (eventCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Selected event does not exist' });
        }
        
        // Check if category exists for this event
        const [categoryCheck] = await pool.query('SELECT id, category_name FROM categories WHERE id = ? AND event_id = ?', [category_id, event_id]);
        if (categoryCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Selected category does not exist for this event' });
        }
        
        // Generate unique ID for nomination
        const nomination_unique_id = generateUniqueId('NOM');
        
        // Insert nomination into database (using correct column names)
        const [result] = await pool.query(
            `INSERT INTO nominations (
                nomination_unique_id, 
                contestant_name, 
                contestant_phone, 
                contestant_email,
                event_id, 
                category_id, 
                nominator_name, 
                nominator_email, 
                nominator_phone, 
                reason, 
                photo_url, 
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                nomination_unique_id, 
                contestant_name, 
                contestant_phone || null, 
                contestant_email || null,
                event_id, 
                category_id, 
                nominator_name, 
                nominator_email, 
                nominator_phone || null, 
                reason, 
                photo || null
            ]
        );
        
        // Prepare data for notifications
        const notificationData = {
            contestant_name,
            contestant_phone: contestant_phone || 'Not provided',
            contestant_email: contestant_email || 'Not provided',
            event_name: eventCheck[0].event_name,
            category_name: categoryCheck[0].category_name,
            nominator_name,
            nominator_email,
            nominator_phone: nominator_phone || 'Not provided',
            reason,
            photo_url: photo ? `${req.protocol}://${req.get('host')}${photo}` : null
        };
        
        // Send Email Notification (if configured)
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const emailResult = await sendNominationEmail(notificationData);
            console.log('Email notification:', emailResult.success ? 'Sent' : 'Failed');
        }
        
        // Send WhatsApp Notification (if configured)
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            const whatsappResult = await sendWhatsAppMessage(notificationData);
            console.log('WhatsApp notification:', whatsappResult.success ? 'Sent' : 'Failed');
        }
        
        console.log('✅ Nomination submitted successfully, ID:', nomination_unique_id);
        
        res.json({ 
            success: true, 
            message: 'Nomination submitted successfully! We have received your nomination and will review it shortly.',
            nomination_id: nomination_unique_id
        });
    } catch (error) {
        console.error('Nomination error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// ADMIN ROUTES (Protected)
// ============================================

// Get all nominations
router.get('/all', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT n.*, e.event_name, cat.category_name
            FROM nominations n
            JOIN events e ON n.event_id = e.id
            JOIN categories cat ON n.category_id = cat.id
            ORDER BY n.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get pending nominations
router.get('/pending', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT n.*, e.event_name, cat.category_name
            FROM nominations n
            JOIN events e ON n.event_id = e.id
            JOIN categories cat ON n.category_id = cat.id
            WHERE n.status = 'pending'
            ORDER BY n.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single nomination
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT n.*, e.event_name, cat.category_name
            FROM nominations n
            JOIN events e ON n.event_id = e.id
            JOIN categories cat ON n.category_id = cat.id
            WHERE n.id = ?
        `, [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Nomination not found' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Approve nomination
router.put('/:id/approve', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [nomination] = await pool.query('SELECT * FROM nominations WHERE id = ?', [id]);
        if (nomination.length === 0) {
            return res.status(404).json({ success: false, message: 'Nomination not found' });
        }
        
        await pool.query(
            'UPDATE nominations SET status = "approved", reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
            [req.admin.id, id]
        );
        
        // Create contestant from nomination
        const contestant_unique_id = `CT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await pool.query(
            `INSERT INTO contestants (
                contestant_unique_id, 
                full_name, 
                image, 
                biography, 
                event_id, 
                category_id, 
                nomination_status, 
                is_active, 
                votes
            ) VALUES (?, ?, ?, ?, ?, ?, 'approved', 1, 0)`,
            [
                contestant_unique_id, 
                nomination[0].contestant_name, 
                nomination[0].photo_url, 
                nomination[0].reason, 
                nomination[0].event_id, 
                nomination[0].category_id
            ]
        );
        
        res.json({ success: true, message: 'Nomination approved and contestant created' });
    } catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Reject nomination
router.put('/:id/reject', authMiddleware, async (req, res) => {
    try {
        await pool.query(
            'UPDATE nominations SET status = "rejected", reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
            [req.admin.id, req.params.id]
        );
        res.json({ success: true, message: 'Nomination rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;