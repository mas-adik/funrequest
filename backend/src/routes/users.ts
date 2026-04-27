import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const usersRouter = new Hono<{ Variables: { userId: string; role: string; tenantId: string } }>();
usersRouter.use('*', authMiddleware);

// GET /users/me
usersRouter.get('/me', async (c) => {
    try {
        const userId = c.get('userId');
        const user = await db.select({
            id: users.id, email: users.email, full_name: users.full_name,
            role: users.role, tenant_id: users.tenant_id,
            department: users.department, phone: users.phone,
        }).from(users).where(eq(users.id, userId)).get();

        if (!user) return c.json({ success: false, error: 'User tidak ditemukan' }, 404);
        return c.json({ success: true, data: user });
    } catch (error) {
        console.error('Get me error:', error);
        return c.json({ success: false, error: 'Gagal mengambil profil' }, 500);
    }
});

// PUT /users/me
usersRouter.put('/me', zValidator('json', z.object({
    full_name:  z.string().min(2).optional(),
    department: z.string().optional(),
    phone:      z.string().optional(),
})), async (c) => {
    try {
        const userId = c.get('userId');
        const data = c.req.valid('json');
        const [updated] = await db.update(users).set(data).where(eq(users.id, userId)).returning();
        return c.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update me error:', error);
        return c.json({ success: false, error: 'Gagal update profil' }, 500);
    }
});

// PUT /users/me/password
usersRouter.put('/me/password', zValidator('json', z.object({
    current_password: z.string().min(1),
    new_password:     z.string().min(6),
})), async (c) => {
    try {
        const userId = c.get('userId');
        const { current_password, new_password } = c.req.valid('json');

        const user = await db.select().from(users).where(eq(users.id, userId)).get();
        if (!user) return c.json({ success: false, error: 'User tidak ditemukan' }, 404);

        const valid = await bcrypt.compare(current_password, user.password_hash);
        if (!valid) return c.json({ success: false, error: 'Password saat ini salah' }, 400);

        const password_hash = await bcrypt.hash(new_password, 10);
        await db.update(users).set({ password_hash }).where(eq(users.id, userId));

        return c.json({ success: true, message: 'Password berhasil diubah' });
    } catch (error) {
        console.error('Change password error:', error);
        return c.json({ success: false, error: 'Gagal ubah password' }, 500);
    }
});

// GET /users/all — List all users in the same tenant
usersRouter.get('/all', async (c) => {
    try {
        const tenantId = c.get('tenantId');
        const allUsers = await db.select({
            id: users.id,
            email: users.email,
            full_name: users.full_name,
            department: users.department,
            role: users.role,
            last_active: users.last_active,
        }).from(users).where(eq(users.tenant_id, tenantId)).all();

        return c.json({ success: true, data: allUsers });
    } catch (error) {
        console.error('Get all users error:', error);
        return c.json({ success: false, error: 'Gagal mengambil daftar user' }, 500);
    }
});

// POST /users/heartbeat — Update last_active timestamp
usersRouter.post('/heartbeat', async (c) => {
    try {
        const userId = c.get('userId');
        await db.update(users)
            .set({ last_active: new Date() })
            .where(eq(users.id, userId));
        return c.json({ success: true });
    } catch (error) {
        return c.json({ success: false }, 500);
    }
});

export default usersRouter;
