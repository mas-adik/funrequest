import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, Alert, TouchableOpacity, Modal, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { userApi, departmentsApi } from '@/lib/api';
import type { Department } from '@/types';

const DEPT_FALLBACK = ['Sales', 'Quality', 'HRD', 'Produksi'];

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <View className="flex-row justify-between py-3 border-b border-gray-100">
            <Text className="text-gray-500 text-sm">{label}</Text>
            <Text className="text-gray-800 font-semibold text-sm">{value || '—'}</Text>
        </View>
    );
}

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

    useEffect(() => {
        departmentsApi.getAll().then(res => {
            if (res.success && res.data && res.data.length > 0) {
                setDepts(res.data.map((d: Department) => d.name));
            }
        }).catch(() => {});
    }, []);

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const res = await userApi.updateMe({ full_name: fullName, department, phone });
            if (res.success && res.data) {
                // Update local user state (re-use login to refresh user data)
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

    return (
        <View className="flex-1 bg-surface">
            <StatusBar style="light" />
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

                {/* Avatar Card */}
                <View className="bg-primary-600 rounded-3xl p-6 mb-4 items-center">
                    <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-3">
                        <Text style={{ fontSize: 40 }}>
                            {user?.role === 'ADMIN' ? '👑' : '👤'}
                        </Text>
                    </View>
                    <Text className="text-white text-xl font-bold">{user?.full_name}</Text>
                    <Text className="text-white opacity-80 text-sm mt-0.5">{user?.email}</Text>
                    <View className="mt-2 px-3 py-1 bg-white bg-opacity-20 rounded-full">
                        <Text className="text-white text-xs font-semibold">
                            {user?.role === 'ADMIN' ? '👑 Administrator' : '👤 Staff'}
                        </Text>
                    </View>
                </View>

                {/* Info Card */}
                <View className="bg-white rounded-2xl px-5 py-2 mb-4 shadow-sm border border-gray-100">
                    <Text className="text-gray-700 font-bold text-sm pt-3 pb-1">Informasi Profil</Text>
                    <InfoRow label="Nama Lengkap" value={user?.full_name} />
                    <InfoRow label="Email" value={user?.email} />
                    <InfoRow label="Departemen" value={user?.department} />
                    <InfoRow label="No. Telepon" value={user?.phone} />
                    <InfoRow label="Role" value={user?.role === 'ADMIN' ? 'Administrator' : 'Staff'} />
                </View>

                {/* Aksi Profil */}
                <View className="gap-3">
                    <Button
                        variant="outline"
                        size="md"
                        onPress={() => { setFullName(user?.full_name || ''); setDept(user?.department || ''); setPhone(user?.phone || ''); setShowEdit(true); }}
                        className="w-full"
                    >
                        ✏️ Edit Profil
                    </Button>
                    <Button
                        variant="outline"
                        size="md"
                        onPress={() => setShowChangePass(true)}
                        className="w-full"
                    >
                        🔒 Ganti Password
                    </Button>
                    <Button variant="danger" size="md" onPress={handleLogout} className="w-full">
                        🚪 Keluar
                    </Button>
                </View>

                {/* Versi */}
                <Text className="text-center text-gray-400 text-xs mt-6">FundRequest v1.0.0</Text>

            </ScrollView>

            {/* Modal Edit Profil */}
            <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet">
                <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-gray-900">Edit Profil</Text>
                        <TouchableOpacity onPress={() => setShowEdit(false)}>
                            <Text className="text-gray-400 text-2xl">✕</Text>
                        </TouchableOpacity>
                    </View>

                    <Input label="Nama Lengkap" value={fullName} onChangeText={setFullName} placeholder="Nama lengkap Anda" />
                    <Input label="No. Telepon" value={phone} onChangeText={setPhone} placeholder="08xx-xxxx-xxxx" keyboardType="phone-pad" />

                    {/* Pilih Departemen */}
                    <View className="mb-4">
                        <Text className="text-gray-700 font-semibold text-sm mb-1.5">Departemen</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {depts.map(d => (
                                <TouchableOpacity
                                    key={d}
                                    onPress={() => setDept(d)}
                                    className={`px-4 py-2 rounded-xl border ${department === d ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`text-sm font-semibold ${department === d ? 'text-white' : 'text-gray-600'}`}>{d}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <Button variant="primary" size="lg" onPress={handleSaveProfile} loading={saving} className="w-full mt-2">
                        Simpan Perubahan
                    </Button>
                    <Button variant="ghost" size="md" onPress={() => setShowEdit(false)} className="w-full mt-2">Batal</Button>
                </ScrollView>
            </Modal>

            {/* Modal Ganti Password */}
            <Modal visible={showChangePass} animationType="slide" presentationStyle="pageSheet">
                <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-gray-900">Ganti Password</Text>
                        <TouchableOpacity onPress={() => setShowChangePass(false)}>
                            <Text className="text-gray-400 text-2xl">✕</Text>
                        </TouchableOpacity>
                    </View>

                    <Input label="Password Saat Ini" value={currentPass} onChangeText={setCurrentPass} secureTextEntry placeholder="Masukkan password sekarang" error={passErrors.currentPass} />
                    <Input label="Password Baru" value={newPass} onChangeText={setNewPass} secureTextEntry placeholder="Minimal 6 karakter" error={passErrors.newPass} />
                    <Input label="Konfirmasi Password Baru" value={confirmPass} onChangeText={setConfirmPass} secureTextEntry placeholder="Ulangi password baru" error={passErrors.confirmPass} />

                    <Button variant="primary" size="lg" onPress={handleChangePassword} loading={changingPass} className="w-full mt-2">
                        Ganti Password
                    </Button>
                    <Button variant="ghost" size="md" onPress={() => setShowChangePass(false)} className="w-full mt-2">Batal</Button>
                </ScrollView>
            </Modal>
        </View>
    );
}
