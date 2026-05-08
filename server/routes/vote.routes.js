const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/votes - Get all votes
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT v.*, c.full_name as contestant_name, e.event_name 
            FROM votes v 
            JOIN contestants c ON v.contestant_id = c.id 
            LEFT JOIN events e ON v.event_id = e.id
            ORDER BY v.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching votes:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/votes/stats - Get vote statistics
router.get('/stats', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                COUNT(*) as total_votes,
                SUM(amount_paid) as total_revenue,
                COUNT(DISTINCT voter_email) as unique_voters
            FROM votes 
            WHERE payment_status = 'success'
        `);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;