import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/connection';
import { departments } from '@/db/schema';
import { authMiddleware, requireRole } from '@/middleware/auth';

const departmentsRouter = new Hono<{ Variables: { userId: string; role: string; tenantId: string } }>();
departmentsRouter.use('*', authMiddleware);

const deptSchema = z.object({ name: z.string().min(2, 'Nama departemen minimal 2 karakter') });

// GET /departments
departmentsRouter.get('/', async (c) => {
    try {
        const tenantId = c.get('tenantId');
        const depts = await db.select().from(departments).where(eq(departments.tenant_id, tenantId)).all();
        return c.json({ success: true, data: depts });
    } catch (error) {
        console.error('Get departments error:', error);
        return c.json({ success: false, error: 'Gagal mengambil daftar departemen' }, 500);
    }
});

// POST /departments — ADMIN only
departmentsRouter.post('/', requireRole('ADMIN'), zValidator('json', deptSchema), async (c) => {
    try {
        const tenantId = c.get('tenantId');
        const { name } = c.req.valid('json');
        const [newDept] = await db.insert(departments).values({ tenant_id: tenantId, name }).returning();
        return c.json({ success: true, data: newDept }, 201);
    } catch (error) {
        console.error('Create department error:', error);
        return c.json({ success: false, error: 'Gagal membuat departemen' }, 500);
    }
});

// PUT /departments/:id — ADMIN only
departmentsRouter.put('/:id', requireRole('ADMIN'), zValidator('json', deptSchema), async (c) => {
    try {
        const tenantId = c.get('tenantId');
        const id = parseInt(c.req.param('id'));
        const { name } = c.req.valid('json');

        const existing = await db.select().from(departments)
            .where(and(eq(departments.id, id), eq(departments.tenant_id, tenantId))).get();
        if (!existing) return c.json({ success: false, error: 'Departemen tidak ditemukan' }, 404);

        const [updated] = await db.update(departments).set({ name })
            .where(and(eq(departments.id, id), eq(departments.tenant_id, tenantId))).returning();
        return c.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update department error:', error);
        return c.json({ success: false, error: 'Gagal update departemen' }, 500);
    }
});

// DELETE /departments/:id — ADMIN only
departmentsRouter.delete('/:id', requireRole('ADMIN'), async (c) => {
    try {
        const tenantId = c.get('tenantId');
        const id = parseInt(c.req.param('id'));

        const existing = await db.select().from(departments)
            .where(and(eq(departments.id, id), eq(departments.tenant_id, tenantId))).get();
        if (!existing) return c.json({ success: false, error: 'Departemen tidak ditemukan' }, 404);

        await db.delete(departments).where(and(eq(departments.id, id), eq(departments.tenant_id, tenantId)));
        return c.json({ success: true, message: 'Departemen berhasil dihapus' });
    } catch (error) {
        console.error('Delete department error:', error);
        return c.json({ success: false, error: 'Gagal hapus departemen' }, 500);
    }
});

export default departmentsRouter;
