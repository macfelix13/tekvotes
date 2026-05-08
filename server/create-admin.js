/**
 * Create Admin User Script
 * Run this to create a working admin user
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAdmin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tekvotes_db'
    });

    // Hash password: Admin@123
    const password = 'Admin@123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // First, delete existing admin
    await connection.execute('DELETE FROM admins WHERE username = ?', ['admin']);
    
    // Create new admin
    await connection.execute(
        'INSERT INTO admins (username, email, password) VALUES (?, ?, ?)',
        ['admin', 'admin@tekvotes.com', hashedPassword]
    );
    
    console.log('✅ Admin user created successfully!');
    console.log('   Username: admin');
    console.log('   Password: Admin@123');
    
    await connection.end();
}

createAdmin().catch(console.error);