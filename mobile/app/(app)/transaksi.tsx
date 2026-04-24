import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    Modal, RefreshControl, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Input } from '@/components/Input';
import { CurrencyInput } from '@/components/CurrencyInput';
import { FormSection } from '@/components/FormSection';
import { transactionApi, reportApi } from '@/lib/api';
import type { Transaction, BalanceSummary, TransactionType } from '@/types';

function todayISO() { return new Date().toISOString().split('T')[0]; }
function formatRupiah(v: number) { return 'Rp ' + v.toLocaleString('id-ID'); }
function formatDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}



export default function TransaksiScreen() {
    const [balance, setBalance] = useState<BalanceSummary | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [txType, setTxType] = useState<TransactionType>('OUT');

    // Toast
    const [toast, setToast] = useState<{ icon: string; title: string; msg: string } | null>(null);
    const showToast = (icon: string, title: string, msg: string) => {
        setToast({ icon, title, msg });
        setTimeout(() => setToast(null), 2500);
    };

    // Delete confirm
    const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Form
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(0);
    const [txDate, setTxDate] = useState(todayISO());
    const [submitting, setSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const loadData = useCallback(async () => {
        try {
            const [balRes, txRes] = await Promise.all([
                reportApi.getBalance(),
                transactionApi.getAll(),
            ]);
            if (balRes.success && balRes.data) setBalance(balRes.data);
            if (txRes.success && txRes.data) {
                const sorted = [...txRes.data].sort((a, b) =>
                    new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
                );
                setTransactions(sorted);
            }
        } catch {/* silent */} finally { setLoading(false); }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    useEffect(() => { loadData(); }, [loadData]);

    const openForm = () => {
        setTxType('OUT');
        setCategory('');
        setDescription('');
        setAmount(0);
        setTxDate(todayISO());
        setFormErrors({});
        setShowForm(true);
    };

    const handleSubmit = async () => {
        setFormErrors({});
        const errs: Record<string, string> = {};
        if (!description.trim()) errs.description = 'Deskripsi wajib diisi';
        if (!amount || amount <= 0) errs.amount = 'Nominal harus lebih dari 0';
        if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

        setSubmitting(true);
        try {
            const res = await transactionApi.create({
                type: 'OUT',
                category: description.trim(),
                description,
                amount,
                transaction_date: txDate,
            });
            if (res.success) {
                setShowForm(false);
                await loadData();
                showToast('✅', 'Berhasil', 'Transaksi berhasil disimpan');
            } else {
                showToast('❌', 'Gagal', res.error || 'Terjadi kesalahan');
            }
        } catch (e: any) {
            showToast('❌', 'Gagal', e.response?.data?.error || 'Coba lagi nanti');
        } finally { setSubmitting(false); }
    };



    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#1D4ED8" />
            </View>
        );
    }

    const saldoAwal = balance?.initial_balance || 0;
    const totalIn = balance?.total_income || 0;
    const totalOut = balance?.total_expense || 0;
    const sisa = balance?.remaining_balance || 0;
    const isPositive = sisa >= 0;

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <StatusBar style="light" />

            {/* Fixed Summary Card */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                <View style={{
                    backgroundColor: '#1D4ED8', borderRadius: 18, padding: 20, marginBottom: 12,
                }}>
                    {/* Sisa Budget */}
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>Sisa Budget</Text>
                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 4 }}>
                        {formatRupiah(Math.abs(sisa))}
                    </Text>
                    {!isPositive && (
                        <Text style={{ color: '#FCA5A5', fontSize: 11, textAlign: 'center', marginTop: 2 }}>⚠ Melebihi budget</Text>
                    )}

                    {/* 3-column stats */}
                    <View style={{ flexDirection: 'row', marginTop: 16, justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' }}>SALDO AWAL</Text>
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2 }}>{formatRupiah(saldoAwal)}</Text>
                        </View>
                        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' }}>MASUK</Text>
                            <Text style={{ color: '#86EFAC', fontSize: 13, fontWeight: '700', marginTop: 2 }}>+{formatRupiah(totalIn)}</Text>
                        </View>
                        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' }}>KELUAR</Text>
                            <Text style={{ color: '#FCA5A5', fontSize: 13, fontWeight: '700', marginTop: 2 }}>-{formatRupiah(totalOut)}</Text>
                        </View>
                    </View>
                </View>

                <Text style={{ color: '#374151', fontWeight: '700', fontSize: 15, marginBottom: 8 }}>Riwayat Transaksi</Text>
            </View>

            {/* Scrollable Transactions */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {transactions.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                        <Text style={{ fontSize: 48 }}>💸</Text>
                        <Text style={{ color: '#9CA3AF', marginTop: 12 }}>Belum ada transaksi</Text>
                    </View>
                ) : (
                    transactions.map(tx => {
                        const isOut = tx.type === 'OUT';
                        return (
                            <View
                                key={tx.id}
                                style={{
                                    backgroundColor: '#fff', borderRadius: 14, padding: 14,
                                    marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6',
                                    flexDirection: 'row', alignItems: 'center',
                                }}
                            >
                                {/* Icon */}
                                <View style={{
                                    width: 38, height: 38, borderRadius: 19, marginRight: 12,
                                    backgroundColor: isOut ? '#FEE2E2' : '#D1FAE5',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Text style={{ fontSize: 16, color: isOut ? '#DC2626' : '#059669' }}>
                                        {isOut ? '↓' : '↑'}
                                    </Text>
                                </View>

                                {/* Info */}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#1F2937', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                                        {tx.category}
                                    </Text>
                                    {tx.description ? (
                                        <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                                            {tx.description}
                                        </Text>
                                    ) : null}
                                    <Text style={{ color: '#D1D5DB', fontSize: 10, marginTop: 2 }}>{formatDate(tx.transaction_date)}</Text>
                                </View>

                                {/* Amount + optional delete */}
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontWeight: '700', fontSize: 13, color: isOut ? '#DC2626' : '#059669' }}>
                                        {isOut ? '−' : '+'} {formatRupiah(tx.amount)}
                                    </Text>
                                    {/* Only show delete for manual OUT transactions, not FR-sourced IN */}
                                    {isOut && (
                                        <TouchableOpacity
                                            onPress={() => setDeleteTx(tx)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            style={{ marginTop: 4 }}
                                        >
                                            <Text style={{ color: '#D1D5DB', fontSize: 10 }}>Hapus</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* FAB — Floating Action Button for Pengeluaran */}
            <TouchableOpacity
                onPress={openForm}
                activeOpacity={0.85}
                style={{
                    position: 'absolute', bottom: 24, right: 20,
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
                    elevation: 6, shadowColor: '#DC2626',
                    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
                }}
            >
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 }}>−</Text>
            </TouchableOpacity>

            {/* ══ Form Pengeluaran ══ */}
            <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
                        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                    }}>
                        <View>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Pengeluaran</Text>
                            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Catat pengeluaran baru</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowForm(false)}
                            style={{
                                width: 32, height: 32, borderRadius: 16,
                                backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '600' }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <FormSection title="Tanggal">
                            <Input
                                value={txDate}
                                onChangeText={setTxDate}
                                placeholder="YYYY-MM-DD"
                                hint="Format: YYYY-MM-DD"
                            />
                        </FormSection>

                        <FormSection title="Deskripsi">
                            <Input
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Keterangan pengeluaran..."
                            />
                            {formErrors.description && (
                                <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{formErrors.description}</Text>
                            )}
                        </FormSection>

                        <FormSection title="Nominal">
                            <CurrencyInput
                                value={amount}
                                onChangeValue={setAmount}
                            />
                            {formErrors.amount && (
                                <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{formErrors.amount}</Text>
                            )}
                        </FormSection>

                        {/* Submit */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={submitting}
                            style={{
                                backgroundColor: '#DC2626',
                                borderRadius: 14, paddingVertical: 16, alignItems: 'center',
                                opacity: submitting ? 0.6 : 1, marginTop: 8,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                {submitting ? 'Memproses...' : 'Simpan Transaksi'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            {/* ══ Delete Confirmation ══ */}
            <Modal visible={!!deleteTx} transparent animationType="fade" onRequestClose={() => setDeleteTx(null)}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setDeleteTx(null)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
                >
                    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320 }}>
                        <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🗑</Text>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 }}>
                            Hapus Transaksi?
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 }}>
                            Data yang sudah dihapus tidak bisa dikembalikan.
                        </Text>
                        <TouchableOpacity
                            disabled={deleting}
                            onPress={async () => {
                                if (!deleteTx) return;
                                setDeleting(true);
                                try {
                                    await transactionApi.delete(deleteTx.id);
                                    setDeleteTx(null);
                                    loadData();
                                    showToast('✅', 'Dihapus', 'Transaksi berhasil dihapus');
                                } catch {
                                    showToast('❌', 'Gagal', 'Tidak bisa menghapus');
                                } finally { setDeleting(false); }
                            }}
                            style={{
                                backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 14,
                                alignItems: 'center', marginBottom: 10, opacity: deleting ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setDeleteTx(null)} style={{ paddingVertical: 12, alignItems: 'center' }}>
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
                        width: '100%', maxWidth: 280, alignItems: 'center',
                        elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.15, shadowRadius: 20,
                    }}>
                        <Text style={{ fontSize: 44, marginBottom: 12 }}>{toast?.icon}</Text>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 }}>{toast?.title}</Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>{toast?.msg}</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
