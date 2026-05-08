const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/events');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `event-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET all events
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM events ORDER BY created_at DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET single event
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create event
router.post('/', authMiddleware, upload.single('event_image'), async (req, res) => {
    try {
        const { event_name, description, start_date, end_date, vote_price, currency, is_active } = req.body;
        const unique_id = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const event_image = req.file ? `/uploads/events/${req.file.filename}` : null;
        
        const [result] = await pool.query(
            `INSERT INTO events (event_unique_id, event_name, description, event_image, start_date, end_date, vote_price, currency, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [unique_id, event_name, description, event_image, start_date, end_date, vote_price || 1.00, currency || 'GHS', is_active !== undefined ? is_active : 1]
        );
        
        const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
        res.json({ success: true, data: rows[0], message: 'Event created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update event
router.put('/:id', authMiddleware, upload.single('event_image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { event_name, description, start_date, end_date, vote_price, currency, is_active } = req.body;
        
        let event_image = null;
        if (req.file) {
            event_image = `/uploads/events/${req.file.filename}`;
        } else {
            const [existing] = await pool.query('SELECT event_image FROM events WHERE id = ?', [id]);
            event_image = existing[0]?.event_image;
        }
        
        await pool.query(
            `UPDATE events SET event_name = ?, description = ?, event_image = ?, start_date = ?, end_date = ?, vote_price = ?, currency = ?, is_active = ? WHERE id = ?`,
            [event_name, description, event_image, start_date, end_date, vote_price, currency, is_active, id]
        );
        
        const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
        res.json({ success: true, data: rows[0], message: 'Event updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE event
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;