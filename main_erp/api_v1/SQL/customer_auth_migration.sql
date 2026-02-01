-- ============================================
-- Customer Authentication System - Database Migration
-- Version: 1.0
-- Date: 2026-01-29
-- ============================================

-- ============================================
-- 1. CUSTOMERS TABLE
-- Stores customer information for authentication
-- ============================================

CREATE TABLE IF NOT EXISTS `customers` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `phone` VARCHAR(15) UNIQUE NOT NULL COMMENT 'Customer phone number with country code',
    `name` VARCHAR(100) DEFAULT NULL COMMENT 'Customer full name',
    `email` VARCHAR(100) DEFAULT NULL COMMENT 'Customer email address',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation timestamp',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    `last_booking_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Last booking timestamp',
    `total_bookings` INT UNSIGNED DEFAULT 0 COMMENT 'Total number of bookings made',
    `status` ENUM('active', 'inactive', 'blocked') DEFAULT 'active' COMMENT 'Customer account status',
    INDEX `idx_phone` (`phone`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer accounts for authentication';

-- ============================================
-- 2. CUSTOMER VEHICLES TABLE
-- Stores customer's saved vehicles
-- ============================================

CREATE TABLE IF NOT EXISTS `customer_vehicles` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT UNSIGNED NOT NULL COMMENT 'Reference to customers table',
    `vehicle_type` ENUM('hatchback', 'sedan', 'suv', 'luxury', 'bike') NOT NULL COMMENT 'Type of vehicle',
    `vehicle_model` VARCHAR(100) DEFAULT NULL COMMENT 'Vehicle model name (e.g., Honda City)',
    `vehicle_number` VARCHAR(20) DEFAULT NULL COMMENT 'Vehicle registration number',
    `is_primary` BOOLEAN DEFAULT FALSE COMMENT 'Is this the primary vehicle',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_is_primary` (`is_primary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer saved vehicles';

-- ============================================
-- 3. CUSTOMER LOCATIONS TABLE
-- Stores customer's saved addresses
-- ============================================

CREATE TABLE IF NOT EXISTS `customer_locations` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT UNSIGNED NOT NULL COMMENT 'Reference to customers table',
    `label` VARCHAR(50) DEFAULT NULL COMMENT 'Location label (Home, Office, etc.)',
    `address` TEXT DEFAULT NULL COMMENT 'Full address text',
    `lat` DECIMAL(10, 8) DEFAULT NULL COMMENT 'Latitude coordinate',
    `lng` DECIMAL(11, 8) DEFAULT NULL COMMENT 'Longitude coordinate',
    `landmark` VARCHAR(200) DEFAULT NULL COMMENT 'Nearby landmark',
    `landmark_type` VARCHAR(50) DEFAULT NULL COMMENT 'Type of landmark',
    `notes` TEXT DEFAULT NULL COMMENT 'Additional directions/notes',
    `pincode` VARCHAR(10) DEFAULT NULL COMMENT 'Postal code',
    `is_primary` BOOLEAN DEFAULT FALSE COMMENT 'Is this the primary location',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_is_primary` (`is_primary`),
    INDEX `idx_pincode` (`pincode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer saved locations';

-- ============================================
-- 4. UPDATE BOOKINGS TABLE
-- Add customer_id foreign key to existing bookings table
-- ============================================

-- Check if customer_id column exists, if not add it
SET @dbname = DATABASE();
SET @tablename = 'bookings';
SET @columnname = 'customer_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT UNSIGNED DEFAULT NULL COMMENT ''Reference to customers table'' AFTER id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key constraint if it doesn't exist
SET @fkname = 'fk_bookings_customer';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (constraint_name = @fkname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD CONSTRAINT ', @fkname, ' FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for customer_id if it doesn't exist
SET @indexname = 'idx_customer_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = @indexname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD INDEX ', @indexname, ' (customer_id)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 5. SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment below to insert sample customer data for testing
/*
INSERT INTO `customers` (`phone`, `name`, `email`, `total_bookings`, `last_booking_at`) VALUES
('+919876543210', 'Test Customer', 'test@example.com', 5, NOW() - INTERVAL 7 DAY),
('+919876543211', 'John Doe', 'john@example.com', 2, NOW() - INTERVAL 30 DAY);

INSERT INTO `customer_vehicles` (`customer_id`, `vehicle_type`, `vehicle_model`, `is_primary`) VALUES
(1, 'sedan', 'Honda City', TRUE),
(1, 'bike', 'Royal Enfield', FALSE);

INSERT INTO `customer_locations` (`customer_id`, `label`, `address`, `lat`, `lng`, `landmark`, `is_primary`) VALUES
(1, 'Home', '123 Main Street, Kokrajhar, Assam', 26.4012, 90.2696, 'Near Shiv Mandir', TRUE),
(1, 'Office', '456 Park Road, Kokrajhar, Assam', 26.4050, 90.2750, 'Near City Mall', FALSE);
*/

-- ============================================
-- 6. VERIFICATION QUERIES
-- Run these to verify the migration
-- ============================================

-- Check if all tables exist
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('customers', 'customer_vehicles', 'customer_locations', 'bookings')
ORDER BY TABLE_NAME;

-- Check customers table structure
DESCRIBE customers;

-- Check customer_vehicles table structure
DESCRIBE customer_vehicles;

-- Check customer_locations table structure
DESCRIBE customer_locations;

-- Check if customer_id was added to bookings
SHOW COLUMNS FROM bookings LIKE 'customer_id';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
