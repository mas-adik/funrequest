import React, { useState } from 'react';
import {
    View, Text, ScrollView, KeyboardAvoidingView,
    Platform, Alert, TouchableOpacity, TextInput, Image,
} from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <StatusBar style="dark" />
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <View style={{ flex: 1, backgroundColor: '#fff', paddingHorizontal: 28, justifyContent: 'center', paddingVertical: 40 }}>

                    {/* Logo & Title */}
                    <View style={{ alignItems: 'center', marginBottom: 40 }}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 16 }}
                            resizeMode="contain"
                        />
                        <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>Selamat Datang</Text>
                        <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 4 }}>Masuk ke akun Anda</Text>
                    </View>

                    {/* Email */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Email</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="nama@perusahaan.com"
                            placeholderTextColor="#D1D5DB"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={{
                                borderWidth: 1.5, borderColor: errors.email ? '#DC2626' : '#E5E7EB',
                                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                                fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
                            }}
                        />
                        {errors.email && <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{errors.email}</Text>}
                    </View>

                    {/* Password */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Password</Text>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            borderWidth: 1.5, borderColor: errors.password ? '#DC2626' : '#E5E7EB',
                            borderRadius: 12, backgroundColor: '#F9FAFB',
                        }}>
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Masukkan password"
                                placeholderTextColor="#D1D5DB"
                                secureTextEntry={!showPass}
                                style={{
                                    flex: 1, paddingHorizontal: 16, paddingVertical: 14,
                                    fontSize: 15, color: '#111827',
                                }}
                            />
                            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ paddingRight: 16 }}>
                                <Text style={{ fontSize: 18 }}>
                                    {showPass ? '🙈' : '👁️'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {errors.password && <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{errors.password}</Text>}
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                        style={{
                            backgroundColor: '#1D4ED8', borderRadius: 14, paddingVertical: 16,
                            alignItems: 'center', opacity: loading ? 0.6 : 1,
                            elevation: 3, shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.25, shadowRadius: 8,
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                            {loading ? 'Memproses...' : 'Masuk'}
                        </Text>
                    </TouchableOpacity>

                    {/* Register Link */}
                    <View style={{ alignItems: 'center', marginTop: 24 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
                            Belum punya akun?{' '}
                            <Link href="/(auth)/register" style={{ color: '#1D4ED8', fontWeight: '700' }}>
                                Daftar
                            </Link>
                        </Text>
                    </View>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
