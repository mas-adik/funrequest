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

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const handleLogin = async () => {
        // Reset errors
        setErrors({});

        // Validation
        const newErrors: { email?: string; password?: string } = {};
        if (!email) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.login({ email, password });

            if (response.success && response.data) {
                await login(response.data.token, response.data.user);
            } else {
                Alert.alert('Login Failed', response.error || 'Something went wrong');
            }
        } catch (error: any) {
            const errorMessage =
                error.response?.data?.error || 'Login failed. Please try again.';
            Alert.alert('Login Failed', errorMessage);
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
                <View className="flex-1 bg-white px-6 justify-center">
                    {/* Header */}
                    <View className="mb-8">
                        <Text className="text-4xl font-bold text-sage mb-2">
                            Vibe Starter
                        </Text>
                        <Text className="text-warmGray-600 text-base">
                            Sign in to your account
                        </Text>
                    </View>

                    {/* Form */}
                    <View className="mb-6">
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
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            error={errors.password}
                        />

                        <Button
                            variant="primary"
                            size="lg"
                            onPress={handleLogin}
                            loading={loading}
                            className="mt-2"
                        >
                            Sign In
                        </Button>
                    </View>

                    {/* Register Link */}
                    <View className="items-center">
                        <Text className="text-warmGray-600">
                            Don't have an account?{' '}
                            <Link href="/(auth)/register" className="text-sage font-semibold">
                                Sign Up
                            </Link>
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
