import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from '../types/index.js';

/**
 * Hash a plain text password using bcryptjs
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Verify a plain text password against a hashed password
 * @param password - Plain text password
 * @param hash - Hashed password from database
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token with user payload
 * @param payload - User data to encode in token
 * @param secret - JWT secret key
 * @returns JWT token string
 */
export async function generateToken(payload: JWTPayload, secret: string): Promise<string> {
    const jwtSecret = new TextEncoder().encode(secret);

    const token = await new SignJWT({
        user_id: payload.user_id,
        role: payload.role,
        tenant_id: payload.tenant_id,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d') // Token expires in 30 days
        .sign(jwtSecret);

    return token;
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @param secret - JWT secret key
 * @returns Decoded payload
 * @throws Error if token is invalid or expired
 */
export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
    try {
        const jwtSecret = new TextEncoder().encode(secret);
        const { payload } = await jwtVerify(token, jwtSecret);

        return {
            user_id: payload.user_id as string,
            role: payload.role as 'SUPER_ADMIN' | 'ADMIN' | 'STAFF',
            tenant_id: payload.tenant_id as string | null,
        };
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

/**
 * Generate a UUID v4
 * @returns UUID string
 */
export function generateUUID(): string {
    return crypto.randomUUID();
}
