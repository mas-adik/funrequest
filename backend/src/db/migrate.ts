import { sqlite } from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations() {
    const migrationsDir = path.join(__dirname, '../../drizzle');

    if (!fs.existsSync(migrationsDir)) {
        console.log('⚠️  No migrations directory found, skipping.');
        return;
    }

    // ─── Buat tabel tracking migrasi ─────────────────────────────────────────
    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            run_at INTEGER NOT NULL DEFAULT (unixepoch())
        )
    `);

    // ─── Ambil migrasi yg belum dijalankan ───────────────────────────────────
    const applied = sqlite
        .prepare('SELECT name FROM _migrations')
        .all()
        .map((r: any) => r.name);

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    let count = 0;
    for (const file of files) {
        if (applied.includes(file)) continue;

        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        console.log(`🔄 Running migration: ${file}`);

        sqlite.exec(sql);
        sqlite.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
        count++;
    }

    if (count > 0) console.log(`✅ Applied ${count} migration(s)`);
    else console.log('✅ Database is up to date');
}
