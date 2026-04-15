import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Core Table: Tenants (Organisasi) ───────────────────────────────────────
export const tenants = sqliteTable('tenants', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    address: text('address'),
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});

// ─── Departments Table ────────────────────────────────────────────────────────
// Admin bisa tambah/edit/hapus departemen
export const departments = sqliteTable('departments', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tenant_id: text('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});

// ─── Users Table ─────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull().unique(),
    password_hash: text('password_hash').notNull(),
    full_name: text('full_name').notNull(),
    department: text('department'),          // Nama departemen (text, bukan FK)
    phone: text('phone'),
    role: text('role', { enum: ['ADMIN', 'STAFF'] }).notNull().default('STAFF'),
    reset_token: text('reset_token'),
    reset_token_expires: integer('reset_token_expires', { mode: 'timestamp' }),
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});

// ─── Fund Requests Table ──────────────────────────────────────────────────────
// Pengajuan dana mingguan per user
export const fundRequests = sqliteTable('fund_requests', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tenant_id: text('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    user_id: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    department: text('department').notNull(),
    full_name: text('full_name').notNull(),
    request_date: integer('request_date', { mode: 'timestamp' }).notNull(),
    week_start: integer('week_start', { mode: 'timestamp' }),
    week_end: integer('week_end', { mode: 'timestamp' }),
    description: text('description').notNull(),
    amount: real('amount').notNull(),        // Nominal pengajuan (IDR)
    status: text('status', { enum: ['PENDING', 'APPROVED', 'REJECTED'] })
        .notNull()
        .default('PENDING'),
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});

// ─── Transactions Table ───────────────────────────────────────────────────────
// Pemasukan & Pengeluaran terkait fund request
export const transactions = sqliteTable('transactions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tenant_id: text('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    user_id: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    fund_request_id: integer('fund_request_id')
        .references(() => fundRequests.id, { onDelete: 'set null' }),
    type: text('type', { enum: ['IN', 'OUT'] }).notNull(),
    category: text('category').notNull(),
    description: text('description'),
    amount: real('amount').notNull(),
    transaction_date: integer('transaction_date', { mode: 'timestamp' }).notNull(),
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});
