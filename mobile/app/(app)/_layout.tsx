import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

// Ikon Tab sederhana menggunakan emoji/teks ─ bisa diganti react-native-vector-icons
function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
    return (
        <View className="items-center justify-center pt-1">
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
            <Text
                style={{
                    fontSize: 10,
                    fontWeight: focused ? '700' : '400',
                    color: focused ? '#2563EB' : '#6B7280',
                    marginTop: 2,
                }}
            >
                {label}
            </Text>
        </View>
    );
}

export default function AppLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: '#1D4ED8' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
                tabBarStyle: {
                    height: 70,
                    paddingBottom: 8,
                    paddingTop: 4,
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#9CA3AF',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Fund Request',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="📋" label="Pengajuan" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="transaksi"
                options={{
                    title: 'Transaksi',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="💰" label="Transaksi" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="report"
                options={{
                    title: 'Report / Closing',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="📊" label="Report" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil Saya',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="👤" label="Profil" focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}
