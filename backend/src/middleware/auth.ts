import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { jwtVerify } from 'jose';
import type { JWTPayload } from '@/types';

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set');
    return new TextEncoder().encode(secret);
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
export const authMiddleware = createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw new HTTPException(401, { message: 'Authorization header required' });
    }

    const token = authHeader.slice(7);
    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        const jwtPayload = payload as unknown as JWTPayload;
        c.set('userId', jwtPayload.userId);
        c.set('role', jwtPayload.role);
        c.set('tenantId', jwtPayload.tenantId);
        await next();
    } catch {
        throw new HTTPException(401, { message: 'Invalid or expired token' });
    }
});

// ─── Role Guard ───────────────────────────────────────────────────────────────
export function requireRole(role: 'ADMIN' | 'STAFF') {
    return createMiddleware(async (c, next) => {
        const userRole = c.get('role');
        if (userRole !== role) {
            throw new HTTPException(403, { message: 'Insufficient permissions' });
        }
        await next();
    });
}
