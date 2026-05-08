/**
 * Database Models
 * Query helper functions for all tables
 */

const pool = require('../config/database');

// ============================================
// ADMIN QUERIES
// ============================================
// ============================================
// ADMIN QUERIES - Make sure these exist
// ============================================
const Admin = {
    findByUsername: async (username) => {
        const pool = require('../config/database');
        const [rows] = await pool.execute(
            'SELECT * FROM admins WHERE username = ?',
            [username]
        );
        return rows[0];
    },

    findByEmail: async (email) => {
        const pool = require('../config/database');
        const [rows] = await pool.execute(
            'SELECT * FROM admins WHERE email = ?',
            [email]
        );
        return rows[0];
    },

    findById: async (id) => {
        const pool = require('../config/database');
        const [rows] = await pool.execute(
            'SELECT id, username, email, created_at FROM admins WHERE id = ?',
            [id]
        );
        return rows[0];
    },

    create: async (username, email, hashedPassword) => {
        const pool = require('../config/database');
        const [result] = await pool.execute(
            'INSERT INTO admins (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        return result.insertId;
    },

    delete: async (id) => {
        const pool = require('../config/database');
        const [result] = await pool.execute(
            'DELETE FROM admins WHERE id = ?',
            [id]
        );
        return result.affectedRows;
    },

    getAll: async () => {
        const pool = require('../config/database');
        const [rows] = await pool.execute(
            'SELECT id, username, email, created_at FROM admins ORDER BY created_at DESC'
        );
        return rows;
    }
};

// ============================================
// CONTESTANT QUERIES
// ============================================
const Contestant = {
    findAll: async () => {
        const [rows] = await pool.execute(
            `SELECT c.*, e.event_name, e.vote_price 
             FROM contestants c 
             LEFT JOIN events e ON c.event_id = e.id 
             WHERE c.is_active = TRUE 
             ORDER BY c.votes DESC`
        );
        return rows;
    },

    findById: async (id) => {
        const [rows] = await pool.execute(
            `SELECT c.*, e.event_name, e.vote_price 
             FROM contestants c 
             LEFT JOIN events e ON c.event_id = e.id 
             WHERE c.id = ?`,
            [id]
        );
        return rows[0];
    },

    create: async (data) => {
        const { full_name, image, biography, category, event_id, instagram, twitter, facebook } = data;
        const [result] = await pool.execute(
            `INSERT INTO contestants (full_name, image, biography, category, event_id, instagram, twitter, facebook) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [full_name, image || null, biography || null, category || null, event_id || null,
             instagram || null, twitter || null, facebook || null]
        );
        return result.insertId;
    },

    update: async (id, data) => {
        const { full_name, biography, category, instagram, twitter, facebook, is_active } = data;
        const [result] = await pool.execute(
            `UPDATE contestants 
             SET full_name = ?, biography = ?, category = ?, 
                 instagram = ?, twitter = ?, facebook = ?, is_active = ?
             WHERE id = ?`,
            [full_name, biography, category, instagram, twitter, facebook, is_active, id]
        );
        return result.affectedRows;
    },

    updateImage: async (id, image) => {
        const [result] = await pool.execute(
            'UPDATE contestants SET image = ? WHERE id = ?',
            [image, id]
        );
        return result.affectedRows;
    },

    updateVotes: async (id, votesCount) => {
        const [result] = await pool.execute(
            'UPDATE contestants SET votes = votes + ? WHERE id = ?',
            [votesCount, id]
        );
        return result.affectedRows;
    },

    delete: async (id) => {
        const [result] = await pool.execute(
            'UPDATE contestants SET is_active = FALSE WHERE id = ?',
            [id]
        );
        return result.affectedRows;
    },

    getStats: async () => {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as total, SUM(votes) as total_votes FROM contestants WHERE is_active = TRUE'
        );
        return rows[0];
    }
};

// ============================================
// VOTE QUERIES
// ============================================
const Vote = {
    create: async (data) => {
        const { contestant_id, voter_name, voter_email, voter_phone, votes_count, amount_paid, transaction_reference } = data;
        const [result] = await pool.execute(
            `INSERT INTO votes (contestant_id, voter_name, voter_email, voter_phone, votes_count, amount_paid, transaction_reference, payment_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [contestant_id, voter_name, voter_email, voter_phone || null, votes_count, amount_paid, transaction_reference]
        );
        return result.insertId;
    },

    findByReference: async (reference) => {
        const [rows] = await pool.execute(
            'SELECT * FROM votes WHERE transaction_reference = ?',
            [reference]
        );
        return rows[0];
    },

    updateStatus: async (reference, status) => {
        const [result] = await pool.execute(
            'UPDATE votes SET payment_status = ? WHERE transaction_reference = ?',
            [status, reference]
        );
        return result.affectedRows;
    },

    getRecent: async (limit = 10) => {
        const [rows] = await pool.execute(
            `SELECT v.*, c.full_name as contestant_name 
             FROM votes v 
             JOIN contestants c ON v.contestant_id = c.id 
             WHERE v.payment_status = 'success'
             ORDER BY v.created_at DESC 
             LIMIT ?`,
            [limit]
        );
        return rows;
    },

    getStats: async () => {
        const [rows] = await pool.execute(
            `SELECT 
                COUNT(*) as total_transactions,
                SUM(votes_count) as total_votes,
                SUM(amount_paid) as total_revenue,
                COUNT(DISTINCT voter_email) as unique_voters
             FROM votes 
             WHERE payment_status = 'success'`
        );
        return rows[0];
    },

    getAll: async () => {
        const [rows] = await pool.execute(
            `SELECT v.*, c.full_name as contestant_name 
             FROM votes v 
             JOIN contestants c ON v.contestant_id = c.id 
             ORDER BY v.created_at DESC`
        );
        return rows;
    }
};

// ============================================
// EVENT QUERIES
// ============================================
const Event = {
    findAll: async () => {
        const [rows] = await pool.execute('SELECT * FROM events ORDER BY created_at DESC');
        return rows;
    },

    findActive: async () => {
        const [rows] = await pool.execute(
            'SELECT * FROM events WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
        );
        return rows[0];
    },

    findById: async (id) => {
        const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [id]);
        return rows[0];
    },

    create: async (data) => {
        const { event_name, description, start_date, end_date, vote_price, currency } = data;
        const [result] = await pool.execute(
            `INSERT INTO events (event_name, description, start_date, end_date, vote_price, currency)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [event_name, description, start_date, end_date, vote_price, currency || 'GHS']
        );
        return result.insertId;
    },

    update: async (id, data) => {
        const { event_name, description, start_date, end_date, vote_price, is_active } = data;
        const [result] = await pool.execute(
            `UPDATE events SET event_name = ?, description = ?, start_date = ?, 
             end_date = ?, vote_price = ?, is_active = ? WHERE id = ?`,
            [event_name, description, start_date, end_date, vote_price, is_active, id]
        );
        return result.affectedRows;
    }
};

module.exports = { Admin, Contestant, Vote, Event };
