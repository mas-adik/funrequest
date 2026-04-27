import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, KeyboardAvoidingView,
    Platform, Alert, TouchableOpacity, TextInput,
} from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { authApi, departmentsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Department } from '@/types';

const DEPT_SUGGESTIONS = ['Sales', 'Quality', 'HRD', 'Produksi'];

export default function RegisterScreen() {
    const { login } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [department, setDepartment] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [depts, setDepts] = useState<string[]>(DEPT_SUGGESTIONS);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isFirstUser, setIsFirstUser] = useState(false);

    useEffect(() => {
        departmentsApi.getAll().then(res => {
            if (res.success && res.data && res.data.length > 0) {
                setDepts(res.data.map((d: Department) => d.name));
                setIsFirstUser(false);
            }
        }).catch(() => {
            setIsFirstUser(true);
        });
    }, []);

    const handleRegister = async () => {
        setErrors({});
        const newErrors: Record<string, string> = {};
        if (!fullName) newErrors.fullName = 'Nama lengkap wajib diisi';
        if (!email) newErrors.email = 'Email wajib diisi';
        if (!password || password.length < 6) newErrors.password = 'Password minimal 6 karakter';
        if (!department.trim()) newErrors.department = 'Departemen wajib diisi';
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

        setLoading(true);
        try {
            let response;
            if (isFirstUser) {
                response = await authApi.registerOwner({
                    tenant_name: 'Perusahaan',
                    admin_name: fullName,
                    email,
                    password,
                    department: department.trim(),
                });
            } else {
                response = await authApi.registerUser({ full_name: fullName, email, password, department: department.trim() });
            }

            if (response.success && response.data) {
                await login(response.data.token, response.data.user);
            } else {
                Alert.alert('Gagal', response.error || 'Terjadi kesalahan');
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Coba lagi nanti';
            if (msg.includes('belum diinisialisasi') || error.response?.status === 400) {
                try {
                    const ownerRes = await authApi.registerOwner({
                        tenant_name: 'Perusahaan',
                        admin_name: fullName,
                        email,
                        password,
                        department: department.trim(),
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

    const InputField = ({ label, value, onChangeText, placeholder, error, keyboardType, autoCapitalize, secureTextEntry, rightElement }: any) => (
        <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>{label}</Text>
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                borderWidth: 1.5, borderColor: error ? '#DC2626' : '#E5E7EB',
                borderRadius: 12, backgroundColor: '#F9FAFB',
            }}>
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#D1D5DB"
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    secureTextEntry={secureTextEntry}
                    style={{
                        flex: 1, paddingHorizontal: 16, paddingVertical: 14,
                        fontSize: 15, color: '#111827',
                    }}
                />
                {rightElement}
            </View>
            {error && <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{error}</Text>}
        </View>
    );

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <StatusBar style="dark" />
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <View style={{ flex: 1, backgroundColor: '#fff', paddingHorizontal: 28, justifyContent: 'center', paddingVertical: 40 }}>

                    {/* Logo & Title */}
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        <View style={{
                            width: 56, height: 56, borderRadius: 16, backgroundColor: '#1D4ED8',
                            alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                        }}>
                            <Text style={{ fontSize: 22, color: '#fff', fontWeight: '800' }}>FR</Text>
                        </View>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Buat Akun</Text>
                    </View>

                    {/* First user badge */}
                    {isFirstUser && (
                        <View style={{
                            backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
                            borderRadius: 12, padding: 12, marginBottom: 20,
                            flexDirection: 'row', alignItems: 'center',
                        }}>
                            <Text style={{ fontSize: 16, marginRight: 8 }}>👑</Text>
                            <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '600', flex: 1 }}>
                                Anda akan menjadi Admin pertama
                            </Text>
                        </View>
                    )}

                    {/* Form */}
                    <InputField label="Nama Lengkap" value={fullName} onChangeText={setFullName} placeholder="Masukkan nama lengkap" error={errors.fullName} />
                    <InputField label="Email" value={email} onChangeText={setEmail} placeholder="nama@perusahaan.com" keyboardType="email-address" autoCapitalize="none" error={errors.email} />
                    <InputField
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Minimal 6 karakter"
                        secureTextEntry={!showPass}
                        error={errors.password}
                        rightElement={
                            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ paddingRight: 16 }}>
                                <Text style={{ color: '#1D4ED8', fontSize: 12, fontWeight: '600' }}>
                                    {showPass ? 'Sembunyikan' : 'Tampilkan'}
                                </Text>
                            </TouchableOpacity>
                        }
                    />

                    {/* Departemen — free text + suggestion chips */}
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Departemen</Text>
                        <TextInput
                            value={department}
                            onChangeText={setDepartment}
                            placeholder="Ketik atau pilih departemen"
                            placeholderTextColor="#D1D5DB"
                            style={{
                                borderWidth: 1.5, borderColor: errors.department ? '#DC2626' : '#E5E7EB',
                                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                                fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
                            }}
                        />
                        {errors.department && <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{errors.department}</Text>}

                        {/* Quick select chips */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {depts.map(d => (
                                    <TouchableOpacity
                                        key={d}
                                        onPress={() => setDepartment(d)}
                                        style={{
                                            paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                                            borderWidth: 1.5,
                                            backgroundColor: department === d ? '#1D4ED8' : '#fff',
                                            borderColor: department === d ? '#1D4ED8' : '#E5E7EB',
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: 12, fontWeight: '600',
                                            color: department === d ? '#fff' : '#6B7280',
                                        }}>{d}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        onPress={handleRegister}
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
                            {loading ? 'Memproses...' : isFirstUser ? 'Buat Akun Admin' : 'Daftar'}
                        </Text>
                    </TouchableOpacity>

                    {/* Login Link */}
                    <View style={{ alignItems: 'center', marginTop: 24 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
                            Sudah punya akun?{' '}
                            <Link href="/(auth)/login" style={{ color: '#1D4ED8', fontWeight: '700' }}>
                                Masuk
                            </Link>
                        </Text>
                    </View>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
