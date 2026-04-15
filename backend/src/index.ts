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
        origin: '*',
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
    })
);

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
