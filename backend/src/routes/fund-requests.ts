import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { fundRequests } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const fundRequestsRouter = new Hono<{ Variables: { userId: string; role: string; tenantId: string } }>();
fundRequestsRouter.use('*', authMiddleware);

const createSchema = z.object({
    department:   z.string().min(1),
    full_name:    z.string().min(1),
    request_date: z.string(),
    week_start:   z.string().optional(),
    week_end:     z.string().optional(),
    description:  z.string().min(1),
    amount:       z.number().positive(),
});

// POST /fund-requests
fundRequestsRouter.post('/', zValidator('json', createSchema), async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');
        const data     = c.req.valid('json');

        const [fr] = await db.insert(fundRequests).values({
            tenant_id:    tenantId,
            user_id:      userId,
            department:   data.department,
            full_name:    data.full_name,
            request_date: new Date(data.request_date),
            week_start:   data.week_start ? new Date(data.week_start) : null,
            week_end:     data.week_end   ? new Date(data.week_end) : null,
            description:  data.description,
            amount:       data.amount,
            status:       'PENDING',
        }).returning();

        return c.json({ success: true, data: fr }, 201);
    } catch (error) {
        console.error('Create fund request error:', error);
        return c.json({ success: false, error: 'Gagal membuat fund request' }, 500);
    }
});

// GET /fund-requests
fundRequestsRouter.get('/', async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');
        const frs = await db.select().from(fundRequests)
            .where(and(eq(fundRequests.user_id, userId), eq(fundRequests.tenant_id, tenantId)))
            .all();
        return c.json({ success: true, data: frs });
    } catch (error) {
        console.error('Get fund requests error:', error);
        return c.json({ success: false, error: 'Gagal mengambil fund requests' }, 500);
    }
});

// GET /fund-requests/:id
fundRequestsRouter.get('/:id', async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');
        const id = parseInt(c.req.param('id'));

        const fr = await db.select().from(fundRequests)
            .where(and(eq(fundRequests.id, id), eq(fundRequests.user_id, userId), eq(fundRequests.tenant_id, tenantId)))
            .get();

        if (!fr) return c.json({ success: false, error: 'Fund request tidak ditemukan' }, 404);
        return c.json({ success: true, data: fr });
    } catch (error) {
        console.error('Get fund request error:', error);
        return c.json({ success: false, error: 'Gagal mengambil fund request' }, 500);
    }
});

export default fundRequestsRouter;
