// Type definitions for Cloudflare Workers environment
export interface Env {
    DB: D1Database;
    JWT_SECRET: string;
}

// JWT Payload structure
export interface JWTPayload {
    user_id: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
    tenant_id: string | null;
    iat?: number;
    exp?: number;
}

// Auth request/response types
export interface RegisterOwnerRequest {
    tenant_name: string;
    admin_name: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        full_name: string;
        role: string;
        tenant_id: string | null;
    };
    tenant?: {
        id: string;
        name: string;
    };
}
