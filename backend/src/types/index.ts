// ─── Env (dibaca dari process.env, bukan Cloudflare binding) ─────────────────
export interface Env {
    JWT_SECRET: string;
    DATABASE_PATH: string;  // Path ke file SQLite, e.g. /app/data/fundrequest.db
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────
export interface JWTPayload {
    userId: string;
    email: string;
    role: 'ADMIN' | 'STAFF';
    tenantId: string;
}

// ─── Auth Request Types ───────────────────────────────────────────────────────
export interface RegisterOwnerRequest {
    tenant_name: string;
    admin_name: string;
    email: string;
    password: string;
    department?: string;
}

export interface RegisterUserRequest {
    full_name: string;
    email: string;
    password: string;
    department: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

// ─── Hono Variables (c.get / c.set) ──────────────────────────────────────────
export interface HonoVariables {
    userId: string;
    role: string;
    tenantId: string;
}
