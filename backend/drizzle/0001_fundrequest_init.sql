-- FundRequest App — Migration v1
-- Jalankan: npm run db:migrate

-- ─── Tenants ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tenants` (
    `id`         TEXT NOT NULL PRIMARY KEY,
    `name`       TEXT NOT NULL,
    `address`    TEXT,
    `created_at` INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ─── Departments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `departments` (
    `id`         INTEGER PRIMARY KEY AUTOINCREMENT,
    `tenant_id`  TEXT NOT NULL REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    `name`       TEXT NOT NULL,
    `created_at` INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
    `id`                   TEXT NOT NULL PRIMARY KEY,
    `tenant_id`            TEXT NOT NULL REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    `email`                TEXT NOT NULL UNIQUE,
    `password_hash`        TEXT NOT NULL,
    `full_name`            TEXT NOT NULL,
    `department`           TEXT,
    `phone`                TEXT,
    `role`                 TEXT NOT NULL DEFAULT 'STAFF' CHECK(`role` IN ('ADMIN', 'STAFF')),
    `reset_token`          TEXT,
    `reset_token_expires`  INTEGER,
    `created_at`           INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ─── Fund Requests ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `fund_requests` (
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
    `status`       TEXT NOT NULL DEFAULT 'PENDING' CHECK(`status` IN ('PENDING', 'APPROVED', 'REJECTED')),
    `created_at`   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `transactions` (
    `id`               INTEGER PRIMARY KEY AUTOINCREMENT,
    `tenant_id`        TEXT NOT NULL REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    `user_id`          TEXT NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
    `fund_request_id`  INTEGER REFERENCES `fund_requests`(`id`) ON DELETE SET NULL,
    `type`             TEXT NOT NULL CHECK(`type` IN ('IN', 'OUT')),
    `category`         TEXT NOT NULL,
    `description`      TEXT,
    `amount`           REAL NOT NULL,
    `transaction_date` INTEGER NOT NULL,
    `created_at`       INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ─── Indeks untuk performa query ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS `idx_users_tenant`          ON `users`(`tenant_id`);
CREATE INDEX IF NOT EXISTS `idx_fund_requests_user`    ON `fund_requests`(`user_id`, `tenant_id`);
CREATE INDEX IF NOT EXISTS `idx_transactions_user`     ON `transactions`(`user_id`, `tenant_id`);
CREATE INDEX IF NOT EXISTS `idx_transactions_fr`       ON `transactions`(`fund_request_id`);
CREATE INDEX IF NOT EXISTS `idx_txn_date`              ON `transactions`(`transaction_date`);
