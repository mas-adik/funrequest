import { Hono } from 'hono';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from '@/db/connection';
import { transactions, fundRequests } from '@/db/schema';
import { authMiddleware } from '@/middleware/auth';

const reportsRouter = new Hono<{ Variables: { userId: string; role: string; tenantId: string } }>();
reportsRouter.use('*', authMiddleware);

// GET /reports/summary?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
reportsRouter.get('/summary', async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');
        const { date_from, date_to } = c.req.query();

        if (!date_from || !date_to) {
            return c.json({ success: false, error: 'Parameter date_from dan date_to wajib diisi' }, 400);
        }

        const from = new Date(date_from);
        const to   = new Date(date_to);
        to.setHours(23, 59, 59, 999);

        const frs = await db.select().from(fundRequests)
            .where(and(
                eq(fundRequests.user_id, userId),
                eq(fundRequests.tenant_id, tenantId),
                gte(fundRequests.request_date, from),
                lte(fundRequests.request_date, to)
            )).all();

        const txs = await db.select().from(transactions)
            .where(and(
                eq(transactions.user_id, userId),
                eq(transactions.tenant_id, tenantId),
                gte(transactions.transaction_date, from),
                lte(transactions.transaction_date, to)
            )).all();

        const totalBudget   = frs.reduce((sum, fr) => sum + fr.amount, 0);
        const totalIn       = txs.filter(tx => tx.type === 'IN').reduce((sum, tx) => sum + tx.amount, 0);
        const totalOut      = txs.filter(tx => tx.type === 'OUT').reduce((sum, tx) => sum + tx.amount, 0);
        const remaining     = totalBudget + totalIn - totalOut;

        return c.json({
            success: true,
            data: {
                period: { from: date_from, to: date_to },
                fund_requests: frs,
                transactions: txs,
                summary: {
                    total_budget:       totalBudget,
                    total_income:       totalIn,
                    total_expense:      totalOut,
                    remaining_balance:  remaining,
                },
            },
        });
    } catch (error) {
        console.error('Get report summary error:', error);
        return c.json({ success: false, error: 'Gagal membuat laporan' }, 500);
    }
});

// GET /reports/balance — saldo dari fund request terbaru
reportsRouter.get('/balance', async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');

        const latestFR = await db.select().from(fundRequests)
            .where(and(eq(fundRequests.user_id, userId), eq(fundRequests.tenant_id, tenantId)))
            .orderBy(desc(fundRequests.created_at))
            .limit(1)
            .get();

        if (!latestFR) {
            return c.json({
                success: true,
                data: { fund_request: null, initial_balance: 0, total_income: 0, total_expense: 0, remaining_balance: 0 },
            });
        }

        const txs = await db.select().from(transactions)
            .where(and(eq(transactions.user_id, userId), eq(transactions.fund_request_id, latestFR.id)))
            .all();

        const totalIn  = txs.filter(tx => tx.type === 'IN').reduce((s, tx) => s + tx.amount, 0);
        const totalOut = txs.filter(tx => tx.type === 'OUT').reduce((s, tx) => s + tx.amount, 0);
        const remaining = latestFR.amount + totalIn - totalOut;

        return c.json({
            success: true,
            data: {
                fund_request:     latestFR,
                initial_balance:  latestFR.amount,
                total_income:     totalIn,
                total_expense:    totalOut,
                remaining_balance: remaining,
            },
        });
    } catch (error) {
        console.error('Get balance error:', error);
        return c.json({ success: false, error: 'Gagal mengambil saldo' }, 500);
    }
});

export default reportsRouter;
