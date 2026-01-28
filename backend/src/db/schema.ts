import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Core Table: Tenants (Organization/Workspace)
export const tenants = sqliteTable('tenants', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    address: text('address'),
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
    last_active_at: integer('last_active_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
    subscription_plan: text('subscription_plan').notNull().default('FREE'),
});

// Users Table (Multi-role with tenant relationship)
export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull().unique(),
    password_hash: text('password_hash').notNull(),
    full_name: text('full_name').notNull(),
    role: text('role', { enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] }).notNull(),
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Example Table: Staff/Team Members
export const staff = sqliteTable('staff', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tenant_id: text('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    role: text('role'),
    phone_number: text('phone_number'),
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Example Table: Events/Schedules
export const schedules = sqliteTable('schedules', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tenant_id: text('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    date_time: integer('date_time', { mode: 'timestamp' }).notNull(),
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Example Table: Transactions (Finance)
export const transactions = sqliteTable('transactions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tenant_id: text('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['IN', 'OUT'] }).notNull(),
    category: text('category').notNull(),
    amount: integer('amount').notNull(),
    description: text('description'),
    transaction_date: integer('transaction_date', { mode: 'timestamp' }).notNull(),
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Example Table: Inventory
export const inventory = sqliteTable('inventory', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tenant_id: text('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    item_name: text('item_name').notNull(),
    quantity: integer('quantity').notNull(),
    condition: text('condition', { enum: ['GOOD', 'REPAIR', 'BROKEN'] }).notNull(),
    location: text('location'),
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});
