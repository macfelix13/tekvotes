/**
 * Database Configuration
 * MySQL Connection Pool with ID Generation Functions
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tekvotes_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

/**
 * Generate Unique ID Helper Function
 * @param {string} prefix - Prefix for the unique ID
 * @returns {string} Unique ID like NOM-ABC123
 */
function generateUniqueId(prefix) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate Contestant ID with Event Name Prefix + Random 2 Digits
 * Format: {3 letters from event name}{2 random digits}
 */
async function generateContestantId(eventId) {
    try {
        const [event] = await pool.query('SELECT event_name FROM events WHERE id = ?', [eventId]);
        
        let prefix = 'CTX';
        
        if (event.length > 0) {
            const eventName = event[0].event_name;
            let cleanName = eventName.replace(/[^a-zA-Z]/g, '');
            prefix = cleanName.substring(0, 3).toUpperCase();
            while (prefix.length < 3) {
                prefix += 'X';
            }
        }
        
        const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `${prefix}${randomNum}`;
    } catch (error) {
        const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `CT${randomNum}`;
    }
}

/**
 * Generate Unique ID for Votes
 */
async function generateVoteId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `VOT${timestamp}${random}`;
}

/**
 * Test Database Connection
 */
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database connected successfully');
        console.log(`   Database: ${process.env.DB_NAME || 'tekvotes_db'}`);
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ MySQL Database connection failed!');
        console.error('   Error:', error.message);
        return false;
    }
};

testConnection();


// Export all functions
module.exports = pool;
module.exports.generateUniqueId = generateUniqueId;
module.exports.generateContestantId = generateContestantId;
module.exports.generateVoteId = generateVoteId;