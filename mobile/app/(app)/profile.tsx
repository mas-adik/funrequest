import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/useAuth';
import { userApi, departmentsApi } from '@/lib/api';
import type { Department } from '@/types';

const DEPT_FALLBACK = ['Sales', 'Quality', 'HRD', 'Produksi'];

// Defined outside component to prevent re-creation on each render (keyboard dismiss bug)
const Field = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, error }: any) => (
    <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#D1D5DB"
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            style={{
                borderWidth: 1.5, borderColor: error ? '#DC2626' : '#E5E7EB',
                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
            }}
        />
        {error && <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{error}</Text>}
    </View>
);

export default function ProfileScreen() {
    const { user, login, logout } = useAuth();

    const [depts, setDepts] = useState<string[]>(DEPT_FALLBACK);
    const [showEdit, setShowEdit] = useState(false);
    const [showChangePass, setShowChangePass] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ icon: string; title: string; message: string } | null>(null);
    const showToast = useCallback((icon: string, title: string, message: string) => {
        setToast({ icon, title, message });
        setTimeout(() => setToast(null), 2000);
    }, []);

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

        loadUsers();

        userApi.heartbeat().catch(() => {});
        const heartbeatInterval = setInterval(() => {
            userApi.heartbeat().catch(() => {});
        }, 60000);
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
        return diff < 5 * 60 * 1000;
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const res = await userApi.updateMe({ full_name: fullName, department, phone });
            if (res.success && res.data) {
                const token = await import('expo-secure-store').then(ss => ss.getItemAsync('auth_token'));
                if (token) await login(token, res.data as any);
                setShowEdit(false);
                showToast('✅', 'Berhasil', 'Profil berhasil diperbarui');
            } else {
                showToast('❌', 'Gagal', res.error || 'Terjadi kesalahan');
            }
        } catch (e: any) {
            showToast('❌', 'Gagal', e.response?.data?.error || 'Coba lagi nanti');
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
                showToast('✅', 'Berhasil', 'Password berhasil diubah');
            } else {
                showToast('❌', 'Gagal', res.error || 'Terjadi kesalahan');
            }
        } catch (e: any) {
            showToast('❌', 'Gagal', e.response?.data?.error || 'Coba lagi nanti');
        } finally { setChangingPass(false); }
    };

    const initials = (user?.full_name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <StatusBar style="light" />
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

                {/* ── Header ── */}
                <View style={{
                    backgroundColor: '#1D4ED8', paddingTop: 40, paddingBottom: 32,
                    borderBottomLeftRadius: 32, borderBottomRightRadius: 32, alignItems: 'center',
                }}>
                    <View style={{
                        width: 80, height: 80, borderRadius: 40,
                        backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
                        borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
                    }}>
                        <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff' }}>{initials}</Text>
                    </View>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 12 }}>{user?.full_name}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>{user?.email}</Text>
                    <View style={{ marginTop: 10, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
                            {user?.role === 'ADMIN' ? '👑 Administrator' : '👤 Staff'}
                        </Text>
                    </View>
                </View>

                {/* ── Info ── */}
                <View style={{ paddingHorizontal: 16, marginTop: -16 }}>
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 16, padding: 20,
                        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
                    }}>
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
                                    <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</Text>
                                    <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: '600', marginTop: 2 }}>{item.value || '—'}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Menu ── */}
                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
                        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
                    }}>
                        {[
                            { icon: '✏️', label: 'Edit Profil', color: '#374151', bg: '#EFF6FF', onPress: () => { setFullName(user?.full_name || ''); setDept(user?.department || ''); setPhone(user?.phone || ''); setShowEdit(true); } },
                            { icon: '🔒', label: 'Ganti Password', color: '#374151', bg: '#FEF3C7', onPress: () => { setPassErrors({}); setCurrentPass(''); setNewPass(''); setConfirmPass(''); setShowChangePass(true); } },
                            { icon: '🚪', label: 'Keluar', color: '#DC2626', bg: '#FEE2E2', onPress: () => setShowLogoutConfirm(true) },
                        ].map((item, idx) => (
                            <TouchableOpacity key={idx} onPress={item.onPress} activeOpacity={0.7}
                                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: idx < 2 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                                <View style={{ width: 36, height: 36, borderRadius: 10, marginRight: 14, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                                </View>
                                <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: item.color }}>{item.label}</Text>
                                <Text style={{ fontSize: 16, color: '#D1D5DB' }}>›</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── Tim (Admin only) ── */}
                {user?.role === 'ADMIN' && <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 16, padding: 16,
                        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                            <Text style={{ fontSize: 16, marginRight: 8 }}>👥</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', flex: 1 }}>Tim</Text>
                            <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>{allUsers.length} user</Text>
                            </View>
                        </View>
                        {allUsers.map((u, idx) => {
                            const online = isOnline(u.last_active);
                            const uInitials = (u.full_name || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                            const isMe = u.id === user?.id;
                            return (
                                <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: '#F3F4F6' }}>
                                    <View style={{ marginRight: 12 }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isMe ? '#1D4ED8' : '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: isMe ? '#fff' : '#6B7280' }}>{uInitials}</Text>
                                        </View>
                                        <View style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: online ? '#22C55E' : '#D1D5DB', borderWidth: 2, borderColor: '#fff' }} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }} numberOfLines={1}>{u.full_name}</Text>
                                            {u.role === 'ADMIN' && <Text style={{ fontSize: 9, marginLeft: 6 }}>👑</Text>}
                                            {isMe && (
                                                <View style={{ marginLeft: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                                                    <Text style={{ fontSize: 8, color: '#1D4ED8', fontWeight: '700' }}>Anda</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }} numberOfLines={1}>{u.email}</Text>
                                    </View>
                                    {u.department && (
                                        <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                            <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600' }}>{u.department}</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                        {allUsers.length === 0 && (
                            <Text style={{ textAlign: 'center', color: '#D1D5DB', fontSize: 12, paddingVertical: 16 }}>Belum ada user terdaftar</Text>
                        )}
                    </View>
                </View>}

                <Text style={{ textAlign: 'center', color: '#D1D5DB', fontSize: 11, marginTop: 24 }}>FundRequest v1.0.1</Text>
            </ScrollView>

            {/* ══ Edit Profil — centered dialog ══ */}
            <Modal visible={showEdit} transparent animationType="fade" onRequestClose={() => setShowEdit(false)}>
                <TouchableOpacity activeOpacity={1} onPress={() => setShowEdit(false)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 24 }}
                        onStartShouldSetResponder={() => true}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Edit Profil</Text>
                            <TouchableOpacity onPress={() => setShowEdit(false)}
                                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 14, color: '#9CA3AF', fontWeight: '600' }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
                            <Field label="Nama Lengkap" value={fullName} onChangeText={setFullName} placeholder="Nama lengkap" />
                            <Field label="Departemen" value={department} onChangeText={setDept} placeholder="Nama departemen" />
                            <Field label="No. Telepon" value={phone} onChangeText={setPhone} placeholder="08xx-xxxx-xxxx" keyboardType="phone-pad" />
                            <TouchableOpacity onPress={handleSaveProfile} disabled={saving}
                                style={{ backgroundColor: '#1D4ED8', borderRadius: 14, paddingVertical: 15, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
                                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{saving ? 'Menyimpan...' : 'Simpan'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ══ Ganti Password — centered dialog ══ */}
            <Modal visible={showChangePass} transparent animationType="fade" onRequestClose={() => setShowChangePass(false)}>
                <TouchableOpacity activeOpacity={1} onPress={() => setShowChangePass(false)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 24 }}
                        onStartShouldSetResponder={() => true}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Ganti Password</Text>
                            <TouchableOpacity onPress={() => setShowChangePass(false)}
                                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 14, color: '#9CA3AF', fontWeight: '600' }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
                            <Field label="Password Saat Ini" value={currentPass} onChangeText={setCurrentPass} secureTextEntry placeholder="Masukkan password sekarang" error={passErrors.currentPass} />
                            <Field label="Password Baru" value={newPass} onChangeText={setNewPass} secureTextEntry placeholder="Minimal 6 karakter" error={passErrors.newPass} />
                            <Field label="Konfirmasi" value={confirmPass} onChangeText={setConfirmPass} secureTextEntry placeholder="Ulangi password baru" error={passErrors.confirmPass} />
                            <TouchableOpacity onPress={handleChangePassword} disabled={changingPass}
                                style={{ backgroundColor: '#1D4ED8', borderRadius: 14, paddingVertical: 15, alignItems: 'center', opacity: changingPass ? 0.6 : 1 }}>
                                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{changingPass ? 'Memproses...' : 'Ganti Password'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ══ Logout Confirmation ══ */}
            <Modal visible={showLogoutConfirm} transparent animationType="fade" onRequestClose={() => setShowLogoutConfirm(false)}>
                <TouchableOpacity activeOpacity={1} onPress={() => setShowLogoutConfirm(false)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 300, alignItems: 'center' }}
                        onStartShouldSetResponder={() => true}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>🚪</Text>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 }}>Keluar?</Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                            Anda akan keluar dari aplikasi FundRequest
                        </Text>
                        <TouchableOpacity onPress={() => { setShowLogoutConfirm(false); logout(); }}
                            style={{ backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Ya, Keluar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowLogoutConfirm(false)} style={{ paddingVertical: 10 }}>
                            <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '600' }}>Batal</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ══ Toast ══ */}
            <Modal visible={!!toast} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 20, padding: 28,
                        width: '100%', maxWidth: 260, alignItems: 'center',
                        elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20,
                    }}>
                        <Text style={{ fontSize: 36, marginBottom: 8 }}>{toast?.icon}</Text>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>{toast?.title}</Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>{toast?.message}</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
