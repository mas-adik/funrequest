import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/connection.js';
import { users, tenants, departments } from '../db/schema.js';
import type { RegisterOwnerRequest, RegisterUserRequest } from '../types/index.js';

const auth = new Hono();

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set');
    return new TextEncoder().encode(secret);
}

async function createToken(userId: string, email: string, role: string, tenantId: string) {
    return new SignJWT({ userId, email, role, tenantId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(getJwtSecret());
}

// ─── Register Owner (inisialisasi sistem) ─────────────────────────────────────
auth.post('/register-owner', zValidator('json', z.object({
    tenant_name: z.string().min(2),
    admin_name:  z.string().min(2),
    email:       z.string().email(),
    password:    z.string().min(6),
    department:  z.string().optional(),
})), async (c) => {
    try {
        const { tenant_name, admin_name, email, password, department } = c.req.valid('json');

        // Cek apakah tenant sudah ada
        const existing = await db.select().from(tenants).limit(1).all();
        if (existing.length > 0) {
            return c.json({ success: false, error: 'Sistem sudah diinisialisasi' }, 400);
        }

        // Cek email
        const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
        if (existingUser) return c.json({ success: false, error: 'Email sudah terdaftar' }, 400);

        const tenantId   = crypto.randomUUID();
        const password_hash = await bcrypt.hash(password, 10);

        // Buat tenant
        await db.insert(tenants).values({ id: tenantId, name: tenant_name });

        // Buat departemen default
        const defaultDepts = ['Sales', 'Quality', 'HRD', 'Produksi'];
        await db.insert(departments).values(
            defaultDepts.map(name => ({ tenant_id: tenantId, name }))
        );

        // Buat admin
        const userId = crypto.randomUUID();
        await db.insert(users).values({
            id: userId, tenant_id: tenantId, email, password_hash,
            full_name: admin_name, department: department || 'Admin', role: 'ADMIN',
        });

        const token = await createToken(userId, email, 'ADMIN', tenantId);

        return c.json({
            success: true,
            data: {
                token,
                user: { id: userId, email, full_name: admin_name, role: 'ADMIN', tenant_id: tenantId, department },
                tenant: { id: tenantId, name: tenant_name },
            },
        }, 201);
    } catch (error) {
        console.error('Register owner error:', error);
        return c.json({ success: false, error: 'Gagal membuat akun' }, 500);
    }
});

// ─── Register User (auto-join tenant yang ada) ────────────────────────────────
auth.post('/register-user', zValidator('json', z.object({
    full_name:  z.string().min(2),
    email:      z.string().email(),
    password:   z.string().min(6),
    department: z.string().min(1),
})), async (c) => {
    try {
        const { full_name, email, password, department } = c.req.valid('json');

        const tenant = await db.select().from(tenants).limit(1).get();
        if (!tenant) return c.json({ success: false, error: 'Sistem belum diinisialisasi' }, 400);

        const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
        if (existingUser) return c.json({ success: false, error: 'Email sudah terdaftar' }, 400);

        const userId = crypto.randomUUID();
        const password_hash = await bcrypt.hash(password, 10);

        await db.insert(users).values({
            id: userId, tenant_id: tenant.id, email, password_hash,
            full_name, department, role: 'STAFF',
        });

        const token = await createToken(userId, email, 'STAFF', tenant.id);

        return c.json({
            success: true,
            data: {
                token,
                user: { id: userId, email, full_name, role: 'STAFF', tenant_id: tenant.id, department },
            },
        }, 201);
    } catch (error) {
        console.error('Register user error:', error);
        return c.json({ success: false, error: 'Gagal membuat akun' }, 500);
    }
});

// ─── Login ────────────────────────────────────────────────────────────────────
auth.post('/login', zValidator('json', z.object({
    email:    z.string().email(),
    password: z.string().min(1),
})), async (c) => {
    try {
        const { email, password } = c.req.valid('json');

        const user = await db.select().from(users).where(eq(users.email, email)).get();
        if (!user) return c.json({ success: false, error: 'Email atau password salah' }, 401);

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return c.json({ success: false, error: 'Email atau password salah' }, 401);

        const token = await createToken(user.id, user.email, user.role, user.tenant_id);

        return c.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id, email: user.email, full_name: user.full_name,
                    role: user.role, tenant_id: user.tenant_id,
                    department: user.department, phone: user.phone,
                },
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return c.json({ success: false, error: 'Gagal login' }, 500);
    }
});

// ─── Forgot Password (kirim OTP) ──────────────────────────────────────────────
auth.post('/forgot-password', zValidator('json', z.object({
    email: z.string().email(),
})), async (c) => {
    try {
        const { email } = c.req.valid('json');
        const user = await db.select().from(users).where(eq(users.email, email)).get();

        // Selalu return success (tidak bocorkan info email terdaftar atau tidak)
        if (!user) return c.json({ success: true, message: 'Jika email terdaftar, OTP telah dikirim' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

        await db.update(users).set({
            reset_token: otp,
            reset_token_expires: expires,
        }).where(eq(users.id, user.id));

        // TODO: kirim OTP via email (Resend/Nodemailer)
        // Untuk sekarang, log ke console (dev mode)
        console.log(`\n🔐 OTP untuk ${email}: ${otp}\n`);

        return c.json({ success: true, message: 'OTP telah dikirim ke email Anda' });
    } catch (error) {
        console.error('Forgot password error:', error);
        return c.json({ success: false, error: 'Terjadi kesalahan' }, 500);
    }
});

// ─── Reset Password ───────────────────────────────────────────────────────────
auth.post('/reset-password', zValidator('json', z.object({
    email:        z.string().email(),
    token:        z.string().length(6),
    new_password: z.string().min(6),
})), async (c) => {
    try {
        const { email, token, new_password } = c.req.valid('json');

        const user = await db.select().from(users).where(eq(users.email, email)).get();
        if (!user || user.reset_token !== token) {
            return c.json({ success: false, error: 'OTP tidak valid' }, 400);
        }

        if (!user.reset_token_expires || new Date() > new Date(user.reset_token_expires)) {
            return c.json({ success: false, error: 'OTP sudah kadaluarsa' }, 400);
        }

        const password_hash = await bcrypt.hash(new_password, 10);
        await db.update(users).set({
            password_hash,
            reset_token: null,
            reset_token_expires: null,
        }).where(eq(users.id, user.id));

        return c.json({ success: true, message: 'Password berhasil direset' });
    } catch (error) {
        console.error('Reset password error:', error);
        return c.json({ success: false, error: 'Terjadi kesalahan' }, 500);
    }
});

export default auth;
