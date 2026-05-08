/**
 * Authentication Controller
 */

const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'tekvotes_super_secret_key_2024';

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('📝 Login attempt:', username);

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const [rows] = await pool.query(
            'SELECT * FROM admins WHERE username = ? OR email = ?',
            [username, username]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
        
        const admin = rows[0];
        
        // Simple password comparison (plain text for testing)
        if (password !== admin.password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const token = jwt.sign(
            { 
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role || 'super_admin'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ Login successful:', username);
        
        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role || 'super_admin'
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const verifyToken = (req, res) => {
    try {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                message: 'No admin data found'
            });
        }
        
        res.json({
            success: true,
            admin: {
                id: req.admin.id,
                username: req.admin.username,
                email: req.admin.email,
                role: req.admin.role
            }
        });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = { login, verifyToken };