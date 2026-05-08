-- ============================================
-- TEKVOTES DATABASE SCHEMA
-- Complete Production Database
-- Contestant ID Format: {3 letters from event name}{2 random digits}
-- Example: FOS24, MIS12, MRT34, TEE56
-- ============================================

-- Drop and recreate database (Uncomment if you want fresh start)
DROP DATABASE IF EXISTS tekvotes_db;
CREATE DATABASE tekvotes_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tekvotes_db;

-- ============================================
-- ADMINS TABLE
-- ============================================
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unique_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'event_admin', 'viewer') DEFAULT 'event_admin',
    assigned_event_id INT NULL,
    full_name VARCHAR(255),
    profile_image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_role (role),
    INDEX idx_assigned_event (assigned_event_id)
);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_unique_id VARCHAR(50) UNIQUE NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_prefix VARCHAR(10) DEFAULT NULL,
    description TEXT,
    event_image VARCHAR(255) DEFAULT NULL,
    hero_image VARCHAR(255) DEFAULT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    vote_price DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_unique_id (event_unique_id),
    INDEX idx_active (is_active),
    INDEX idx_prefix (event_prefix)
);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_unique_id VARCHAR(50) UNIQUE NOT NULL,
    event_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    category_description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event (event_id),
    INDEX idx_active (is_active),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_category (event_id, category_name)
);

-- ============================================
-- CONTESTANTS TABLE (with new ID format)
-- ============================================
CREATE TABLE contestants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contestant_unique_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    image VARCHAR(255) DEFAULT NULL,
    biography TEXT,
    category_id INT,
    event_id INT NOT NULL,
    instagram VARCHAR(255) DEFAULT NULL,
    tiktok VARCHAR(255) DEFAULT NULL,
    facebook VARCHAR(255) DEFAULT NULL,
    votes INT DEFAULT 0,
    nomination_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_unique_id (contestant_unique_id),
    INDEX idx_event (event_id),
    INDEX idx_category (category_id),
    INDEX idx_active (is_active),
    INDEX idx_votes (votes),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ============================================
-- NOMINATIONS TABLE (Complete with all required columns)
-- ============================================
CREATE TABLE nominations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomination_unique_id VARCHAR(50) UNIQUE NOT NULL,
    contestant_name VARCHAR(255) NOT NULL,
    contestant_phone VARCHAR(50),
    contestant_email VARCHAR(150),
    event_id INT NOT NULL,
    category_id INT NOT NULL,
    nominator_name VARCHAR(255) NOT NULL,
    nominator_email VARCHAR(255) NOT NULL,
    nominator_phone VARCHAR(50),
    reason TEXT,
    photo_url VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event (event_id),
    INDEX idx_category (category_id),
    INDEX idx_status (status),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- ============================================
-- VOTES TABLE
-- ============================================
CREATE TABLE votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vote_unique_id VARCHAR(50) UNIQUE NOT NULL,
    contestant_id INT NOT NULL,
    event_id INT NOT NULL,
    voter_name VARCHAR(255) NOT NULL,
    voter_email VARCHAR(255) NOT NULL,
    voter_phone VARCHAR(50),
    votes_count INT NOT NULL DEFAULT 1,
    amount_paid DECIMAL(10, 2) NOT NULL,
    transaction_reference VARCHAR(255) NOT NULL UNIQUE,
    payment_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_contestant (contestant_id),
    INDEX idx_event (event_id),
    INDEX idx_transaction (transaction_reference),
    INDEX idx_payment_status (payment_status),
    FOREIGN KEY (contestant_id) REFERENCES contestants(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- ============================================
-- SYSTEM SETTINGS TABLE (for live results toggle)
-- ============================================
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (setting_key)
);

-- ============================================
-- INSERT DEFAULT SUPER ADMIN (password: admin123)
-- ============================================
INSERT INTO admins (unique_id, username, email, password, role, full_name, is_active) 
VALUES ('ADMIN-SUPER-001', 'admin', 'admin@tekvotes.com', 'admin123', 'super_admin', 'Super Administrator', 1);

-- ============================================
-- INSERT DEFAULT SYSTEM SETTINGS
-- ============================================
INSERT INTO system_settings (setting_key, setting_value) 
VALUES ('live_results_enabled', 'true');

-- ============================================
-- INSERT SAMPLE EVENTS (with future end dates for featured events)
-- ============================================
INSERT INTO events (event_unique_id, event_name, event_prefix, description, start_date, end_date, vote_price, is_active) VALUES 
('EVT-001', 'Miss TekVotes 2024', 'MIS', 'The most prestigious beauty pageant of the year celebrating elegance and grace. Contestants from across the nation compete for the coveted crown.', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1.00, 1),
('EVT-002', 'Mr. TekVotes 2024', 'MRT', 'The ultimate male pageant showcasing talent, intelligence, and charisma. Watch the finest gentlemen compete.', DATE_ADD(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 35 DAY), 1.00, 1),
('EVT-003', 'Teen TekVotes 2024', 'TEE', 'Young talents compete for the crown in this exciting teen pageant. The future stars of tomorrow!', DATE_ADD(NOW(), INTERVAL 10 DAY), DATE_ADD(NOW(), INTERVAL 40 DAY), 0.50, 1),
('EVT-004', 'Face of Sekondi', 'FOS', 'The most anticipated beauty pageant in the Western Region. Celebrating beauty, culture, and talent.', NOW(), DATE_ADD(NOW(), INTERVAL 25 DAY), 1.00, 1);

-- ============================================
-- INSERT SAMPLE CATEGORIES
-- ============================================
-- Get event IDs dynamically
SET @event_miss_id = (SELECT id FROM events WHERE event_name = 'Miss TekVotes 2024' LIMIT 1);
SET @event_mr_id = (SELECT id FROM events WHERE event_name = 'Mr. TekVotes 2024' LIMIT 1);
SET @event_teen_id = (SELECT id FROM events WHERE event_name = 'Teen TekVotes 2024' LIMIT 1);
SET @event_fos_id = (SELECT id FROM events WHERE event_name = 'Face of Sekondi' LIMIT 1);

-- Categories for Miss TekVotes 2024
INSERT INTO categories (category_unique_id, event_id, category_name, sort_order) VALUES 
('CAT-001', @event_miss_id, 'Miss Elegance', 1),
('CAT-002', @event_miss_id, 'Miss Intelligence', 2),
('CAT-003', @event_miss_id, 'Miss Charity', 3),
('CAT-004', @event_miss_id, 'Miss Talent', 4),
('CAT-005', @event_miss_id, 'Miss Fashion', 5),
('CAT-006', @event_miss_id, 'Miss Popularity', 6);

-- Categories for Mr. TekVotes 2024
INSERT INTO categories (category_unique_id, event_id, category_name, sort_order) VALUES 
('CAT-007', @event_mr_id, 'Mr. Charisma', 1),
('CAT-008', @event_mr_id, 'Mr. Talent', 2),
('CAT-009', @event_mr_id, 'Mr. Intelligence', 3),
('CAT-010', @event_mr_id, 'Mr. Fitness', 4),
('CAT-011', @event_mr_id, 'Mr. Popularity', 5);

-- Categories for Teen TekVotes 2024
INSERT INTO categories (category_unique_id, event_id, category_name, sort_order) VALUES 
('CAT-012', @event_teen_id, 'Teen Queen', 1),
('CAT-013', @event_teen_id, 'Teen Star', 2),
('CAT-014', @event_teen_id, 'Teen Genius', 3),
('CAT-015', @event_teen_id, 'Teen Talent', 4);

-- Categories for Face of Sekondi
INSERT INTO categories (category_unique_id, event_id, category_name, sort_order) VALUES 
('CAT-016', @event_fos_id, 'Face Queen', 1),
('CAT-017', @event_fos_id, 'Culture Ambassador', 2),
('CAT-018', @event_fos_id, 'People\'s Choice', 3);

-- ============================================
-- INSERT SAMPLE CONTESTANTS (with new ID format)
-- ============================================

-- Contestants for Miss TekVotes 2024 (Prefix: MIS)
INSERT INTO contestants (contestant_unique_id, full_name, biography, category_id, event_id, votes, is_active) VALUES 
('MIS12', 'Abena Mensah', 'A passionate entrepreneur and beauty queen from Accra. She loves fashion, reading, and community development. Her goal is to use this platform to advocate for women empowerment across Africa.', (SELECT id FROM categories WHERE category_name = 'Miss Elegance' AND event_id = @event_miss_id LIMIT 1), @event_miss_id, 245, 1),
('MIS34', 'Akosua Boateng', 'A talented software engineer who believes beauty and brains go together. She is passionate about STEM education for girls and runs a coding bootcamp in her community.', (SELECT id FROM categories WHERE category_name = 'Miss Intelligence' AND event_id = @event_miss_id LIMIT 1), @event_miss_id, 189, 1),
('MIS56', 'Efua Asante', 'A medical student with a heart of gold. She volunteers at local clinics and hopes to become a pediatrician. Her smile lights up every room she walks into.', (SELECT id FROM categories WHERE category_name = 'Miss Charity' AND event_id = @event_miss_id LIMIT 1), @event_miss_id, 312, 1),
('MIS78', 'Adwoa Osei', 'A professional dancer and choreographer who has performed across West Africa. She brings grace and elegance to everything she does.', (SELECT id FROM categories WHERE category_name = 'Miss Talent' AND event_id = @event_miss_id LIMIT 1), @event_miss_id, 156, 1),
('MIS90', 'Ama Darko', 'A young entrepreneur who founded her own fashion line at age 22. She is passionate about promoting African culture through fashion and art.', (SELECT id FROM categories WHERE category_name = 'Miss Fashion' AND event_id = @event_miss_id LIMIT 1), @event_miss_id, 278, 1);

-- Contestants for Mr. TekVotes 2024 (Prefix: MRT)
INSERT INTO contestants (contestant_unique_id, full_name, biography, category_id, event_id, votes, is_active) VALUES 
('MRT12', 'Kofi Mensah', 'A talented actor and model with a passion for social change. He has starred in multiple international films and uses his platform for good.', (SELECT id FROM categories WHERE category_name = 'Mr. Charisma' AND event_id = @event_mr_id LIMIT 1), @event_mr_id, 98, 1),
('MRT34', 'James Boateng', 'A fitness trainer and motivational speaker. He inspires young people to achieve their fitness goals and live healthy lives.', (SELECT id FROM categories WHERE category_name = 'Mr. Talent' AND event_id = @event_mr_id LIMIT 1), @event_mr_id, 145, 1),
('MRT56', 'Michael Asare', 'A brilliant engineer and innovator. He holds multiple patents in renewable energy technology.', (SELECT id FROM categories WHERE category_name = 'Mr. Intelligence' AND event_id = @event_mr_id LIMIT 1), @event_mr_id, 112, 1);

-- Contestants for Teen TekVotes 2024 (Prefix: TEE)
INSERT INTO contestants (contestant_unique_id, full_name, biography, category_id, event_id, votes, is_active) VALUES 
('TEE12', 'Esi Ampadu', 'A brilliant young scientist and aspiring astronaut. She won the national science fair two years running.', (SELECT id FROM categories WHERE category_name = 'Teen Queen' AND event_id = @event_teen_id LIMIT 1), @event_teen_id, 67, 1),
('TEE34', 'Kwame Asiedu', 'A talented young musician and composer. He has already released two hit singles.', (SELECT id FROM categories WHERE category_name = 'Teen Star' AND event_id = @event_teen_id LIMIT 1), @event_teen_id, 89, 1),
('TEE56', 'Adwoa Sarfo', 'A coding prodigy who built her first app at age 14. She teaches coding to other teens.', (SELECT id FROM categories WHERE category_name = 'Teen Genius' AND event_id = @event_teen_id LIMIT 1), @event_teen_id, 45, 1);

-- Contestants for Face of Sekondi (Prefix: FOS)
INSERT INTO contestants (contestant_unique_id, full_name, biography, category_id, event_id, votes, is_active) VALUES 
('FOS12', 'Nana Ama', 'A proud ambassador of Sekondi culture. She is passionate about preserving and promoting Western Region heritage.', (SELECT id FROM categories WHERE category_name = 'Face Queen' AND event_id = @event_fos_id LIMIT 1), @event_fos_id, 234, 1),
('FOS34', 'Esi Eshun', 'A cultural advocate and tourism promoter. She has worked extensively to showcase the beauty of Sekondi.', (SELECT id FROM categories WHERE category_name = 'Culture Ambassador' AND event_id = @event_fos_id LIMIT 1), @event_fos_id, 187, 1);

-- ============================================
-- INSERT SAMPLE VOTES
-- ============================================
INSERT INTO votes (vote_unique_id, contestant_id, event_id, voter_name, voter_email, votes_count, amount_paid, transaction_reference, payment_status) VALUES 
('VOT-001', (SELECT id FROM contestants WHERE contestant_unique_id = 'MIS12' LIMIT 1), @event_miss_id, 'John Doe', 'john@example.com', 5, 5.00, 'TXN-001', 'success'),
('VOT-002', (SELECT id FROM contestants WHERE contestant_unique_id = 'MIS56' LIMIT 1), @event_miss_id, 'Jane Smith', 'jane@example.com', 10, 10.00, 'TXN-002', 'success'),
('VOT-003', (SELECT id FROM contestants WHERE contestant_unique_id = 'MIS90' LIMIT 1), @event_miss_id, 'Mike Johnson', 'mike@example.com', 3, 3.00, 'TXN-003', 'success'),
('VOT-004', (SELECT id FROM contestants WHERE contestant_unique_id = 'MIS34' LIMIT 1), @event_miss_id, 'Sarah Williams', 'sarah@example.com', 7, 7.00, 'TXN-004', 'success'),
('VOT-005', (SELECT id FROM contestants WHERE contestant_unique_id = 'FOS12' LIMIT 1), @event_fos_id, 'David Brown', 'david@example.com', 12, 12.00, 'TXN-005', 'success');

-- ============================================
-- VERIFY DATABASE SETUP
-- ============================================
SELECT '=========================================' AS '';
SELECT '✅ TEKVOTES DATABASE SETUP COMPLETE!' AS Status;
SELECT '=========================================' AS '';

SELECT '📊 TABLE COUNTS:' AS '';
SELECT 'Admins:' AS Table_Name, COUNT(*) AS Count FROM admins
UNION ALL
SELECT 'Events:', COUNT(*) FROM events
UNION ALL
SELECT 'Categories:', COUNT(*) FROM categories
UNION ALL
SELECT 'Contestants:', COUNT(*) FROM contestants
UNION ALL
SELECT 'Nominations:', COUNT(*) FROM nominations
UNION ALL
SELECT 'Votes:', COUNT(*) FROM votes
UNION ALL
SELECT 'Settings:', COUNT(*) FROM system_settings;

SELECT '=========================================' AS '';
SELECT '🔐 SUPER ADMIN CREDENTIALS:' AS Info;
SELECT '   Username: admin' AS Username;
SELECT '   Password: admin123' AS Password;
SELECT '   Role: super_admin' AS Role;

SELECT '=========================================' AS '';
SELECT '🏷️  CONTESTANT ID FORMAT:' AS Info;
SELECT '   Format: {3 letters from event name}{2 random digits}' AS Format;
SELECT '   Examples: FOS12, MIS34, MRT56, TEE78' AS Examples;

SELECT '=========================================' AS '';
SELECT '📋 ALL EVENTS:' AS Info;
SELECT id, event_name, event_prefix, is_active, end_date FROM events;

SELECT '=========================================' AS '';
SELECT '⭐ FEATURED EVENTS (Active with future end date):' AS Info;
SELECT id, event_name, is_active, end_date FROM events 
WHERE is_active = 1 AND end_date > NOW()
ORDER BY created_at DESC;

SELECT '=========================================' AS '';
SELECT '✅ Database is ready to use!' AS Status;