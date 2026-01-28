import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from '@/types';
import auth from '@/routes/auth';

// Initialize Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use(
    '*',
    cors({
        origin: '*', // In production, restrict to mobile app domain
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
    })
);

// Health check endpoint
app.get('/', (c) => {
    return c.json({
        success: true,
        message: 'Vibe SaaS API is running',
        version: '1.0.0',
    });
});

// Register routes
app.route('/auth', auth);

// Global error handler
app.onError((err, c) => {
    console.error('Global error:', err);
    return c.json(
        {
            success: false,
            error: 'Internal server error',
        },
        500
    );
});

// 404 handler
app.notFound((c) => {
    return c.json(
        {
            success: false,
            error: 'Route not found',
        },
        404
    );
});

export default app;
