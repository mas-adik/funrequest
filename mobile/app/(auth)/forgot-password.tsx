import React, { useState } from 'react';
import {
    View, Text, ScrollView, KeyboardAvoidingView,
    Platform, Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { authApi } from '@/lib/api';

export default function ForgotPasswordScreen() {
    const router = useRouter();

    // Step 1: input email → kirim OTP
    // Step 2: input OTP + password baru
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSendOTP = async () => {
        setErrors({});
        if (!email) { setErrors({ email: 'Email wajib diisi' }); return; }

        setLoading(true);
        try {
            const res = await authApi.forgotPassword(email);
            if (res.success) {
                // Langsung ke step 2
                setStep(2);
                Alert.alert('OTP Terkirim', 'Masukkan kode OTP 6 digit yang sudah dikirim ke email Anda.\n\n(Mode dev: cek console backend untuk OTP)');
            }
        } catch (error: any) {
            Alert.alert('Gagal', error.response?.data?.error || 'Coba lagi nanti');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setErrors({});
        const newErrors: Record<string, string> = {};
        if (!otp || otp.length !== 6) newErrors.otp = 'Masukkan 6 digit OTP';
        if (!newPassword || newPassword.length < 6) newErrors.newPassword = 'Password minimal 6 karakter';
        if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Konfirmasi password tidak cocok';
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

        setLoading(true);
        try {
            const res = await authApi.resetPassword({ token: otp, email, new_password: newPassword });
            if (res.success) {
                Alert.alert('Berhasil! 🎉', 'Password berhasil direset. Silakan login dengan password baru.', [
                    { text: 'Login', onPress: () => router.replace('/(auth)/login') }
                ]);
            } else {
                Alert.alert('Gagal', res.error || 'OTP tidak valid');
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
                        <View className="w-16 h-16 bg-warning-500 rounded-2xl items-center justify-center mb-4">
                            <Text style={{ fontSize: 32 }}>🔐</Text>
                        </View>
                        <Text className="text-3xl font-bold text-gray-900 mb-1">
                            {step === 1 ? 'Lupa Password?' : 'Reset Password'}
                        </Text>
                        <Text className="text-gray-500 text-base">
                            {step === 1
                                ? 'Masukkan email Anda untuk mendapatkan kode OTP'
                                : `Kode OTP dikirim ke ${email}`}
                        </Text>
                    </View>

                    {/* Form */}
                    <View>
                        {step === 1 ? (
                            <View>
                                <Input
                                    label="Email Terdaftar"
                                    placeholder="nama@perusahaan.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    error={errors.email}
                                />
                                <Button variant="primary" size="lg" onPress={handleSendOTP} loading={loading} className="w-full mt-2">
                                    Kirim Kode OTP
                                </Button>
                            </View>
                        ) : (
                            <View>
                                <Input
                                    label="Kode OTP (6 digit)"
                                    placeholder="123456"
                                    value={otp}
                                    onChangeText={setOtp}
                                    keyboardType="numeric"
                                    maxLength={6}
                                    error={errors.otp}
                                />
                                <Input
                                    label="Password Baru"
                                    placeholder="Minimal 6 karakter"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry
                                    error={errors.newPassword}
                                />
                                <Input
                                    label="Konfirmasi Password Baru"
                                    placeholder="Ulangi password baru"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                    error={errors.confirmPassword}
                                />
                                <Button variant="primary" size="lg" onPress={handleResetPassword} loading={loading} className="w-full mt-2">
                                    Reset Password
                                </Button>
                                <Button variant="ghost" size="md" onPress={() => setStep(1)} className="w-full mt-2">
                                    ← Kirim Ulang OTP
                                </Button>
                            </View>
                        )}
                    </View>

                    {/* Back to Login */}
                    <View className="items-center mt-6">
                        <Link href="/(auth)/login" className="text-primary-600 font-semibold">
                            ← Kembali ke Login
                        </Link>
                    </View>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
