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
    const [isFirstUser, setIsFirstUser] = useState(false);

    // Cek apakah ini user pertama (belum ada tenant)
    useEffect(() => {
        departmentsApi.getAll().then(res => {
            if (res.success && res.data && res.data.length > 0) {
                setDepts(res.data.map((d: Department) => d.name));
                setIsFirstUser(false);
            }
        }).catch(() => {
            // API error = kemungkinan belum ada tenant → ini user pertama (admin)
            setIsFirstUser(true);
        });
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
            let response;
            if (isFirstUser) {
                // Registrasi pertama → buat tenant + admin
                response = await authApi.registerOwner({
                    tenant_name: 'Perusahaan',
                    admin_name: fullName,
                    email,
                    password,
                    department,
                });
            } else {
                // Registrasi biasa → join tenant yang ada
                response = await authApi.registerUser({ full_name: fullName, email, password, department });
            }

            if (response.success && response.data) {
                await login(response.data.token, response.data.user);
            } else {
                Alert.alert('Gagal', response.error || 'Terjadi kesalahan');
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Coba lagi nanti';
            // Jika registerUser gagal karena belum ada tenant, coba registerOwner
            if (msg.includes('belum diinisialisasi') || error.response?.status === 400) {
                try {
                    const ownerRes = await authApi.registerOwner({
                        tenant_name: 'Perusahaan',
                        admin_name: fullName,
                        email,
                        password,
                        department,
                    });
                    if (ownerRes.success && ownerRes.data) {
                        await login(ownerRes.data.token, ownerRes.data.user);
                        return;
                    }
                } catch { /* fallthrough */ }
            }
            Alert.alert('Gagal', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <StatusBar style="dark" />
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <View className="flex-1 bg-white px-6 justify-center py-10">

                    {/* Header */}
                    <View className="mb-8">
                        <Text className="text-3xl font-bold text-gray-900 mb-1">Buat Akun</Text>
                        <Text className="text-gray-500 text-base">
                            {isFirstUser
                                ? 'Akun pertama akan menjadi Administrator'
                                : 'Daftar untuk mulai menggunakan FundRequest'}
                        </Text>
                    </View>

                    {/* First user badge */}
                    {isFirstUser && (
                        <View style={{ backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                            <Text style={{ color: '#92400E', fontSize: 13, fontWeight: '600' }}>
                                👑 Anda akan menjadi Admin pertama
                            </Text>
                        </View>
                    )}

                    {/* Form */}
                    <View>
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
                                    <Text style={{ color: '#2563EB', fontSize: 13 }}>{showPass ? 'Sembunyikan' : 'Tampilkan'}</Text>
                                </TouchableOpacity>
                            }
                        />

                        {/* Pilih Departemen */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: '#374151', fontWeight: '600', fontSize: 13, marginBottom: 6 }}>Departemen</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {depts.map(dept => (
                                    <TouchableOpacity
                                        key={dept}
                                        onPress={() => setDepartment(dept)}
                                        style={{
                                            paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
                                            borderWidth: 1.5,
                                            backgroundColor: department === dept ? '#2563EB' : '#fff',
                                            borderColor: department === dept ? '#2563EB' : '#E5E7EB',
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: 13, fontWeight: '600',
                                            color: department === dept ? '#fff' : '#6B7280',
                                        }}>
                                            {dept}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {errors.department && (
                                <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{errors.department}</Text>
                            )}
                        </View>

                        <Button variant="primary" size="lg" onPress={handleRegister} loading={loading} className="w-full mt-2">
                            {isFirstUser ? 'Buat Akun Admin' : 'Daftar Sekarang'}
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
