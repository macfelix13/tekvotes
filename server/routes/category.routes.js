const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');

// GET all categories
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, e.event_name 
            FROM categories c
            JOIN events e ON c.event_id = e.id
            ORDER BY e.event_name, c.sort_order
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET categories by event
router.get('/event/:eventId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM categories WHERE event_id = ? ORDER BY sort_order',
            [req.params.eventId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create category
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { event_id, category_name, category_description, sort_order, is_active } = req.body;
        const unique_id = `CAT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        
        const [result] = await pool.query(
            `INSERT INTO categories (category_unique_id, event_id, category_name, category_description, sort_order, is_active) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [unique_id, event_id, category_name, category_description, sort_order || 0, is_active !== undefined ? is_active : 1]
        );
        
        const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
        res.json({ success: true, data: rows[0], message: 'Category created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update category
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { category_name, category_description, sort_order, is_active } = req.body;
        
        await pool.query(
            `UPDATE categories SET category_name = ?, category_description = ?, sort_order = ?, is_active = ? WHERE id = ?`,
            [category_name, category_description, sort_order, is_active, id]
        );
        
        const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
        res.json({ success: true, data: rows[0], message: 'Category updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE category
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;