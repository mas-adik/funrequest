// ─── User Types ───────────────────────────────────────────────────────────────
export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'ADMIN' | 'STAFF';
    tenant_id: string;
    department?: string | null;
    phone?: string | null;
}

export interface Tenant {
    id: string;
    name: string;
}

export interface Department {
    id: number;
    tenant_id: string;
    name: string;
    created_at: string | null;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────
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

export interface AuthResponse {
    success: boolean;
    data?: {
        token: string;
        user: User;
        tenant?: Tenant;
    };
    error?: string;
}

// ─── Fund Request Types ───────────────────────────────────────────────────────
export type FundRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface FundRequest {
    id: number;
    tenant_id: string;
    user_id: string;
    department: string;
    full_name: string;
    request_date: string;
    week_start: string | null;
    week_end: string | null;
    description: string;
    amount: number;
    status: FundRequestStatus;
    created_at: string | null;
}

export interface CreateFundRequestPayload {
    department: string;
    full_name: string;
    request_date: string;
    week_start?: string;
    week_end?: string;
    description: string;
    amount: number;
}

// ─── Form Item Type (for Fund Request form) ────────────────────────────────────
export interface FRItem {
    item: string;      // Keterangan/deskripsi item
    qty: string;       // Jumlah/satuan item
    amount: number;    // Harga/nominal item (dalam Rupiah)
}

// ─── Transaction Types ────────────────────────────────────────────────────────
export type TransactionType = 'IN' | 'OUT';

export interface Transaction {
    id: number;
    tenant_id: string;
    user_id: string;
    fund_request_id: number | null;
    type: TransactionType;
    category: string;
    description: string | null;
    amount: number;
    transaction_date: string;
    created_at: string | null;
}

export interface CreateTransactionPayload {
    fund_request_id?: number | null;
    type: TransactionType;
    category: string;
    description?: string;
    amount: number;
    transaction_date: string;
}

// ─── Report Types ─────────────────────────────────────────────────────────────
export interface ReportSummary {
    period: { from: string; to: string };
    fund_requests: FundRequest[];
    transactions: Transaction[];
    summary: {
        total_budget: number;
        total_income: number;
        total_expense: number;
        remaining_balance: number;
    };
}

export interface BalanceSummary {
    fund_request: FundRequest | null;
    initial_balance: number;
    total_income: number;
    total_expense: number;
    remaining_balance: number;
}

// ─── API Error ────────────────────────────────────────────────────────────────
export interface ApiError {
    success: false;
    error: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
