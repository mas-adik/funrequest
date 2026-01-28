import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { tenants, users } from '@/db/schema';
import { hashPassword, verifyPassword, generateToken, generateUUID } from '@/lib/auth';
import type { Env } from '@/types';

const auth = new Hono<{ Bindings: Env }>();

// Validation schemas
const registerOwnerSchema = z.object({
    tenant_name: z.string().min(3, 'Tenant name must be at least 3 characters'),
    admin_name: z.string().min(3, 'Admin name must be at least 3 characters'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

/**
 * POST /auth/register-owner
 * Register new tenant owner (creates both tenant and admin user)
 */
auth.post(
    '/register-owner',
    zValidator('json', registerOwnerSchema),
    async (c) => {
        try {
            const { tenant_name, admin_name, email, password } = c.req.valid('json');
            const db = drizzle(c.env.DB);

            // Check if email already exists
            const existingUser = await db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .get();

            if (existingUser) {
                return c.json(
                    {
                        success: false,
                        error: 'Email already registered',
                    },
                    400
                );
            }

            // Generate IDs
            const tenantId = generateUUID();
            const userId = generateUUID();

            // Hash password
            const passwordHash = await hashPassword(password);

            // Create tenant (Transaction Step 1)
            await db.insert(tenants).values({
                id: tenantId,
                name: tenant_name,
                address: null,
                subscription_plan: 'FREE',
            });

            // Create admin user (Transaction Step 2)
            await db.insert(users).values({
                id: userId,
                tenant_id: tenantId,
                email: email,
                password_hash: passwordHash,
                full_name: admin_name,
                role: 'ADMIN',
            });

            // Generate JWT token
            const token = await generateToken({
                user_id: userId,
                role: 'ADMIN',
                tenant_id: tenantId,
            }, c.env.JWT_SECRET);

            return c.json(
                {
                    success: true,
                    data: {
                        token,
                        user: {
                            id: userId,
                            email: email,
                            full_name: admin_name,
                            role: 'ADMIN',
                            tenant_id: tenantId,
                        },
                        tenant: {
                            id: tenantId,
                            name: tenant_name,
                        },
                    },
                },
                201
            );
        } catch (error) {
            console.error('Register error:', error);
            return c.json(
                {
                    success: false,
                    error: 'Registration failed',
                },
                500
            );
        }
    }
);

/**
 * POST /auth/login
 * Login with email and password
 */
auth.post('/login', zValidator('json', loginSchema), async (c) => {
    try {
        const { email, password } = c.req.valid('json');
        const db = drizzle(c.env.DB);

        // Find user by email
        const user = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .get();

        if (!user) {
            return c.json(
                {
                    success: false,
                    error: 'Invalid email or password',
                },
                401
            );
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password_hash);

        if (!isPasswordValid) {
            return c.json(
                {
                    success: false,
                    error: 'Invalid email or password',
                },
                401
            );
        }

        // Generate JWT token
        const token = await generateToken({
            user_id: user.id,
            role: user.role as 'SUPER_ADMIN' | 'ADMIN' | 'STAFF',
            tenant_id: user.tenant_id,
        }, c.env.JWT_SECRET);

        return c.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    tenant_id: user.tenant_id,
                },
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return c.json(
            {
                success: false,
                error: 'Login failed',
            },
            500
        );
    }
});

export default auth;
