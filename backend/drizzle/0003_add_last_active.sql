-- Migration v3: Add last_active column to users for online/offline tracking
ALTER TABLE `users` ADD COLUMN `last_active` INTEGER;
