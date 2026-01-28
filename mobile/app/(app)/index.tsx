import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardScreen() {
    const { user, logout } = useAuth();

    return (
        <View className="flex-1 bg-warmGray-50">
            <StatusBar style="light" />
            <ScrollView className="flex-1">
                <View className="p-6">
                    {/* Welcome Card */}
                    <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
                        <Text className="text-2xl font-bold text-warmGray-800 mb-2">
                            Selamat Datang! 🕌
                        </Text>
                        <Text className="text-warmGray-600 text-base mb-1">
                            {user?.full_name}
                        </Text>
                        <Text className="text-warmGray-500 text-sm">
                            {user?.email}
                        </Text>
                        <View className="mt-4 pt-4 border-t border-warmGray-200">
                            <Text className="text-warmGray-600 text-sm">
                                Role: <Text className="font-semibold text-sage">{user?.role}</Text>
                            </Text>
                        </View>
                    </View>

                    {/* Placeholder Cards */}
                    <View className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
                        <Text className="text-lg font-bold text-warmGray-800 mb-2">
                            Dashboard
                        </Text>
                        <Text className="text-warmGray-600">
                            Fitur lengkap akan ditambahkan di Phase 3:
                        </Text>
                        <View className="mt-3 space-y-2">
                            <Text className="text-warmGray-500">• Manajemen Keuangan</Text>
                            <Text className="text-warmGray-500">• Jadwal Kegiatan</Text>
                            <Text className="text-warmGray-500">• Database Ustadz</Text>
                            <Text className="text-warmGray-500">• Inventaris</Text>
                        </View>
                    </View>

                    {/* Logout Button */}
                    <Button
                        variant="outline"
                        size="lg"
                        onPress={logout}
                        className="mt-4"
                    >
                        Logout
                    </Button>
                </View>
            </ScrollView>
        </View>
    );
}
