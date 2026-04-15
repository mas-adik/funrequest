import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types';

interface AuthContextType {
    isLoading: boolean;
    isAuthenticated: boolean;
    user: User | null;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    login: async () => { },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => { checkAuthStatus(); }, []);

    const checkAuthStatus = async () => {
        try {
            const token    = await SecureStore.getItemAsync('auth_token');
            const userData = await SecureStore.getItemAsync('user_data');
            if (token && userData) {
                setUser(JSON.parse(userData) as User);
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        } catch {
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (token: string, userData: User) => {
        await SecureStore.setItemAsync('auth_token', token);
        await SecureStore.setItemAsync('user_data', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('auth_token').catch(() => { });
        await SecureStore.deleteItemAsync('user_data').catch(() => { });
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isLoading, isAuthenticated, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
