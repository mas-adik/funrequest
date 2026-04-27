import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', width: 70, paddingTop: 4 }}>
            <Text style={{ fontSize: 18 }}>{icon}</Text>
            <Text
                style={{
                    fontSize: 10,
                    fontWeight: focused ? '700' : '500',
                    color: focused ? '#1D4ED8' : '#9CA3AF',
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
                headerStyle: { backgroundColor: '#1D4ED8', elevation: 0, shadowOpacity: 0 },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '700', fontSize: 17 },
                tabBarStyle: {
                    height: 56,
                    paddingBottom: 4,
                    paddingTop: 0,
                    backgroundColor: '#fff',
                    borderTopWidth: 0.5,
                    borderTopColor: '#E5E7EB',
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -3 },
                    shadowOpacity: 0.06,
                    shadowRadius: 6,
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#1D4ED8',
                tabBarInactiveTintColor: '#9CA3AF',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Fund Request',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="📋" label="FN" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="transaksi"
                options={{
                    title: 'Transaksi',
                    href: null,
                }}
            />
            <Tabs.Screen
                name="report"
                options={{
                    title: 'Laporan',
                    href: null,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="👤" label="Profile" focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}
