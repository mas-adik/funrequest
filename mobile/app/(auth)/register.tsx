import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { authApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterScreen() {
    const { login } = useAuth();
    const [tenantName, setTenantName] = useState('');
    const [adminName, setAdminName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{
        tenantName?: string;
        adminName?: string;
        email?: string;
        password?: string;
    }>({});

    const handleRegister = async () => {
        // Reset errors
        setErrors({});

        // Validation
        const newErrors: any = {};
        if (!tenantName) newErrors.tenantName = 'Organization name is required';
        if (!adminName) newErrors.adminName = 'Admin name is required';
        if (!email) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';
        else if (password.length < 6)
            newErrors.password = 'Password must be at least 6 characters';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.registerOwner({
                tenant_name: tenantName,
                admin_name: adminName,
                email,
                password,
            });

            if (response.success && response.data) {
                await login(response.data.token, response.data.user);
            } else {
                Alert.alert('Registration Failed', response.error || 'Something went wrong');
            }
        } catch (error: any) {
            const errorMessage =
                error.response?.data?.error || 'Registration failed. Please try again.';
            Alert.alert('Registration Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-1 bg-white px-6 justify-center py-8">
                    {/* Header */}
                    <View className="mb-8">
                        <Text className="text-4xl font-bold text-sage mb-2">
                            Get Started
                        </Text>
                        <Text className="text-warmGray-600 text-base">
                            Create your organization account
                        </Text>
                    </View>

                    {/* Form */}
                    <View className="mb-6">
                        <Input
                            label="Organization Name"
                            placeholder="My Company"
                            value={tenantName}
                            onChangeText={setTenantName}
                            error={errors.tenantName}
                        />

                        <Input
                            label="Admin Name"
                            placeholder="John Doe"
                            value={adminName}
                            onChangeText={setAdminName}
                            error={errors.adminName}
                        />

                        <Input
                            label="Email"
                            placeholder="admin@example.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            error={errors.email}
                        />

                        <Input
                            label="Password"
                            placeholder="At least 6 characters"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            error={errors.password}
                        />

                        <Button
                            variant="primary"
                            size="lg"
                            onPress={handleRegister}
                            loading={loading}
                            className="mt-2"
                        >
                            Create Account
                        </Button>
                    </View>

                    {/* Login Link */}
                    <View className="items-center">
                        <Text className="text-warmGray-600">
                            Already have an account?{' '}
                            <Link href="/(auth)/login" className="text-sage font-semibold">
                                Sign In
                            </Link>
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
