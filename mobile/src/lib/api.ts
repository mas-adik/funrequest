import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import type { AuthResponse, RegisterOwnerRequest, LoginRequest } from '@/types';

// Get API URL from environment variable
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

// Create Axios instance
export const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Attach token to every request
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error getting token from SecureStore:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle 401 errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Clear token on 401 Unauthorized
            try {
                await SecureStore.deleteItemAsync('auth_token');
                await SecureStore.deleteItemAsync('user_data');
            } catch (e) {
                console.error('Error clearing auth data:', e);
            }
            // The AuthContext will handle the redirect
        }
        return Promise.reject(error);
    }
);

// API functions
export const authApi = {
    /**
     * Register new tenant owner
     */
    registerOwner: async (data: RegisterOwnerRequest) => {
        const response = await api.post<AuthResponse>('/auth/register-owner', data);
        return response.data;
    },

    /**
     * Login with email and password
     */
    login: async (data: LoginRequest) => {
        const response = await api.post<AuthResponse>('/auth/login', data);
        return response.data;
    },
};
