// fix-password.js - Run this to fix admin login
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function fixAdminPassword() {
    console.log('🔧 Fixing Admin Password...\n');
    
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',  // Change if you have MySQL password
        database: 'tekvotes_db'
    });
    
    // Delete existing admin
    await connection.execute('DELETE FROM admins WHERE username = ?', ['admin']);
    console.log('✓ Removed existing admin');
    
    // Create new hash for Admin@123
    const hash = await bcrypt.hash('Admin@123', 10);
    console.log('✓ Created new password hash');
    console.log('  Hash:', hash.substring(0, 30) + '...');
    
    // Insert new admin
    await connection.execute(
        'INSERT INTO admins (username, email, password) VALUES (?, ?, ?)',
        ['admin', 'admin@tekvotes.com', hash]
    );
    console.log('✓ Inserted new admin');
    
    // Verify
    const [rows] = await connection.execute(
        'SELECT * FROM admins WHERE username = ?',
        ['admin']
    );
    
    const isValid = await bcrypt.compare('Admin@123', rows[0].password);
    
    console.log('\n📋 Verification Result:', isValid ? '✅ SUCCESS!' : '❌ FAILED!');
    
    if (isValid) {
        console.log('\n✨ You can now login with:');
        console.log('   Username: admin');
        console.log('   Password: Admin@123');
    }
    
    await connection.end();
}

fixAdminPassword().catch(console.error);