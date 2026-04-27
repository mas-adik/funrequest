import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import type {
    AuthResponse,
    RegisterOwnerRequest,
    RegisterUserRequest,
    LoginRequest,
    ApiResponse,
    FundRequest,
    CreateFundRequestPayload,
    Transaction,
    CreateTransactionPayload,
    ReportSummary,
    BalanceSummary,
    Department,
    User,
} from '@/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

// ─── Axios Instance ───────────────────────────────────────────────────────────
export const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Attach token ke setiap request
api.interceptors.request.use(async (config) => {
    try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) { /* silent */ }
    return config;
});

// Handle 401 — clear auth
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        if (error.response?.status === 401) {
            await SecureStore.deleteItemAsync('auth_token').catch(() => { });
            await SecureStore.deleteItemAsync('user_data').catch(() => { });
        }
        return Promise.reject(error);
    }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
    registerOwner: async (data: RegisterOwnerRequest) => {
        const res = await api.post<AuthResponse>('/auth/register-owner', data);
        return res.data;
    },
    registerUser: async (data: RegisterUserRequest) => {
        const res = await api.post<AuthResponse>('/auth/register-user', data);
        return res.data;
    },
    login: async (data: LoginRequest) => {
        const res = await api.post<AuthResponse>('/auth/login', data);
        return res.data;
    },
    forgotPassword: async (email: string) => {
        const res = await api.post<ApiResponse<null>>('/auth/forgot-password', { email });
        return res.data;
    },
    resetPassword: async (data: { token: string; email: string; new_password: string }) => {
        const res = await api.post<ApiResponse<null>>('/auth/reset-password', data);
        return res.data;
    },
};

// ─── User API ─────────────────────────────────────────────────────────────────
export const userApi = {
    getMe: async () => {
        const res = await api.get<ApiResponse<User>>('/users/me');
        return res.data;
    },
    updateMe: async (data: Partial<Pick<User, 'full_name' | 'department' | 'phone'>>) => {
        const res = await api.put<ApiResponse<User>>('/users/me', data);
        return res.data;
    },
    changePassword: async (data: { current_password: string; new_password: string }) => {
        const res = await api.put<ApiResponse<null>>('/users/me/password', data);
        return res.data;
    },
    getAll: async () => {
        const res = await api.get<ApiResponse<any[]>>('/users/all');
        return res.data;
    },
    heartbeat: async () => {
        const res = await api.post<ApiResponse<null>>('/users/heartbeat');
        return res.data;
    },
};

// ─── Departments API ──────────────────────────────────────────────────────────
export const departmentsApi = {
    getAll: async () => {
        const res = await api.get<ApiResponse<Department[]>>('/departments');
        return res.data;
    },
    create: async (name: string) => {
        const res = await api.post<ApiResponse<Department>>('/departments', { name });
        return res.data;
    },
    update: async (id: number, name: string) => {
        const res = await api.put<ApiResponse<Department>>(`/departments/${id}`, { name });
        return res.data;
    },
    delete: async (id: number) => {
        const res = await api.delete<ApiResponse<null>>(`/departments/${id}`);
        return res.data;
    },
};

// ─── Fund Requests API ────────────────────────────────────────────────────────
export const fundRequestApi = {
    create: async (data: CreateFundRequestPayload) => {
        const res = await api.post<ApiResponse<FundRequest>>('/fund-requests', data);
        return res.data;
    },
    getAll: async () => {
        const res = await api.get<ApiResponse<FundRequest[]>>('/fund-requests');
        return res.data;
    },
    getById: async (id: number) => {
        const res = await api.get<ApiResponse<FundRequest>>(`/fund-requests/${id}`);
        return res.data;
    },
    update: async (id: number, data: Partial<Pick<FundRequest, 'description' | 'amount' | 'request_date'>>) => {
        const res = await api.patch<ApiResponse<FundRequest>>(`/fund-requests/${id}`, data);
        return res.data;
    },
    approve: async (id: number) => {
        const res = await api.post<ApiResponse<FundRequest>>(`/fund-requests/${id}/approve`);
        return res.data;
    },
    delete: async (id: number) => {
        const res = await api.delete<ApiResponse<null>>(`/fund-requests/${id}`);
        return res.data;
    },
    close: async (id: number) => {
        const res = await api.post<ApiResponse<any>>(`/fund-requests/${id}/close`);
        return res.data;
    },
    getSummary: async (id: number) => {
        const res = await api.get<ApiResponse<any>>(`/fund-requests/${id}/summary`);
        return res.data;
    },
};

// ─── Transactions API ─────────────────────────────────────────────────────────
export const transactionApi = {
    create: async (data: CreateTransactionPayload) => {
        const res = await api.post<ApiResponse<Transaction>>('/transactions', data);
        return res.data;
    },
    getAll: async (params?: { fund_request_id?: number; date_from?: string; date_to?: string }) => {
        const res = await api.get<ApiResponse<Transaction[]>>('/transactions', { params });
        return res.data;
    },
    delete: async (id: number) => {
        const res = await api.delete<ApiResponse<null>>(`/transactions/${id}`);
        return res.data;
    },
    update: async (id: number, data: Partial<Pick<Transaction, 'description' | 'category' | 'amount' | 'transaction_date'>>) => {
        const res = await api.patch<ApiResponse<Transaction>>(`/transactions/${id}`, data);
        return res.data;
    },
};

// ─── Reports API ──────────────────────────────────────────────────────────────
export const reportApi = {
    getSummary: async (date_from: string, date_to: string) => {
        const res = await api.get<ApiResponse<ReportSummary>>('/reports/summary', {
            params: { date_from, date_to },
        });
        return res.data;
    },
    getBalance: async () => {
        const res = await api.get<ApiResponse<BalanceSummary>>('/reports/balance');
        return res.data;
    },
};
