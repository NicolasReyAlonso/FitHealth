-- Migration: Add deleted_at column to routines table for soft delete functionality
-- This script adds support for soft deletes on the routines table

-- PostgreSQL version
ALTER TABLE routines ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;

-- SQLite version (if using SQLite, comment out above and use this)
-- ALTER TABLE routines ADD COLUMN deleted_at DATETIME DEFAULT NULL;

-- Create an index for efficient filtering
CREATE INDEX idx_routines_deleted_at ON routines(deleted_at);

-- Optional: Create a view for active routines only
CREATE OR REPLACE VIEW active_routines AS
SELECT * FROM routines WHERE deleted_at IS NULL;
