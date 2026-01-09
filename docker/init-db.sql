-- MuPay Database Initialization Script
-- This script runs when the MySQL container is first created

-- Set character set
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create database if not exists (already created by MYSQL_DATABASE env)
CREATE DATABASE IF NOT EXISTS mupay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mupay;

-- Grant privileges
GRANT ALL PRIVILEGES ON mupay.* TO 'mupay'@'%';
FLUSH PRIVILEGES;

-- Note: Tables will be created automatically by TypeORM synchronize in development mode
