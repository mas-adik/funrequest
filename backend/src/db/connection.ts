import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';

// ─── Buat direktori data jika belum ada ──────────────────────────────────────
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'fundrequest.db');
const DB_DIR  = path.dirname(DB_PATH);

if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log(`✅ Created data directory: ${DB_DIR}`);
}

// ─── Singleton SQLite connection ─────────────────────────────────────────────
const sqlite = new Database(DB_PATH);

// Aktifkan WAL mode: lebih baik untuk concurrent reads
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

console.log(`📦 Database connected: ${DB_PATH}`);

export const db = drizzle(sqlite);
export { sqlite };
