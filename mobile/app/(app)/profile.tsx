import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, Alert, TouchableOpacity, Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { userApi, departmentsApi } from '@/lib/api';
import type { Department } from '@/types';

const DEPT_FALLBACK = ['Sales', 'Quality', 'HRD', 'Produksi'];

export default function ProfileScreen() {
    const { user, login, logout } = useAuth();

    const [depts, setDepts] = useState<string[]>(DEPT_FALLBACK);
    const [showEdit, setShowEdit] = useState(false);
    const [showChangePass, setShowChangePass] = useState(false);

    // Edit profile state
    const [fullName, setFullName]   = useState(user?.full_name || '');
    const [department, setDept]     = useState(user?.department || '');
    const [phone, setPhone]         = useState(user?.phone || '');
    const [saving, setSaving]       = useState(false);

    // Change password state
    const [currentPass, setCurrentPass]     = useState('');
    const [newPass, setNewPass]             = useState('');
    const [confirmPass, setConfirmPass]     = useState('');
    const [changingPass, setChangingPass]   = useState(false);
    const [passErrors, setPassErrors]       = useState<Record<string, string>>({});

    // Users in tenant
    const [allUsers, setAllUsers] = useState<any[]>([]);

    useEffect(() => {
        departmentsApi.getAll().then(res => {
            if (res.success && res.data && res.data.length > 0) {
                setDepts(res.data.map((d: Department) => d.name));
            }
        }).catch(() => {});

        // Load users
        loadUsers();

        // Heartbeat every 60s
        userApi.heartbeat().catch(() => {});
        const heartbeatInterval = setInterval(() => {
            userApi.heartbeat().catch(() => {});
        }, 60000);

        // Refresh users every 30s
        const usersInterval = setInterval(loadUsers, 30000);

        return () => {
            clearInterval(heartbeatInterval);
            clearInterval(usersInterval);
        };
    }, []);

    const loadUsers = () => {
        userApi.getAll().then(res => {
            if (res.success && res.data) setAllUsers(res.data);
        }).catch(() => {});
    };

    const isOnline = (lastActive: string | null) => {
        if (!lastActive) return false;
        const diff = Date.now() - new Date(lastActive).getTime();
        return diff < 5 * 60 * 1000; // 5 minutes
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const res = await userApi.updateMe({ full_name: fullName, department, phone });
            if (res.success && res.data) {
                const token = await import('expo-secure-store').then(ss => ss.getItemAsync('auth_token'));
                if (token) await login(token, res.data as any);
                setShowEdit(false);
                Alert.alert('Berhasil', 'Profil berhasil diperbarui');
            } else {
                Alert.alert('Gagal', res.error || 'Terjadi kesalahan');
            }
        } catch (e: any) {
            Alert.alert('Gagal', e.response?.data?.error || 'Coba lagi nanti');
        } finally { setSaving(false); }
    };

    const handleChangePassword = async () => {
        setPassErrors({});
        const errs: Record<string, string> = {};
        if (!currentPass) errs.currentPass = 'Wajib diisi';
        if (!newPass || newPass.length < 6) errs.newPass = 'Minimal 6 karakter';
        if (newPass !== confirmPass) errs.confirmPass = 'Password tidak cocok';
        if (Object.keys(errs).length > 0) { setPassErrors(errs); return; }

        setChangingPass(true);
        try {
            const res = await userApi.changePassword({ current_password: currentPass, new_password: newPass });
            if (res.success) {
                setShowChangePass(false);
                setCurrentPass(''); setNewPass(''); setConfirmPass('');
                Alert.alert('Berhasil ✅', 'Password berhasil diubah');
            } else {
                Alert.alert('Gagal', res.error || 'Terjadi kesalahan');
            }
        } catch (e: any) {
            Alert.alert('Gagal', e.response?.data?.error || 'Coba lagi nanti');
        } finally { setChangingPass(false); }
    };

    const handleLogout = () => {
        Alert.alert('Keluar?', 'Anda akan keluar dari aplikasi.', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Keluar', style: 'destructive', onPress: logout },
        ]);
    };

    const initials = (user?.full_name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <StatusBar style="light" />
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

                {/* ── Header Card ── */}
                <View style={{
                    backgroundColor: '#1D4ED8', paddingTop: 40, paddingBottom: 32,
                    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
                    alignItems: 'center',
                }}>
                    {/* Avatar */}
                    <View style={{
                        width: 80, height: 80, borderRadius: 40,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
                    }}>
                        <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff' }}>{initials}</Text>
                    </View>

                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 12 }}>
                        {user?.full_name}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>
                        {user?.email}
                    </Text>

                    {/* Role Badge */}
                    <View style={{
                        marginTop: 10, paddingHorizontal: 14, paddingVertical: 5,
                        backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
                    }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
                            {user?.role === 'ADMIN' ? '👑 Administrator' : '👤 Staff'}
                        </Text>
                    </View>
                </View>

                {/* ── Info Section ── */}
                <View style={{ paddingHorizontal: 16, marginTop: -16 }}>
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 16, padding: 20,
                        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.06, shadowRadius: 8,
                    }}>
                        {/* Info Rows */}
                        {[
                            { icon: '👤', label: 'Nama Lengkap', value: user?.full_name },
                            { icon: '✉️', label: 'Email', value: user?.email },
                            { icon: '🏢', label: 'Departemen', value: user?.department },
                            { icon: '📱', label: 'No. Telepon', value: user?.phone },
                        ].map((item, idx) => (
                            <View key={idx} style={{
                                flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
                                borderBottomWidth: idx < 3 ? 1 : 0, borderBottomColor: '#F3F4F6',
                            }}>
                                <Text style={{ fontSize: 16, marginRight: 12 }}>{item.icon}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        {item.label}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: '600', marginTop: 2 }}>
                                        {item.value || '—'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Menu Section ── */}
                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
                        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.06, shadowRadius: 8,
                    }}>
                        {/* Edit Profil */}
                        <TouchableOpacity
                            onPress={() => { setFullName(user?.full_name || ''); setDept(user?.department || ''); setPhone(user?.phone || ''); setShowEdit(true); }}
                            activeOpacity={0.7}
                            style={{
                                flexDirection: 'row', alignItems: 'center', padding: 16,
                                borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                            }}
                        >
                            <View style={{
                                width: 36, height: 36, borderRadius: 10, marginRight: 14,
                                backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Text style={{ fontSize: 16 }}>✏️</Text>
                            </View>
                            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' }}>Edit Profil</Text>
                            <Text style={{ fontSize: 16, color: '#D1D5DB' }}>›</Text>
                        </TouchableOpacity>

                        {/* Ganti Password */}
                        <TouchableOpacity
                            onPress={() => setShowChangePass(true)}
                            activeOpacity={0.7}
                            style={{
                                flexDirection: 'row', alignItems: 'center', padding: 16,
                                borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                            }}
                        >
                            <View style={{
                                width: 36, height: 36, borderRadius: 10, marginRight: 14,
                                backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Text style={{ fontSize: 16 }}>🔒</Text>
                            </View>
                            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' }}>Ganti Password</Text>
                            <Text style={{ fontSize: 16, color: '#D1D5DB' }}>›</Text>
                        </TouchableOpacity>

                        {/* Keluar */}
                        <TouchableOpacity
                            onPress={handleLogout}
                            activeOpacity={0.7}
                            style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
                        >
                            <View style={{
                                width: 36, height: 36, borderRadius: 10, marginRight: 14,
                                backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Text style={{ fontSize: 16 }}>🚪</Text>
                            </View>
                            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#DC2626' }}>Keluar</Text>
                            <Text style={{ fontSize: 16, color: '#D1D5DB' }}>›</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Users Section ── */}
                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 16, padding: 16,
                        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.06, shadowRadius: 8,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                            <Text style={{ fontSize: 16, marginRight: 8 }}>👥</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', flex: 1 }}>Tim</Text>
                            <View style={{
                                backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
                            }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>
                                    {allUsers.length} user
                                </Text>
                            </View>
                        </View>

                        {allUsers.map((u, idx) => {
                            const online = isOnline(u.last_active);
                            const uInitials = (u.full_name || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                            const isMe = u.id === user?.id;
                            return (
                                <View key={u.id} style={{
                                    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
                                    borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: '#F3F4F6',
                                }}>
                                    {/* Avatar with status dot */}
                                    <View style={{ marginRight: 12 }}>
                                        <View style={{
                                            width: 40, height: 40, borderRadius: 20,
                                            backgroundColor: isMe ? '#1D4ED8' : '#E5E7EB',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: isMe ? '#fff' : '#6B7280' }}>
                                                {uInitials}
                                            </Text>
                                        </View>
                                        {/* Online dot */}
                                        <View style={{
                                            position: 'absolute', bottom: 0, right: 0,
                                            width: 12, height: 12, borderRadius: 6,
                                            backgroundColor: online ? '#22C55E' : '#D1D5DB',
                                            borderWidth: 2, borderColor: '#fff',
                                        }} />
                                    </View>

                                    {/* Info */}
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }} numberOfLines={1}>
                                                {u.full_name}
                                            </Text>
                                            {u.role === 'ADMIN' && (
                                                <Text style={{ fontSize: 9, marginLeft: 6 }}>👑</Text>
                                            )}
                                            {isMe && (
                                                <View style={{
                                                    marginLeft: 6, backgroundColor: '#EFF6FF',
                                                    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6,
                                                }}>
                                                    <Text style={{ fontSize: 8, color: '#1D4ED8', fontWeight: '700' }}>Anda</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }} numberOfLines={1}>
                                            {u.email}
                                        </Text>
                                    </View>

                                    {/* Department badge */}
                                    {u.department && (
                                        <View style={{
                                            backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                                        }}>
                                            <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600' }}>{u.department}</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        {allUsers.length === 0 && (
                            <Text style={{ textAlign: 'center', color: '#D1D5DB', fontSize: 12, paddingVertical: 16 }}>
                                Belum ada user terdaftar
                            </Text>
                        )}
                    </View>
                </View>

                {/* Version */}
                <Text style={{ textAlign: 'center', color: '#D1D5DB', fontSize: 11, marginTop: 24 }}>
                    FundRequest v1.0.0
                </Text>

            </ScrollView>

            {/* ══ Modal Edit Profil ══ */}
            <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet">
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
                        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                    }}>
                        <View>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Edit Profil</Text>
                            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Perbarui data profil Anda</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowEdit(false)}
                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '600' }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                        <Input label="Nama Lengkap" value={fullName} onChangeText={setFullName} placeholder="Nama lengkap Anda" />
                        <Input label="No. Telepon" value={phone} onChangeText={setPhone} placeholder="08xx-xxxx-xxxx" keyboardType="phone-pad" />

                        {/* Pilih Departemen */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Departemen</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {depts.map(d => (
                                    <TouchableOpacity
                                        key={d}
                                        onPress={() => setDept(d)}
                                        style={{
                                            paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                                            borderWidth: 1.5,
                                            backgroundColor: department === d ? '#1D4ED8' : '#fff',
                                            borderColor: department === d ? '#1D4ED8' : '#E5E7EB',
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: 13, fontWeight: '600',
                                            color: department === d ? '#fff' : '#6B7280',
                                        }}>{d}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleSaveProfile}
                            disabled={saving}
                            style={{
                                backgroundColor: '#1D4ED8', borderRadius: 14, paddingVertical: 16,
                                alignItems: 'center', marginTop: 8, opacity: saving ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            {/* ══ Modal Ganti Password ══ */}
            <Modal visible={showChangePass} animationType="slide" presentationStyle="pageSheet">
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
                        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                    }}>
                        <View>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Ganti Password</Text>
                            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Perbarui password Anda</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowChangePass(false)}
                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '600' }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                        <Input label="Password Saat Ini" value={currentPass} onChangeText={setCurrentPass} secureTextEntry placeholder="Masukkan password sekarang" error={passErrors.currentPass} />
                        <Input label="Password Baru" value={newPass} onChangeText={setNewPass} secureTextEntry placeholder="Minimal 6 karakter" error={passErrors.newPass} />
                        <Input label="Konfirmasi Password" value={confirmPass} onChangeText={setConfirmPass} secureTextEntry placeholder="Ulangi password baru" error={passErrors.confirmPass} />

                        <TouchableOpacity
                            onPress={handleChangePassword}
                            disabled={changingPass}
                            style={{
                                backgroundColor: '#1D4ED8', borderRadius: 14, paddingVertical: 16,
                                alignItems: 'center', marginTop: 8, opacity: changingPass ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                {changingPass ? 'Memproses...' : 'Ganti Password'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
