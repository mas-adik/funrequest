import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 6 }}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
            <Text
                style={{
                    fontSize: 11,
                    fontWeight: focused ? '700' : '500',
                    color: focused ? '#1D4ED8' : '#9CA3AF',
                    marginTop: 3,
                    letterSpacing: 0.2,
                }}
                numberOfLines={1}
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
                    height: 64,
                    paddingBottom: 6,
                    paddingTop: 2,
                    backgroundColor: '#fff',
                    borderTopWidth: 0.5,
                    borderTopColor: '#E5E7EB',
                    elevation: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
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
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="💰" label="IN-OUT" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="report"
                options={{
                    title: 'Laporan',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="📊" label="Report" focused={focused} />
                    ),
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
