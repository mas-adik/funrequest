import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import auth from './routes/auth.js';
import usersRouter from './routes/users.js';
import fundRequestsRouter from './routes/fund-requests.js';
import transactionsRouter from './routes/transactions.js';
import reportsRouter from './routes/reports.js';
import departmentsRouter from './routes/departments.js';
import { runMigrations } from './db/migrate.js';

// ─── Run DB Migrations on startup ────────────────────────────────────────────
runMigrations();

// ─── Initialize Hono app ─────────────────────────────────────────────────────
const app = new Hono();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use('*', logger());
app.use(
    '*',
    cors({
        origin: (origin) => origin || '*',
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400,
    })
);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// ─── Rate Limiter (in-memory, per IP) ─────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 20; // max 20 auth attempts per window

app.use('/auth/*', async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (entry && now < entry.resetAt) {
        if (entry.count >= RATE_LIMIT_MAX) {
            return c.json({ success: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, 429);
        }
        entry.count++;
    } else {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }

    // Cleanup old entries periodically
    if (rateLimitMap.size > 1000) {
        for (const [key, val] of rateLimitMap) {
            if (now > val.resetAt) rateLimitMap.delete(key);
        }
    }

    await next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (c) => {
    return c.json({
        success: true,
        message: 'FundRequest API is running 🚀',
        version: '1.0.0',
    });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.route('/auth', auth);
app.route('/users', usersRouter);
app.route('/fund-requests', fundRequestsRouter);
app.route('/transactions', transactionsRouter);
app.route('/reports', reportsRouter);
app.route('/departments', departmentsRouter);

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.onError((err, c) => {
    console.error('Global error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
});

app.notFound((c) => {
    return c.json({ success: false, error: 'Route not found' }, 404);
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || '8787');
console.log(`\n🚀 FundRequest API running on http://0.0.0.0:${port}\n`);

serve({
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0',
});
