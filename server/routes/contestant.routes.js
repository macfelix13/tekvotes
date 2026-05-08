const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/contestants');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `contestant-${uniqueSuffix}${path.extname(file.originalname)}`);
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

// GET all contestants
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, e.event_name, cat.category_name 
            FROM contestants c
            LEFT JOIN events e ON c.event_id = e.id
            LEFT JOIN categories cat ON c.category_id = cat.id
            ORDER BY c.votes DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching contestants:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET single contestant
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM contestants WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Contestant not found' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error fetching contestant:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create contestant
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { full_name, biography, category_id, event_id, instagram, tiktok, facebook, is_active } = req.body;
        
        // Generate unique ID
        const unique_id = `CT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const image = req.file ? `/uploads/contestants/${req.file.filename}` : null;
        
        const [result] = await pool.query(
            `INSERT INTO contestants (contestant_unique_id, full_name, image, biography, category_id, event_id, instagram, tiktok, facebook, is_active, votes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [unique_id, full_name, image, biography, category_id || null, event_id || null, instagram || null, tiktok || null, facebook || null, is_active || 1]
        );
        
        const [rows] = await pool.query('SELECT * FROM contestants WHERE id = ?', [result.insertId]);
        res.json({ success: true, data: rows[0], message: 'Contestant created successfully' });
    } catch (error) {
        console.error('Create error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update contestant
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, biography, category_id, event_id, instagram, tiktok, facebook, is_active } = req.body;
        
        let image = null;
        if (req.file) {
            image = `/uploads/contestants/${req.file.filename}`;
            const [old] = await pool.query('SELECT image FROM contestants WHERE id = ?', [id]);
            if (old[0]?.image) {
                const oldPath = path.join(__dirname, '..', old[0].image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        } else {
            const [existing] = await pool.query('SELECT image FROM contestants WHERE id = ?', [id]);
            image = existing[0]?.image;
        }
        
        await pool.query(
            `UPDATE contestants SET full_name = ?, image = ?, biography = ?, category_id = ?, event_id = ?, instagram = ?, tiktok = ?, facebook = ?, is_active = ? WHERE id = ?`,
            [full_name, image, biography, category_id || null, event_id || null, instagram || null, tiktok || null, facebook || null, is_active !== undefined ? is_active : 1, id]
        );
        
        const [rows] = await pool.query('SELECT * FROM contestants WHERE id = ?', [id]);
        res.json({ success: true, data: rows[0], message: 'Contestant updated successfully' });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE contestant
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [old] = await pool.query('SELECT image FROM contestants WHERE id = ?', [id]);
        if (old[0]?.image) {
            const oldPath = path.join(__dirname, '..', old[0].image);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        
        await pool.query('DELETE FROM contestants WHERE id = ?', [id]);
        res.json({ success: true, message: 'Contestant deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;