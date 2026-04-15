import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, Alert, TouchableOpacity,
    Modal, RefreshControl, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { CurrencyInput } from '@/components/CurrencyInput';
import { SummaryCard } from '@/components/SummaryCard';
import { TransactionCard } from '@/components/TransactionCard';
import { transactionApi, reportApi, fundRequestApi } from '@/lib/api';
import type { Transaction, BalanceSummary, FundRequest, TransactionType } from '@/types';

function todayISO() { return new Date().toISOString().split('T')[0]; }

const CATEGORIES_OUT = ['Transport', 'Konsumsi', 'ATK', 'Kebersihan', 'Lain-lain'];
const CATEGORIES_IN  = ['Kembalian', 'Pendapatan Lain', 'Transfer Tambahan'];

export default function TransaksiScreen() {
    const [balance, setBalance] = useState<BalanceSummary | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
    const [selectedFR, setSelectedFR] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [txType, setTxType] = useState<TransactionType>('OUT');

    // Form state
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(0);
    const [txDate, setTxDate] = useState(todayISO());
    const [submitting, setSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const loadData = useCallback(async () => {
        try {
            const [balRes, txRes, frRes] = await Promise.all([
                reportApi.getBalance(),
                transactionApi.getAll(),
                fundRequestApi.getAll(),
            ]);
            if (balRes.success && balRes.data) setBalance(balRes.data);
            if (txRes.success && txRes.data)  setTransactions(txRes.data);
            if (frRes.success && frRes.data)  setFundRequests(frRes.data);
        } catch {/* silent */} finally { setLoading(false); }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    useEffect(() => { loadData(); }, [loadData]);

    const openForm = (type: TransactionType) => {
        setTxType(type);
        setCategory('');
        setDescription('');
        setAmount(0);
        setTxDate(todayISO());
        setFormErrors({});
        // Auto-pilih fund request terbaru/aktif
        const activeFR = balance?.fund_request;
        setSelectedFR(activeFR ? activeFR.id : null);
        setShowForm(true);
    };

    const handleSubmit = async () => {
        setFormErrors({});
        const errs: Record<string, string> = {};
        if (!category) errs.category = 'Pilih kategori';
        if (!amount || amount <= 0) errs.amount = 'Nominal harus lebih dari 0';
        if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

        setSubmitting(true);
        try {
            const res = await transactionApi.create({
                fund_request_id: selectedFR,
                type: txType,
                category,
                description,
                amount,
                transaction_date: txDate,
            });
            if (res.success) {
                setShowForm(false);
                await loadData();
            } else {
                Alert.alert('Gagal', res.error || 'Terjadi kesalahan');
            }
        } catch (e: any) {
            Alert.alert('Gagal', e.response?.data?.error || 'Coba lagi nanti');
        } finally { setSubmitting(false); }
    };

    const handleDelete = async (id: number) => {
        Alert.alert('Hapus Transaksi?', 'Tindakan ini tidak bisa dibatalkan.', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Hapus', style: 'destructive', onPress: async () => {
                    try {
                        await transactionApi.delete(id);
                        await loadData();
                    } catch { Alert.alert('Gagal', 'Tidak bisa menghapus transaksi'); }
                }
            }
        ]);
    };

    const categories = txType === 'OUT' ? CATEGORIES_OUT : CATEGORIES_IN;

    if (loading) {
        return (
            <View className="flex-1 bg-surface items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-surface">
            <StatusBar style="light" />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Kartu Ringkasan Saldo */}
                {balance ? (
                    <SummaryCard
                        initialBalance={balance.initial_balance}
                        totalExpense={balance.total_expense}
                        totalIncome={balance.total_income}
                        remainingBalance={balance.remaining_balance}
                    />
                ) : (
                    <View className="bg-warning-50 border border-warning-200 rounded-2xl p-4 mb-4">
                        <Text className="text-warning-700 text-sm font-semibold text-center">
                            ⚠️ Belum ada Fund Request aktif.{'\n'}Buat Fund Request terlebih dahulu.
                        </Text>
                    </View>
                )}

                {/* Tombol Tambah */}
                <View className="flex-row gap-3 mb-5">
                    <Button variant="danger" size="md" onPress={() => openForm('OUT')} className="flex-1">
                        − Pengeluaran
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        onPress={() => openForm('IN')}
                        className="flex-1"
                        style={{ backgroundColor: '#059669' }}
                    >
                        + Pemasukan
                    </Button>
                </View>

                {/* Daftar Transaksi */}
                <Text className="text-gray-700 font-bold text-base mb-3">Semua Transaksi</Text>
                {transactions.length === 0 ? (
                    <View className="items-center py-10">
                        <Text style={{ fontSize: 48 }}>💸</Text>
                        <Text className="text-gray-500 mt-3">Belum ada transaksi</Text>
                    </View>
                ) : (
                    transactions.map(tx => (
                        <TransactionCard
                            key={tx.id}
                            transaction={tx}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </ScrollView>

            {/* Modal Tambah Transaksi */}
            <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
                <ScrollView
                    className="flex-1 bg-white"
                    contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-gray-900">
                            {txType === 'OUT' ? '💸 Catat Pengeluaran' : '💰 Catat Pemasukan'}
                        </Text>
                        <TouchableOpacity onPress={() => setShowForm(false)}>
                            <Text className="text-gray-400 text-2xl">✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Pilih Fund Request */}
                    {fundRequests.length > 0 && (
                        <View className="mb-4">
                            <Text className="text-gray-700 font-semibold text-sm mb-1.5">Terhubung ke Fund Request</Text>
                            {fundRequests.slice(0, 3).map(fr => (
                                <TouchableOpacity
                                    key={fr.id}
                                    onPress={() => setSelectedFR(selectedFR === fr.id ? null : fr.id)}
                                    className={`p-3 rounded-xl border mb-2 ${selectedFR === fr.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'}`}
                                >
                                    <Text className={`text-sm font-semibold ${selectedFR === fr.id ? 'text-primary-700' : 'text-gray-700'}`}>
                                        FR #{fr.id} — Rp {fr.amount.toLocaleString('id-ID')}
                                    </Text>
                                    <Text className="text-gray-400 text-xs">{fr.description}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Pilih Kategori */}
                    <View className="mb-4">
                        <Text className="text-gray-700 font-semibold text-sm mb-1.5">Kategori</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => setCategory(cat)}
                                    className={`px-4 py-2 rounded-xl border ${category === cat
                                        ? (txType === 'OUT' ? 'bg-danger-600 border-danger-600' : 'bg-success-600 border-success-600')
                                        : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`text-sm font-semibold ${category === cat ? 'text-white' : 'text-gray-600'}`}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {formErrors.category && (
                            <Text className="text-danger-600 text-xs mt-1">{formErrors.category}</Text>
                        )}
                    </View>

                    <Input
                        label="Keterangan (opsional)"
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Detail pengeluaran..."
                    />
                    <Input
                        label="Tanggal"
                        value={txDate}
                        onChangeText={setTxDate}
                        placeholder="YYYY-MM-DD"
                    />
                    <CurrencyInput
                        label="Nominal"
                        value={amount}
                        onChangeValue={setAmount}
                        error={formErrors.amount}
                    />

                    <Button
                        variant={txType === 'OUT' ? 'danger' : 'primary'}
                        size="lg"
                        onPress={handleSubmit}
                        loading={submitting}
                        className="w-full mt-2"
                        style={txType === 'IN' ? { backgroundColor: '#059669' } : {}}
                    >
                        Simpan Transaksi
                    </Button>
                    <Button variant="ghost" size="md" onPress={() => setShowForm(false)} className="w-full mt-2">
                        Batal
                    </Button>
                </ScrollView>
            </Modal>
        </View>
    );
}
