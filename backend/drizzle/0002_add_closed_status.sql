-- Migration v2: Add CLOSED status to fund_requests
-- SQLite does not support ALTER CHECK, so we recreate the table

-- 1. Create new table with updated CHECK constraint
CREATE TABLE IF NOT EXISTS `fund_requests_new` (
    `id`           INTEGER PRIMARY KEY AUTOINCREMENT,
    `tenant_id`    TEXT NOT NULL REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    `user_id`      TEXT NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
    `department`   TEXT NOT NULL,
    `full_name`    TEXT NOT NULL,
    `request_date` INTEGER NOT NULL,
    `week_start`   INTEGER,
    `week_end`     INTEGER,
    `description`  TEXT NOT NULL,
    `amount`       REAL NOT NULL,
    `status`       TEXT NOT NULL DEFAULT 'PENDING' CHECK(`status` IN ('PENDING', 'APPROVED', 'REJECTED', 'CLOSED')),
    `created_at`   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 2. Copy existing data
INSERT INTO `fund_requests_new` SELECT * FROM `fund_requests`;

-- 3. Drop old table
DROP TABLE `fund_requests`;

-- 4. Rename new table
ALTER TABLE `fund_requests_new` RENAME TO `fund_requests`;

-- 5. Recreate indexes
CREATE INDEX IF NOT EXISTS `idx_fund_requests_user` ON `fund_requests`(`user_id`, `tenant_id`);
