import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, Alert, TouchableOpacity,
    Modal, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { CurrencyInput } from '@/components/CurrencyInput';
import { useAuth } from '@/hooks/useAuth';
import { fundRequestApi } from '@/lib/api';
import type { FundRequest } from '@/types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function formatRupiah(v: number) { return 'Rp ' + v.toLocaleString('id-ID'); }
function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
function todayISO() { return new Date().toISOString().split('T')[0]; }

// ─── Terbilang: Angka ke Huruf Bahasa Indonesia ───────────────────────────────
function terbilang(num: number): string {
    const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan'];
    const belasan = ['Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas',
        'Enam Belas', 'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
    const puluhan = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
        'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh'];

    if (num === 0) return 'Nol';
    if (num < 0)  return 'Minus ' + terbilang(-num);

    let hasil = '';
    if (num >= 1000000000) {
        hasil += terbilang(Math.floor(num / 1000000000)) + ' Miliar ';
        num %= 1000000000;
    }
    if (num >= 1000000) {
        hasil += terbilang(Math.floor(num / 1000000)) + ' Juta ';
        num %= 1000000;
    }
    if (num >= 1000) {
        hasil += (Math.floor(num / 1000) === 1 ? 'Seribu ' : terbilang(Math.floor(num / 1000)) + ' Ribu ');
        num %= 1000;
    }
    if (num >= 100) {
        hasil += (Math.floor(num / 100) === 1 ? 'Seratus ' : satuan[Math.floor(num / 100)] + ' Ratus ');
        num %= 100;
    }
    if (num >= 20) {
        hasil += puluhan[Math.floor(num / 10)] + ' ';
        num %= 10;
    } else if (num >= 10) {
        hasil += belasan[num - 10] + ' ';
        num = 0;
    }
    if (num > 0) hasil += satuan[num] + ' ';
    return hasil.trim() + ' Rupiah';
}

// ─── Nomor Form: FR25/0001 ────────────────────────────────────────────────────
function frNumber(id: number | undefined): string {
    const yr = new Date().getFullYear().toString().slice(2); // '25'
    const seq = String(id || 0).padStart(4, '0');            // '0001'
    return `FR${yr}/${seq}`;
}

export interface FRItem {
    item: string;   // Keterangan item
    qty: string;    // Jumlah/satuan
    amount: number; // Harga
}

function statusBadge(status: string) {
    const map: Record<string, { bg: string; text: string; label: string }> = {
        PENDING:  { bg: 'bg-warning-100', text: 'text-warning-600', label: 'Menunggu' },
        APPROVED: { bg: 'bg-success-100', text: 'text-success-700', label: 'Disetujui' },
        REJECTED: { bg: 'bg-danger-100',  text: 'text-danger-600',  label: 'Ditolak' },
    };
    const s = map[status] || map.PENDING;
    return <View className={`px-3 py-1 rounded-full ${s.bg}`}><Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text></View>;
}

// ─── Template PDF persis sesuai format form asli ──────────────────────────────
const EMPTY_ROWS = 6; // Total baris tabel (termasuk isi)

function generateHTML(fr: {
    fullName: string;
    department: string;
    requestDate: string;
    amount: number;
    id?: number;
    items: FRItem[];
}) {
    const noForm = frNumber(fr.id);
    const tglFormatted = formatDate(fr.requestDate);
    const totalAmount = fr.amount;
    const terbilangText = terbilang(totalAmount);

    // Isi baris tabel: items + baris kosong sampai EMPTY_ROWS
    const rows: FRItem[] = [
        ...fr.items,
        ...Array.from({ length: Math.max(0, EMPTY_ROWS - fr.items.length) }, () => ({ item: '', qty: '', amount: 0 }))
    ];

    const tableRows = rows.map((row, i) => `
        <tr style="height:28px">
            <td style="border:1px solid #999;text-align:center;font-size:12px;width:6%">${row.item ? i + 1 : ''}</td>
            <td style="border:1px solid #999;font-size:12px;width:55%">
                ${row.item
                    ? row.item
                    : '<span style="color:#ccc;font-size:10px;">................................................................................</span>'}
            </td>
            <td style="border:1px solid #999;text-align:center;font-size:12px;width:12%">${row.qty || ''}</td>
            <td style="border:1px solid #999;text-align:right;font-size:12px;width:27%;padding-right:8px">
                ${row.amount > 0 ? row.amount.toLocaleString('id-ID') : ''}
            </td>
        </tr>`).join('');

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000;
           margin: 24px 32px; background: #fff; }

    /* ── Header ── */
    .page-header { display: flex; align-items: flex-start; border: 1.5px solid #555;
                   border-bottom: none; padding: 8px 12px; }
    .logo-area { width: 110px; min-height: 48px; display: flex; align-items: center; }
    .logo-placeholder { width: 80px; height: 48px; border: 1px dashed #aaa;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 9px; color: #aaa; text-align: center;
                        border-radius: 3px; }
    .title-area { flex: 1; text-align: center; }
    .doc-title { font-size: 18px; font-weight: bold; letter-spacing: 3px;
                 text-transform: uppercase; margin-top: 6px; }

    /* ── Info rows ── */
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { border: 1.5px solid #555; padding: 4px 10px;
                     font-size: 11.5px; height: 22px; }
    .info-table .label { width: 120px; }
    .info-table .val   { border-right: none; }
    .info-table .divider { border-left: 1.5px solid #555; border-right: none;
                           width: 10px; text-align: center; }
    .info-table .right-label { width: 60px; font-weight: normal; }
    .info-table .right-val   { border-right: 1.5px solid #555; min-width: 130px; }

    /* ── Item table ── */
    .item-table { width: 100%; border-collapse: collapse; border: 1.5px solid #555; }
    .item-table th { border: 1.5px solid #555; padding: 5px 8px; font-size: 11.5px;
                     text-align: center; background: #f7f7f7; font-weight: bold; }
    .item-table td { border: 1px solid #999; padding: 3px 8px; font-size: 11.5px; height: 26px; }

    /* ── Jumlah & Terbilang ── */
    .jumlah-row td { border: 1.5px solid #555; padding: 5px 10px; font-size: 12px; }
    .terbilang-row td { border: 1.5px solid #555; border-top: none; padding: 5px 10px;
                        font-size: 11px; }

    /* ── Tanda Tangan ── */
    .ttd-table { width: 100%; border-collapse: collapse; }
    .ttd-table td { border: 1.5px solid #555; padding: 6px 12px 2px 12px;
                    text-align: center; width: 25%; font-size: 11.5px; height: 80px;
                    vertical-align: top; }
    .ttd-name { margin-top: 54px; border-top: 1px solid #555; padding-top: 4px;
                font-size: 11px; }

    /* ── Footer form number ── */
    .form-no { text-align: right; font-size: 9px; color: #888;
               margin-top: 4px; padding-right: 2px; }
  </style>
</head>
<body>

<!-- ═══ HEADER: Logo + Judul ═══ -->
<div class="page-header">
  <div class="logo-area">
    <div class="logo-placeholder">LOGO<br/>PERUSAHAAN</div>
  </div>
  <div class="title-area">
    <div class="doc-title">Fund Request</div>
  </div>
  <div style="width:110px"></div>
</div>

<!-- ═══ INFO: Requested by / No. / Dept / Date ═══ -->
<table class="info-table">
  <tr>
    <td class="label">Requested by</td>
    <td class="val">: &nbsp;${fr.fullName}</td>
    <td class="divider"></td>
    <td class="right-label">No.</td>
    <td class="divider">:</td>
    <td class="right-val">&nbsp;<strong>${noForm}</strong></td>
  </tr>
  <tr>
    <td class="label">Departemen</td>
    <td class="val">: &nbsp;${fr.department}</td>
    <td class="divider"></td>
    <td class="right-label">Date</td>
    <td class="divider">:</td>
    <td class="right-val">&nbsp;${tglFormatted}</td>
  </tr>
</table>

<!-- ═══ TABEL ITEM ═══ -->
<table class="item-table">
  <thead>
    <tr>
      <th style="width:6%">NO</th>
      <th style="width:55%;text-align:left;padding-left:10px">ITEM</th>
      <th style="width:12%">QTY</th>
      <th style="width:27%">PR NO.</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>

<!-- ═══ JUMLAH ═══ -->
<table class="item-table" style="border-top:none">
  <tr class="jumlah-row">
    <td style="width:61%;text-align:right;font-weight:bold;border:1.5px solid #555">Jumlah</td>
    <td style="width:12%;text-align:center;border:1.5px solid #555">Rp</td>
    <td style="width:27%;text-align:right;font-weight:bold;font-size:13px;
               border:1.5px solid #555;padding-right:10px">
        ${totalAmount.toLocaleString('id-ID')}
    </td>
  </tr>
</table>

<!-- ═══ TERBILANG ═══ -->
<table style="width:100%;border-collapse:collapse">
  <tr class="terbilang-row">
    <td style="border:1.5px solid #555;border-top:none;padding:5px 10px;font-size:11px">
        <strong>Terbilang :</strong> &nbsp;<em>${terbilangText}</em>
    </td>
  </tr>
</table>

<!-- ═══ TANDA TANGAN ═══ -->
<table class="ttd-table">
  <tr>
    <td>
      Requested by,
      <div class="ttd-name">..................</div>
    </td>
    <td>
      Approved by,
      <div class="ttd-name">..................</div>
    </td>
    <td>
      Paid by,
      <div class="ttd-name">..................</div>
    </td>
    <td>
      Received by,
      <div class="ttd-name">..................</div>
    </td>
  </tr>
</table>

<!-- ═══ FORM NUMBER ═══ -->
<div class="form-no">FRMNO: FRM-ACC-001 REV.00</div>

</body>
</html>`;
}

// State default untuk satu item baris
const DEFAULT_ITEM: FRItem = { item: '', qty: '1', amount: 0 };

export default function FundRequestScreen() {
    const { user } = useAuth();
    const [history, setHistory] = useState<FundRequest[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form state — items adalah baris-baris di tabel
    const [items, setItems] = useState<FRItem[]>([{ ...DEFAULT_ITEM }]);
    const [requestDate, setRequestDate] = useState(todayISO());
    const [submitting, setSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Total otomatis dari sum semua item
    const totalAmount = items.reduce((sum, it) => sum + (it.amount || 0), 0);

    const updateItem = (index: number, field: keyof FRItem, value: string | number) => {
        setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
    };

    const addItem = () => setItems(prev => [...prev, { ...DEFAULT_ITEM }]);
    const removeItem = (index: number) => {
        if (items.length <= 1) return; // minimal 1 baris
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const res = await fundRequestApi.getAll();
            if (res.success && res.data) setHistory(res.data);
        } catch {/* silent */} finally { setLoadingHistory(false); }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadHistory();
        setRefreshing(false);
    }, [loadHistory]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const handleSubmit = async () => {
        setFormErrors({});
        const errs: Record<string, string> = {};
        const validItems = items.filter(it => it.item.trim() !== '');
        if (validItems.length === 0) errs.items = 'Minimal 1 item wajib diisi';
        if (totalAmount <= 0) errs.amount = 'Total nominal harus lebih dari 0';
        if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

        // Deskripsi = gabung semua nama item
        const description = validItems.map(it => it.item).join(', ');

        setSubmitting(true);
        try {
            const res = await fundRequestApi.create({
                department: user?.department || '-',
                full_name: user?.full_name || '-',
                request_date: requestDate,
                description,
                amount: totalAmount,
            });

            if (res.success && res.data) {
                await printFundRequest(res.data, validItems);
                setShowForm(false);
                setItems([{ ...DEFAULT_ITEM }]);
                setRequestDate(todayISO());
                await loadHistory();
            } else {
                Alert.alert('Gagal', res.error || 'Terjadi kesalahan');
            }
        } catch (e: any) {
            Alert.alert('Gagal', e.response?.data?.error || 'Coba lagi nanti');
        } finally { setSubmitting(false); }
    };

    const printFundRequest = async (fr: FundRequest, frItems?: FRItem[]) => {
        try {
            // Jika items tidak diberikan (cetak ulang dari history), buat 1 item dari deskripsi
            const usedItems: FRItem[] = frItems && frItems.length > 0
                ? frItems
                : [{ item: fr.description, qty: '1', amount: fr.amount }];

            const html = generateHTML({
                fullName: fr.full_name,
                department: fr.department,
                requestDate: fr.request_date,
                amount: fr.amount,
                id: fr.id,
                items: usedItems,
            });
            const { uri } = await Print.printToFileAsync({ html, base64: false });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Bagikan Fund Request' });
            }
        } catch (e) {
            Alert.alert('Info', 'Fund request berhasil disimpan!');
        }
    };

    return (
        <View className="flex-1 bg-surface">
            <StatusBar style="light" />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Info Banner */}
                <View style={{ backgroundColor: '#1D4ED8', borderRadius: 16, padding: 20, marginBottom: 20 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', opacity: 0.8, marginBottom: 2 }}>Selamat datang,</Text>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{user?.full_name}</Text>
                    <Text style={{ color: '#fff', opacity: 0.8, fontSize: 13, marginTop: 2 }}>
                        {user?.department} • {user?.role === 'ADMIN' ? '👑 Admin' : 'Staff'}
                    </Text>
                </View>

                {/* Riwayat Pengajuan */}
                <Text style={{ color: '#374151', fontWeight: '700', fontSize: 15, marginBottom: 12 }}>Riwayat Pengajuan</Text>

                {loadingHistory ? (
                    <ActivityIndicator color="#2563EB" />
                ) : history.length === 0 ? (
                    <View className="items-center py-12">
                        <Text style={{ fontSize: 48 }}>📋</Text>
                        <Text style={{ color: '#9CA3AF', marginTop: 12 }}>Belum ada pengajuan</Text>
                    </View>
                ) : (
                    history.map(fr => (
                        <TouchableOpacity
                            key={fr.id}
                            onPress={() => printFundRequest(fr)}
                            style={{
                                backgroundColor: '#fff', borderRadius: 14, padding: 16,
                                marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6',
                            }}
                        >
                            {/* Row 1: Amount + Status + Menu */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 15 }}>{formatRupiah(fr.amount)}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {statusBadge(fr.status)}
                                    <TouchableOpacity
                                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                        onPress={() => {
                                            const actions: any[] = [];
                                            if (fr.status === 'PENDING') {
                                                actions.push({
                                                    text: '✅ Approve', onPress: () => {
                                                        Alert.alert('Approve Fund Request?',
                                                            `Setujui ${formatRupiah(fr.amount)} — saldo akan otomatis masuk ke transaksi.`,
                                                            [
                                                                { text: 'Batal', style: 'cancel' },
                                                                {
                                                                    text: 'Approve', onPress: async () => {
                                                                        try {
                                                                            const res = await fundRequestApi.approve(fr.id);
                                                                            if (res.success) {
                                                                                Alert.alert('Berhasil ✅', 'Fund request disetujui & saldo masuk ke transaksi.');
                                                                                loadHistory();
                                                                            } else {
                                                                                Alert.alert('Gagal', res.error || 'Terjadi kesalahan');
                                                                            }
                                                                        } catch (e: any) {
                                                                            Alert.alert('Gagal', e.response?.data?.error || 'Coba lagi');
                                                                        }
                                                                    }
                                                                },
                                                            ]
                                                        );
                                                    }
                                                });
                                            }
                                            actions.push({
                                                text: '🖨 Cetak PDF', onPress: () => printFundRequest(fr),
                                            });
                                            actions.push({
                                                text: '🗑 Hapus', style: 'destructive', onPress: () => {
                                                    Alert.alert('Hapus Fund Request?', 'Tindakan ini tidak bisa dibatalkan.', [
                                                        { text: 'Batal', style: 'cancel' },
                                                        {
                                                            text: 'Hapus', style: 'destructive', onPress: async () => {
                                                                try {
                                                                    await fundRequestApi.delete(fr.id);
                                                                    loadHistory();
                                                                } catch { Alert.alert('Gagal', 'Tidak bisa menghapus'); }
                                                            }
                                                        },
                                                    ]);
                                                }
                                            });
                                            actions.push({ text: 'Batal', style: 'cancel' });
                                            Alert.alert('Opsi', `FR #${fr.id}`, actions);
                                        }}
                                    >
                                        <Text style={{ fontSize: 18, color: '#9CA3AF', fontWeight: '700', letterSpacing: 1 }}>⋯</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Row 2: Description */}
                            <Text style={{ color: '#6B7280', fontSize: 13, marginBottom: 6 }} numberOfLines={2}>{fr.description}</Text>

                            {/* Row 3: Date left */}
                            <Text style={{ color: '#D1D5DB', fontSize: 11 }}>{formatDate(fr.request_date)}</Text>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* FAB — Floating Action Button */}
            <TouchableOpacity
                onPress={() => setShowForm(true)}
                activeOpacity={0.85}
                style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 20,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#1D4ED8',
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 6,
                    shadowColor: '#1D4ED8',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                }}
            >
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 }}>+</Text>
            </TouchableOpacity>

            {/* Modal Form Pengajuan */}
            <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
                <ScrollView
                    className="flex-1 bg-white"
                    contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Modal Header */}
                    <View className="flex-row justify-between items-center mb-5">
                        <Text className="text-2xl font-bold text-gray-900">Fund Request</Text>
                        <TouchableOpacity onPress={() => setShowForm(false)}>
                            <Text className="text-gray-400 text-2xl">✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info otomatis dari profil */}
                    <View className="bg-primary-50 rounded-2xl p-4 mb-4 border border-primary-100">
                        <Text className="text-primary-700 text-xs font-semibold mb-1">ℹ️ Terisi otomatis dari profil</Text>
                        <Text className="text-gray-700 text-sm">
                            <Text className="font-semibold">Requested by: </Text>{user?.full_name}
                        </Text>
                        <Text className="text-gray-700 text-sm">
                            <Text className="font-semibold">Departemen: </Text>{user?.department}
                        </Text>
                    </View>

                    {/* Tanggal */}
                    <Input
                        label="Tanggal Pengajuan"
                        value={requestDate}
                        onChangeText={setRequestDate}
                        placeholder="YYYY-MM-DD"
                        hint="Format: 2025-01-15"
                    />

                    {/* Tabel Item — NO | ITEM | QTY | PR NO. */}
                    <View className="mb-4">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-gray-700 font-semibold text-sm">Daftar Item</Text>
                            <Text className="text-gray-400 text-xs">NO | ITEM | QTY | PR NO.</Text>
                        </View>

                        {/* Header kolom */}
                        <View className="flex-row bg-gray-100 rounded-t-xl border border-gray-200 px-2 py-1.5">
                            <Text className="w-8 text-center text-gray-600 text-xs font-bold">NO</Text>
                            <Text className="flex-1 text-gray-600 text-xs font-bold ml-1">ITEM</Text>
                            <Text className="w-12 text-center text-gray-600 text-xs font-bold">QTY</Text>
                            <Text className="w-24 text-right text-gray-600 text-xs font-bold">PR NO. (Rp)</Text>
                        </View>

                        {/* Baris Item */}
                        {items.map((item, index) => (
                            <View key={index} className="flex-row items-center border-b border-x border-gray-200 px-2 py-1">
                                {/* Nomor */}
                                <Text className="w-8 text-center text-gray-500 text-xs">{index + 1}</Text>

                                {/* Item / Keterangan */}
                                <TextInput
                                    className="flex-1 text-gray-800 text-xs ml-1 py-1.5 border-l border-gray-200 pl-2"
                                    placeholder="Keterangan item..."
                                    placeholderTextColor="#d1d5db"
                                    value={item.item}
                                    onChangeText={v => updateItem(index, 'item', v)}
                                />

                                {/* QTY */}
                                <TextInput
                                    className="w-12 text-center text-gray-800 text-xs border-l border-gray-200 py-1.5"
                                    placeholder="1"
                                    placeholderTextColor="#d1d5db"
                                    value={item.qty}
                                    onChangeText={v => updateItem(index, 'qty', v)}
                                    keyboardType="default"
                                />

                                {/* PR NO / Harga */}
                                <TextInput
                                    className="w-24 text-right text-gray-800 text-xs border-l border-gray-200 py-1.5 pr-1"
                                    placeholder="0"
                                    placeholderTextColor="#d1d5db"
                                    value={item.amount > 0 ? String(item.amount) : ''}
                                    onChangeText={v => {
                                        const num = parseInt(v.replace(/[^0-9]/g, '')) || 0;
                                        updateItem(index, 'amount', num);
                                    }}
                                    keyboardType="numeric"
                                />

                                {/* Hapus baris */}
                                <TouchableOpacity
                                    onPress={() => removeItem(index)}
                                    className="ml-2"
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Text className={`text-base ${items.length <= 1 ? 'text-gray-200' : 'text-danger-400'}`}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Baris Jumlah */}
                        <View className="flex-row border border-t-0 border-gray-200 rounded-b-xl bg-gray-50 px-2 py-2">
                            <Text className="flex-1 text-right text-gray-600 text-xs font-bold mr-2">Jumlah</Text>
                            <Text className="w-24 text-right text-primary-700 text-sm font-bold pr-1">
                                {totalAmount.toLocaleString('id-ID')}
                            </Text>
                            <View className="w-6" />
                        </View>

                        {/* Error & Tombol Tambah */}
                        {formErrors.items && (
                            <Text className="text-danger-600 text-xs mt-1">{formErrors.items}</Text>
                        )}
                        {formErrors.amount && (
                            <Text className="text-danger-600 text-xs mt-0.5">{formErrors.amount}</Text>
                        )}

                        <TouchableOpacity
                            onPress={addItem}
                            className="mt-3 border-2 border-dashed border-primary-300 rounded-xl py-3 items-center"
                        >
                            <Text className="text-primary-600 font-semibold text-sm">+ Tambah Baris Item</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Terbilang preview */}
                    {totalAmount > 0 && (
                        <View className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-200">
                            <Text className="text-gray-500 text-xs">Terbilang:</Text>
                            <Text className="text-gray-700 text-xs italic mt-0.5">{terbilang(totalAmount)}</Text>
                        </View>
                    )}

                    <Button
                        variant="primary"
                        size="lg"
                        onPress={handleSubmit}
                        loading={submitting}
                        className="w-full mt-2"
                    >
                        Submit & Cetak PDF
                    </Button>
                    <Button
                        variant="ghost"
                        size="md"
                        onPress={() => setShowForm(false)}
                        className="w-full mt-2"
                    >
                        Batal
                    </Button>
                </ScrollView>
            </Modal>
        </View>
    );
}
