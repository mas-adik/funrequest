import { Hono } from 'hono';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { transactions, fundRequests } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

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

// GET /reports/balance — saldo dari SEMUA fund request yang APPROVED (bukan CLOSED)
reportsRouter.get('/balance', async (c) => {
    try {
        const userId   = c.get('userId');
        const tenantId = c.get('tenantId');

        // Get only APPROVED fund requests (not CLOSED)
        const approvedFRs = await db.select().from(fundRequests)
            .where(and(
                eq(fundRequests.user_id, userId),
                eq(fundRequests.tenant_id, tenantId),
                eq(fundRequests.status, 'APPROVED')
            ))
            .all();

        const approvedFRIds = approvedFRs.map(fr => fr.id);
        const initialBalance = approvedFRs.reduce((sum, fr) => sum + fr.amount, 0);

        // Get all transactions, but only count those linked to APPROVED FRs or unlinked
        const allTxs = await db.select().from(transactions)
            .where(and(eq(transactions.user_id, userId), eq(transactions.tenant_id, tenantId)))
            .all();

        // Filter: only transactions linked to an approved FR, or with no FR link
        const activeTxs = allTxs.filter(tx =>
            !tx.fund_request_id || approvedFRIds.includes(tx.fund_request_id)
        );

        const totalIn  = activeTxs.filter(tx => tx.type === 'IN').reduce((s, tx) => s + tx.amount, 0);
        const totalOut = activeTxs.filter(tx => tx.type === 'OUT').reduce((s, tx) => s + tx.amount, 0);
        const remaining = initialBalance + totalIn - totalOut;

        return c.json({
            success: true,
            data: {
                fund_requests:    approvedFRs,
                initial_balance:  initialBalance,
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
