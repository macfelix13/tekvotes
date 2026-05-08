const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { generateUniqueId } = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');
const bcrypt = require('bcrypt');

// Get all admins (super admin only)
router.get('/admins', authMiddleware, async (req, res) => {
    if (req.admin.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Super admin only.' });
    }
    
    try {
        const [rows] = await pool.query(
            'SELECT id, unique_id, username, email, role, assigned_event_id, full_name, is_active, created_at FROM admins'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get admins error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create event admin (super admin only)
router.post('/event-admin', authMiddleware, async (req, res) => {
    if (req.admin.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Super admin only.' });
    }
    
    try {
        const { username, email, password, assigned_event_id, full_name } = req.body;
        const unique_id = generateUniqueId('ADMIN');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.query(
            `INSERT INTO admins (unique_id, username, email, password, role, assigned_event_id, full_name) 
             VALUES (?, ?, ?, ?, 'event_admin', ?, ?)`,
            [unique_id, username, email, hashedPassword, assigned_event_id, full_name]
        );
        
        res.json({ success: true, message: 'Event admin created', admin_id: result.insertId });
    } catch (error) {
        console.error('Create event admin error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get dashboard stats (role-based)
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        let stats = {};
        
        if (req.admin.role === 'super_admin') {
            const [totalEvents] = await pool.query('SELECT COUNT(*) as count FROM events');
            const [totalContestants] = await pool.query('SELECT COUNT(*) as count FROM contestants');
            const [totalVotes] = await pool.query('SELECT SUM(votes_count) as count, SUM(amount_paid) as revenue FROM votes WHERE payment_status = "success"');
            const [totalAdmins] = await pool.query('SELECT COUNT(*) as count FROM admins');
            
            stats = {
                total_events: totalEvents[0].count,
                total_contestants: totalContestants[0].count,
                total_votes: totalVotes[0].count || 0,
                total_revenue: totalVotes[0].revenue || 0,
                total_admins: totalAdmins[0].count
            };
        } else if (req.admin.role === 'event_admin' && req.admin.assigned_event_id) {
            const [eventStats] = await pool.query(`
                SELECT 
                    e.event_name,
                    (SELECT COUNT(*) FROM contestants WHERE event_id = e.id) as contestants_count,
                    (SELECT SUM(votes) FROM contestants WHERE event_id = e.id) as total_votes
                FROM events e WHERE e.id = ?
            `, [req.admin.assigned_event_id]);
            
            stats = eventStats[0] || {};
        }
        
        res.json({ success: true, data: stats, admin: req.admin });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;