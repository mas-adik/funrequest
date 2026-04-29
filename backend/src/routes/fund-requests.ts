import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { fundRequests, transactions } from '../db/schema.js';
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

const updateSchema = z.object({
    description:  z.string().min(1).optional(),
    amount:       z.number().positive().optional(),
    request_date: z.string().optional(),
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

// GET /fund-requests/:id/summary — Get closing summary for a closed FR (for reprint)
fundRequestsRouter.get('/:id/summary', async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');
        const id = parseInt(c.req.param('id'));

        const fr = await db.select().from(fundRequests)
            .where(and(eq(fundRequests.id, id), eq(fundRequests.user_id, userId), eq(fundRequests.tenant_id, tenantId)))
            .get();
        if (!fr) return c.json({ success: false, error: 'Fund request tidak ditemukan' }, 404);

        const relatedTx = await db.select().from(transactions)
            .where(and(eq(transactions.fund_request_id, id), eq(transactions.tenant_id, tenantId)))
            .all();
        const totalExpense = relatedTx.filter(tx => tx.type === 'OUT').reduce((s, tx) => s + tx.amount, 0);

        return c.json({
            success: true,
            data: {
                fund_request: fr,
                summary: {
                    total_budget: fr.amount,
                    total_expense: totalExpense,
                    remaining_balance: fr.amount - totalExpense,
                },
                transactions: relatedTx,
            },
        });
    } catch (error: any) {
        console.error('Get summary error:', error?.message || error);
        return c.json({ success: false, error: 'Gagal mengambil summary' }, 500);
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

// PATCH /fund-requests/:id — Update fund request (description, amount, date)
fundRequestsRouter.patch('/:id', zValidator('json', updateSchema), async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');
        const id = parseInt(c.req.param('id'));
        const data = c.req.valid('json');

        // Cek ownership
        const existing = await db.select().from(fundRequests)
            .where(and(eq(fundRequests.id, id), eq(fundRequests.user_id, userId), eq(fundRequests.tenant_id, tenantId)))
            .get();
        if (!existing) return c.json({ success: false, error: 'Fund request tidak ditemukan' }, 404);

        const updateData: Record<string, any> = {};
        if (data.description)  updateData.description = data.description;
        if (data.amount)       updateData.amount = data.amount;
        if (data.request_date) updateData.request_date = new Date(data.request_date);

        const [updated] = await db.update(fundRequests)
            .set(updateData)
            .where(eq(fundRequests.id, id))
            .returning();

        return c.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update fund request error:', error);
        return c.json({ success: false, error: 'Gagal mengupdate fund request' }, 500);
    }
});

// POST /fund-requests/:id/approve — Approve & buat transaksi IN otomatis
fundRequestsRouter.post('/:id/approve', async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');
        const id = parseInt(c.req.param('id'));

        // Cek ownership & status
        const fr = await db.select().from(fundRequests)
            .where(and(eq(fundRequests.id, id), eq(fundRequests.user_id, userId), eq(fundRequests.tenant_id, tenantId)))
            .get();
        if (!fr) return c.json({ success: false, error: 'Fund request tidak ditemukan' }, 404);
        if (fr.status === 'APPROVED') return c.json({ success: false, error: 'Sudah disetujui sebelumnya' }, 400);

        // Update status → APPROVED
        const [updated] = await db.update(fundRequests)
            .set({ status: 'APPROVED' })
            .where(eq(fundRequests.id, id))
            .returning();

        // Buat transaksi IN otomatis (saldo masuk ke kas)
        await db.insert(transactions).values({
            tenant_id:        tenantId,
            user_id:          userId,
            fund_request_id:  id,
            type:             'IN',
            category:         'Fund Request',
            description:      `Approve FR #${id}: ${fr.description}`,
            amount:           fr.amount,
            transaction_date: new Date(),
        });

        return c.json({ success: true, data: updated });
    } catch (error) {
        console.error('Approve fund request error:', error);
        return c.json({ success: false, error: 'Gagal approve fund request' }, 500);
    }
});


// POST /fund-requests/:id/close — Close (Tutup) fund request & return summary
fundRequestsRouter.post('/:id/close', async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');
        const id = parseInt(c.req.param('id'));

        const fr = await db.select().from(fundRequests)
            .where(and(eq(fundRequests.id, id), eq(fundRequests.user_id, userId), eq(fundRequests.tenant_id, tenantId)))
            .get();
        if (!fr) return c.json({ success: false, error: 'Fund request tidak ditemukan' }, 404);
        if (fr.status !== 'APPROVED') return c.json({ success: false, error: 'Hanya FR yang disetujui bisa di-closing' }, 400);

        // Get all OUT transactions (linked to this FR + unlinked)
        const allTx = await db.select().from(transactions)
            .where(and(eq(transactions.user_id, userId), eq(transactions.tenant_id, tenantId)))
            .all();
        const relatedTx = allTx.filter(tx => tx.fund_request_id === id || (tx.type === 'OUT' && !tx.fund_request_id));
        const totalExpense = relatedTx.filter(tx => tx.type === 'OUT').reduce((s, tx) => s + tx.amount, 0);

        // Update status to CLOSED using raw SQL to avoid enum validation issues
        await db.update(fundRequests)
            .set({ status: 'CLOSED' as any })
            .where(eq(fundRequests.id, id));

        // Link unlinked OUT transactions to this FR
        for (const tx of relatedTx) {
            if (!tx.fund_request_id && tx.type === 'OUT') {
                await db.update(transactions)
                    .set({ fund_request_id: id })
                    .where(eq(transactions.id, tx.id));
            }
        }

        return c.json({
            success: true,
            data: {
                fund_request: { ...fr, status: 'CLOSED' },
                summary: {
                    total_budget: fr.amount,
                    total_expense: totalExpense,
                    remaining_balance: fr.amount - totalExpense,
                },
                transactions: relatedTx,
            },
        });
    } catch (error: any) {
        console.error('Close fund request error:', error?.message || error);
        return c.json({ success: false, error: 'Gagal closing fund request: ' + (error?.message || 'Unknown') }, 500);
    }
});

// DELETE /fund-requests/:id
fundRequestsRouter.delete('/:id', async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');
        const id = parseInt(c.req.param('id'));

        const fr = await db.select().from(fundRequests)
            .where(and(eq(fundRequests.id, id), eq(fundRequests.user_id, userId), eq(fundRequests.tenant_id, tenantId)))
            .get();
        if (!fr) return c.json({ success: false, error: 'Fund request tidak ditemukan' }, 404);

        // Hapus semua transaksi yg terhubung ke FR ini (linked by fund_request_id)
        await db.delete(transactions).where(eq(transactions.fund_request_id, id));

        // Hapus FR itu sendiri
        await db.delete(fundRequests).where(eq(fundRequests.id, id));
        return c.json({ success: true, data: null });
    } catch (error) {
        console.error('Delete fund request error:', error);
        return c.json({ success: false, error: 'Gagal menghapus fund request' }, 500);
    }
});

export default fundRequestsRouter;
