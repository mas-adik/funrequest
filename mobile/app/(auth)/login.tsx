import React, { useState } from 'react';
import {
    View, Text, ScrollView, KeyboardAvoidingView,
    Platform, Alert, TouchableOpacity,
} from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { authApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const handleLogin = async () => {
        setErrors({});
        const newErrors: typeof errors = {};
        if (!email) newErrors.email = 'Email wajib diisi';
        if (!password) newErrors.password = 'Password wajib diisi';
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

        setLoading(true);
        try {
            const response = await authApi.login({ email, password });
            if (response.success && response.data) {
                await login(response.data.token, response.data.user);
            } else {
                Alert.alert('Login Gagal', response.error || 'Terjadi kesalahan');
            }
        } catch (error: any) {
            Alert.alert('Login Gagal', error.response?.data?.error || 'Coba lagi nanti');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <StatusBar style="dark" />
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <View className="flex-1 bg-surface px-6 justify-center py-10">

                    {/* Header */}
                    <View className="mb-10">
                        <View className="w-16 h-16 bg-primary-600 rounded-2xl items-center justify-center mb-4">
                            <Text style={{ fontSize: 32 }}>💼</Text>
                        </View>
                        <Text className="text-3xl font-bold text-gray-900 mb-1">Selamat Datang</Text>
                        <Text className="text-gray-500 text-base">Masuk ke akun FundRequest Anda</Text>
                    </View>

                    {/* Card Form */}
                    <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <Input
                            label="Email"
                            placeholder="nama@perusahaan.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            error={errors.email}
                        />
                        <Input
                            label="Password"
                            placeholder="Masukkan password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPass}
                            error={errors.password}
                            rightElement={
                                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                                    <Text className="text-primary-600 text-sm">{showPass ? 'Sembunyikan' : 'Tampilkan'}</Text>
                                </TouchableOpacity>
                            }
                        />

                        {/* Lupa Password */}
                        <TouchableOpacity className="self-end mb-4 -mt-2">
                            <Link href="/(auth)/forgot-password">
                                <Text className="text-primary-600 text-sm font-semibold">Lupa Password?</Text>
                            </Link>
                        </TouchableOpacity>

                        <Button variant="primary" size="lg" onPress={handleLogin} loading={loading} className="w-full">
                            Masuk
                        </Button>
                    </View>

                    {/* Register Link */}
                    <View className="items-center mt-6">
                        <Text className="text-gray-500">
                            Belum punya akun?{' '}
                            <Link href="/(auth)/register" className="text-primary-600 font-semibold">
                                Daftar Sekarang
                            </Link>
                        </Text>
                    </View>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
