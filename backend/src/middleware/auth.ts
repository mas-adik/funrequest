import { Context, Next } from 'hono';
import { verifyToken } from '@/lib/auth';
import type { Env, JWTPayload } from '@/types';

// Extend Hono context type to include custom variables
type Variables = {
    userId: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
    tenantId: string | null;
};

/**
 * Authentication middleware that validates JWT tokens
 * Extracts user_id, role, and tenant_id from token and injects into context
 */
export async function authMiddleware(
    c: Context<{ Bindings: Env; Variables: Variables }>,
    next: Next
) {
    try {
        // Get Authorization header
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json(
                {
                    success: false,
                    error: 'Missing or invalid Authorization header',
                },
                401
            );
        }

        // Extract token
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify and decode token with JWT secret from environment
        const payload: JWTPayload = await verifyToken(token, c.env.JWT_SECRET);

        // Inject user data into context for use in routes
        c.set('userId', payload.user_id);
        c.set('role', payload.role);
        c.set('tenantId', payload.tenant_id);

        // Continue to next middleware/route
        await next();
    } catch (error) {
        return c.json(
            {
                success: false,
                error: 'Invalid or expired token',
            },
            401
        );
    }
}

/**
 * Role-based authorization middleware
 * Ensures user has required role to access route
 */
export function requireRole(
    ...allowedRoles: Array<'SUPER_ADMIN' | 'ADMIN' | 'STAFF'>
) {
    return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
        const userRole = c.get('role') as string;

        if (!allowedRoles.includes(userRole as any)) {
            return c.json(
                {
                    success: false,
                    error: 'Insufficient permissions',
                },
                403
            );
        }

        await next();
    };
}
