import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { transactions } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const transactionsRouter = new Hono<{ Variables: { userId: string; role: string; tenantId: string } }>();
transactionsRouter.use('*', authMiddleware);

const createSchema = z.object({
    fund_request_id:  z.number().optional().nullable(),
    type:             z.enum(['IN', 'OUT']),
    category:         z.string().min(1),
    description:      z.string().optional(),
    amount:           z.number().positive(),
    transaction_date: z.string(),
});

// POST /transactions
transactionsRouter.post('/', zValidator('json', createSchema), async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');
        const data     = c.req.valid('json');

        const [tx] = await db.insert(transactions).values({
            tenant_id:        tenantId,
            user_id:          userId,
            fund_request_id:  data.fund_request_id ?? null,
            type:             data.type,
            category:         data.category,
            description:      data.description ?? null,
            amount:           data.amount,
            transaction_date: new Date(data.transaction_date),
        }).returning();

        return c.json({ success: true, data: tx }, 201);
    } catch (error) {
        console.error('Create transaction error:', error);
        return c.json({ success: false, error: 'Gagal mencatat transaksi' }, 500);
    }
});

// GET /transactions
transactionsRouter.get('/', async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');
        const { fund_request_id, date_from, date_to } = c.req.query();

        let conditions = [
            eq(transactions.user_id, userId),
            eq(transactions.tenant_id, tenantId),
        ];

        if (fund_request_id) {
            conditions.push(eq(transactions.fund_request_id, parseInt(fund_request_id)));
        }
        if (date_from) {
            conditions.push(gte(transactions.transaction_date, new Date(date_from)));
        }
        if (date_to) {
            const to = new Date(date_to);
            to.setHours(23, 59, 59, 999);
            conditions.push(lte(transactions.transaction_date, to));
        }

        const txs = await db.select().from(transactions).where(and(...conditions)).all();
        return c.json({ success: true, data: txs });
    } catch (error) {
        console.error('Get transactions error:', error);
        return c.json({ success: false, error: 'Gagal mengambil transaksi' }, 500);
    }
});

// DELETE /transactions/:id
transactionsRouter.delete('/:id', async (c) => {
    try {
        const userId = c.get('userId');
        const tenantId = c.get('tenantId');
        const id = parseInt(c.req.param('id'));

        const tx = await db.select().from(transactions)
            .where(and(eq(transactions.id, id), eq(transactions.user_id, userId), eq(transactions.tenant_id, tenantId))).get();
        if (!tx) return c.json({ success: false, error: 'Transaksi tidak ditemukan' }, 404);

        await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.user_id, userId), eq(transactions.tenant_id, tenantId)));
        return c.json({ success: true, message: 'Transaksi berhasil dihapus' });
    } catch (error) {
        console.error('Delete transaction error:', error);
        return c.json({ success: false, error: 'Gagal hapus transaksi' }, 500);
    }
});

// PATCH /transactions/:id
const updateTxSchema = z.object({
    description:      z.string().min(1).optional(),
    category:         z.string().min(1).optional(),
    amount:           z.number().positive().optional(),
    transaction_date: z.string().optional(),
});

transactionsRouter.patch('/:id', zValidator('json', updateTxSchema), async (c) => {
    try {
        const userId = c.get('userId');
        const tenantId = c.get('tenantId');
        const id = parseInt(c.req.param('id'));
        const data = c.req.valid('json');

        const tx = await db.select().from(transactions)
            .where(and(eq(transactions.id, id), eq(transactions.user_id, userId), eq(transactions.tenant_id, tenantId))).get();
        if (!tx) return c.json({ success: false, error: 'Transaksi tidak ditemukan' }, 404);

        const updates: any = {};
        if (data.description !== undefined) updates.description = data.description;
        if (data.category !== undefined) updates.category = data.category;
        if (data.amount !== undefined) updates.amount = data.amount;
        if (data.transaction_date !== undefined) updates.transaction_date = new Date(data.transaction_date);

        await db.update(transactions).set(updates)
            .where(and(eq(transactions.id, id), eq(transactions.user_id, userId), eq(transactions.tenant_id, tenantId)));

        const updated = await db.select().from(transactions)
            .where(eq(transactions.id, id)).get();

        return c.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update transaction error:', error);
        return c.json({ success: false, error: 'Gagal update transaksi' }, 500);
    }
});

export default transactionsRouter;
