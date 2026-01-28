// User types
export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
    tenant_id: string;
}

export interface Tenant {
    id: string;
    name: string;
}

// Auth API request types
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

// Auth API response types
export interface AuthResponse {
    success: boolean;
    data?: {
        token: string;
        user: User;
        tenant?: Tenant;
    };
    error?: string;
}

// API Error type
export interface ApiError {
    success: false;
    error: string;
}
