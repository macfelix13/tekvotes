/**
 * Admin Setup Script
 * Run this to create/verify admin user
 * Usage: node server/setup-admin.js
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function setupAdmin() {
    console.log('🔧 Setting up admin user...\n');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tekvotes_db'
    });
    
    console.log('✅ Connected to database');
    
    // Check if admins table exists
    const [tables] = await connection.execute(
        "SHOW TABLES LIKE 'admins'"
    );
    
    if (tables.length === 0) {
        console.log('❌ Admins table does not exist!');
        console.log('Please run database.sql first');
        process.exit(1);
    }
    
    // Admin credentials
    const username = 'admin';
    const password = 'Admin@123';
    const email = 'admin@tekvotes.com';
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed');
    
    // Check if admin exists
    const [existing] = await connection.execute(
        'SELECT * FROM admins WHERE username = ?',
        [username]
    );
    
    if (existing.length > 0) {
        console.log('📝 Admin already exists, updating password...');
        await connection.execute(
            'UPDATE admins SET password = ?, email = ? WHERE username = ?',
            [hashedPassword, email, username]
        );
        console.log('✅ Admin password updated!');
    } else {
        console.log('📝 Creating new admin...');
        await connection.execute(
            'INSERT INTO admins (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        console.log('✅ Admin created!');
    }
    
    // Verify the admin works
    const [verify] = await connection.execute(
        'SELECT * FROM admins WHERE username = ?',
        [username]
    );
    
    console.log('\n📋 Admin Details:');
    console.log('   Username:', verify[0].username);
    console.log('   Email:', verify[0].email);
    console.log('   Password:', password);
    console.log('   Password Hash:', verify[0].password.substring(0, 30) + '...');
    
    // Test password verification
    const testMatch = await bcrypt.compare(password, verify[0].password);
    console.log('\n🔐 Password Verification Test:', testMatch ? '✅ PASSED' : '❌ FAILED');
    
    if (!testMatch) {
        console.log('\n⚠️  WARNING: Password verification failed!');
        console.log('   The stored hash does not match the password.');
    }
    
    await connection.end();
    
    console.log('\n✨ Admin setup complete!');
    console.log('You can now login at: http://localhost:3000/admin-login.html');
}

setupAdmin().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});