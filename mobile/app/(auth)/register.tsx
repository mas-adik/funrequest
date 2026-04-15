import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, KeyboardAvoidingView,
    Platform, Alert, TouchableOpacity,
} from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { authApi, departmentsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Department } from '@/types';

const DEPT_FALLBACK = ['Sales', 'Quality', 'HRD', 'Produksi'];

export default function RegisterScreen() {
    const { login } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [department, setDepartment] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [depts, setDepts] = useState<string[]>(DEPT_FALLBACK);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Coba ambil departemen dari API (mungkin gagal jika belum ada tenant)
    useEffect(() => {
        departmentsApi.getAll().then(res => {
            if (res.success && res.data && res.data.length > 0) {
                setDepts(res.data.map((d: Department) => d.name));
            }
        }).catch(() => { /* pakai fallback */ });
    }, []);

    const handleRegister = async () => {
        setErrors({});
        const newErrors: Record<string, string> = {};
        if (!fullName) newErrors.fullName = 'Nama lengkap wajib diisi';
        if (!email) newErrors.email = 'Email wajib diisi';
        if (!password || password.length < 6) newErrors.password = 'Password minimal 6 karakter';
        if (!department) newErrors.department = 'Pilih departemen';
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

        setLoading(true);
        try {
            const response = await authApi.registerUser({ full_name: fullName, email, password, department });
            if (response.success && response.data) {
                await login(response.data.token, response.data.user);
            } else {
                Alert.alert('Gagal', response.error || 'Terjadi kesalahan');
            }
        } catch (error: any) {
            Alert.alert('Gagal', error.response?.data?.error || 'Coba lagi nanti');
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
                    <View className="mb-8">
                        <View className="w-16 h-16 bg-primary-600 rounded-2xl items-center justify-center mb-4">
                            <Text style={{ fontSize: 32 }}>👤</Text>
                        </View>
                        <Text className="text-3xl font-bold text-gray-900 mb-1">Buat Akun</Text>
                        <Text className="text-gray-500 text-base">Daftar untuk mulai menggunakan FundRequest</Text>
                    </View>

                    {/* Form Card */}
                    <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <Input
                            label="Nama Lengkap"
                            placeholder="Masukkan nama lengkap"
                            value={fullName}
                            onChangeText={setFullName}
                            error={errors.fullName}
                        />
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
                            placeholder="Minimal 6 karakter"
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

                        {/* Pilih Departemen */}
                        <View className="mb-4">
                            <Text className="text-gray-700 font-semibold text-sm mb-1.5">Departemen</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {depts.map(dept => (
                                    <TouchableOpacity
                                        key={dept}
                                        onPress={() => setDepartment(dept)}
                                        className={`px-4 py-2 rounded-xl border ${department === dept
                                            ? 'bg-primary-600 border-primary-600'
                                            : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`text-sm font-semibold ${department === dept ? 'text-white' : 'text-gray-600'}`}>
                                            {dept}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {errors.department && (
                                <Text className="text-danger-600 text-xs mt-1 ml-1">{errors.department}</Text>
                            )}
                        </View>

                        <Button variant="primary" size="lg" onPress={handleRegister} loading={loading} className="w-full mt-2">
                            Daftar Sekarang
                        </Button>
                    </View>

                    {/* Login Link */}
                    <View className="items-center mt-6">
                        <Text className="text-gray-500">
                            Sudah punya akun?{' '}
                            <Link href="/(auth)/login" className="text-primary-600 font-semibold">
                                Masuk
                            </Link>
                        </Text>
                    </View>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
