import React, { useState } from 'react';
import {
    View, Text, ScrollView, KeyboardAvoidingView,
    Platform, Alert, TouchableOpacity, TextInput, Image,
} from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { authApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';


export default function RegisterScreen() {
    const { login } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [department, setDepartment] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

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
            const response = await authApi.registerUser({ full_name: fullName, email, password, department: department.trim() });

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
                        <Image
                            source={require('../../assets/logo.png')}
                            style={{ width: 60, height: 60, borderRadius: 16, marginBottom: 14 }}
                            resizeMode="contain"
                        />
                        <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Buat Akun</Text>
                    </View>

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
                                <Text style={{ fontSize: 18 }}>
                                    {showPass ? '🙈' : '👁️'}
                                </Text>
                            </TouchableOpacity>
                        }
                    />

                    {/* Departemen — free text */}
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Departemen</Text>
                        <TextInput
                            value={department}
                            onChangeText={setDepartment}
                            placeholder="Masukkan nama departemen"
                            placeholderTextColor="#D1D5DB"
                            style={{
                                borderWidth: 1.5, borderColor: errors.department ? '#DC2626' : '#E5E7EB',
                                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                                fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
                            }}
                        />
                        {errors.department && <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{errors.department}</Text>}
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
                            {loading ? 'Memproses...' : 'Daftar'}
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
