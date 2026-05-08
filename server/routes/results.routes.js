const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');

// Create system_settings table if not exists
const initTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        const [rows] = await pool.query("SELECT * FROM system_settings WHERE setting_key = 'live_results_enabled'");
        if (rows.length === 0) {
            await pool.query("INSERT INTO system_settings (setting_key, setting_value) VALUES ('live_results_enabled', 'true')");
        }
    } catch (error) {
        console.error('Init error:', error);
    }
};
initTable();

// GET /api/results/status - Get live results status (public)
router.get('/status', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'live_results_enabled'");
        const isEnabled = rows.length > 0 ? rows[0].setting_value === 'true' : true;
        res.json({ success: true, data: { live_results_enabled: isEnabled } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/results/toggle-live - Toggle live results (Super Admin only)
router.post('/toggle-live', authMiddleware, async (req, res) => {
    try {
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Super admin only.' });
        }
        
        const { enabled } = req.body;
        const isEnabled = enabled === true || enabled === 'true';
        
        await pool.query(
            "INSERT INTO system_settings (setting_key, setting_value) VALUES ('live_results_enabled', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
            [isEnabled ? 'true' : 'false']
        );
        
        res.json({ success: true, message: `Live results ${isEnabled ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/results - Get all results (public)
router.get('/', async (req, res) => {
    try {
        const [settings] = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'live_results_enabled'");
        const liveResultsEnabled = settings.length > 0 ? settings[0].setting_value === 'true' : true;
        
        const [rows] = await pool.query(`
            SELECT 
                c.id,
                c.contestant_unique_id,
                c.full_name,
                c.image,
                c.votes,
                e.event_name,
                cat.category_name
            FROM contestants c
            JOIN events e ON c.event_id = e.id
            LEFT JOIN categories cat ON c.category_id = cat.id
            WHERE c.is_active = 1 AND c.nomination_status = 'approved'
            ORDER BY c.votes DESC
        `);
        
        res.json({ success: true, data: { results: rows, live_results_enabled: liveResultsEnabled } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/results/leaderboard - Get top 20 contestants
router.get('/leaderboard', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                c.id,
                c.contestant_unique_id,
                c.full_name,
                c.image,
                c.votes,
                e.event_name,
                cat.category_name
            FROM contestants c
            JOIN events e ON c.event_id = e.id
            LEFT JOIN categories cat ON c.category_id = cat.id
            WHERE c.is_active = 1 AND c.nomination_status = 'approved'
            ORDER BY c.votes DESC
            LIMIT 20
        `);
        
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;