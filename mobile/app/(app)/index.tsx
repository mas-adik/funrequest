import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, Alert, TouchableOpacity,
    Modal, ActivityIndicator, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { CurrencyInput } from '@/components/CurrencyInput';
import { FormSection } from '@/components/FormSection';
import { ItemCard } from '@/components/ItemCard';
import { useAuth } from '@/hooks/useAuth';
import { fundRequestApi, transactionApi, reportApi } from '@/lib/api';
import type { FundRequest, FRItem, Transaction, BalanceSummary } from '@/types';
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

    // Helper function yang tidak add "Rupiah" di akhir (untuk recursion)
    function terbilanHelper(n: number): string {
        if (n === 0) return '';
        if (n < 10) return satuan[n];
        if (n < 20) return belasan[n - 10];
        if (n < 100) return puluhan[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + satuan[n % 10] : '');
        if (n < 1000) {
            const ratusan = Math.floor(n / 100);
            const sisa = n % 100;
            return (ratusan === 1 ? 'Seratus' : satuan[ratusan] + ' Ratus') + 
                   (sisa > 0 ? ' ' + terbilanHelper(sisa) : '');
        }
        if (n < 1000000) {
            const ribuan = Math.floor(n / 1000);
            const sisa = n % 1000;
            return (ribuan === 1 ? 'Seribu' : terbilanHelper(ribuan) + ' Ribu') +
                   (sisa > 0 ? ' ' + terbilanHelper(sisa) : '');
        }
        if (n < 1000000000) {
            const jutaan = Math.floor(n / 1000000);
            const sisa = n % 1000000;
            return terbilanHelper(jutaan) + ' Juta' +
                   (sisa > 0 ? ' ' + terbilanHelper(sisa) : '');
        }
        const miliaran = Math.floor(n / 1000000000);
        const sisa = n % 1000000000;
        return terbilanHelper(miliaran) + ' Miliar' +
               (sisa > 0 ? ' ' + terbilanHelper(sisa) : '');
    }

    num = Math.floor(Math.max(0, num));
    if (num === 0) return 'Nol';
    if (num < 0) return 'Minus ' + terbilang(-num);
    return terbilanHelper(num) + ' Rupiah';
}

// ─── Nomor Form: FR25/0001 ────────────────────────────────────────────────────
function frNumber(id: number | undefined): string {
    const yr = new Date().getFullYear().toString().slice(2); // '25'
    const seq = String(id || 0).padStart(4, '0');            // '0001'
    return `FR${yr}/${seq}`;
}

function statusBadge(status: string) {
    const map: Record<string, { bg: string; color: string; label: string }> = {
        PENDING:  { bg: '#FEF3C7', color: '#92400E', label: 'Menunggu' },
        APPROVED: { bg: '#D1FAE5', color: '#065F46', label: 'Disetujui' },
        REJECTED: { bg: '#FEE2E2', color: '#991B1B', label: 'Ditolak' },
        CLOSED:   { bg: '#E5E7EB', color: '#374151', label: 'Closed' },
    };
    const s = map[status] || map.PENDING;
    return (
        <View style={{ backgroundColor: s.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: s.color }}>{s.label}</Text>
        </View>
    );
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

    // Expand/collapse sub-transactions
    const [expandedFR, setExpandedFR] = useState<Record<number, boolean>>({});
    const toggleExpand = (id: number) => setExpandedFR(prev => ({ ...prev, [id]: !prev[id] }));

    // Balance + Transactions (merged from IN-OUT)
    const [balance, setBalance] = useState<BalanceSummary | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Expense form
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [expDesc, setExpDesc] = useState('');
    const [expAmount, setExpAmount] = useState(0);
    const [expDate, setExpDate] = useState(todayISO());
    const [expSubmitting, setExpSubmitting] = useState(false);
    const [expErrors, setExpErrors] = useState<Record<string, string>>({});

    // Delete expense
    const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
    const [deletingTx, setDeletingTx] = useState(false);

    // Menu & Approve modal state
    const [menuFR, setMenuFR] = useState<FundRequest | null>(null);
    const [showApprove, setShowApprove] = useState(false);
    const [approving, setApproving] = useState(false);

    // Toast notification
    const [toast, setToast] = useState<{ icon: string; title: string; message: string } | null>(null);
    const showToast = (icon: string, title: string, message: string) => {
        setToast({ icon, title, message });
        setTimeout(() => setToast(null), 2500);
    };

    // Delete confirmation
    const [deleteFR, setDeleteFR] = useState<FundRequest | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Closing state
    const [showClosing, setShowClosing] = useState(false);
    const [closing, setClosing] = useState(false);

    // Edit state
    const [showEdit, setShowEdit] = useState(false);
    const [editFR, setEditFR] = useState<FundRequest | null>(null);
    const [editDesc, setEditDesc] = useState('');
    const [editAmount, setEditAmount] = useState(0);
    const [editDate, setEditDate] = useState('');
    const [editSaving, setEditSaving] = useState(false);

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
        if (items.length <= 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const loadAll = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const [frRes, balRes, txRes] = await Promise.all([
                fundRequestApi.getAll(),
                reportApi.getBalance(),
                transactionApi.getAll(),
            ]);
            if (frRes.success && frRes.data) {
                const sorted = [...frRes.data].sort((a, b) =>
                    new Date(b.request_date).getTime() - new Date(a.request_date).getTime()
                );
                setHistory(sorted);
            }
            if (balRes.success && balRes.data) setBalance(balRes.data);
            if (txRes.success && txRes.data) {
                const manualTx = txRes.data.filter(tx => tx.category !== 'Fund Request');
                const sorted = [...manualTx].sort((a, b) =>
                    new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
                );
                setTransactions(sorted);
            }
        } catch {/* silent */} finally { setLoadingHistory(false); }
    }, []);

    // Alias for backward compat
    const loadHistory = loadAll;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    }, [loadAll]);

    useEffect(() => { loadAll(); }, [loadAll]);
    useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

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
                setShowForm(false);
                setItems([{ ...DEFAULT_ITEM }]);
                setRequestDate(todayISO());
                await loadHistory();
                showToast('✅', 'Berhasil', 'Fund request disimpan');
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

    const saldoAwal = balance?.initial_balance || 0;
    const totalOut = balance?.total_expense || 0;
    const sisaBudget = saldoAwal - totalOut;
    const isPositive = sisaBudget >= 0;

    const formatDateShort = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

    const handleExpenseSubmit = async () => {
        setExpErrors({});
        const errs: Record<string, string> = {};
        if (!expDesc.trim()) errs.description = 'Deskripsi wajib diisi';
        if (!expAmount || expAmount <= 0) errs.amount = 'Nominal harus lebih dari 0';
        if (Object.keys(errs).length > 0) { setExpErrors(errs); return; }
        setExpSubmitting(true);
        try {
            const res = await transactionApi.create({ type: 'OUT', category: expDesc.trim(), description: expDesc, amount: expAmount, transaction_date: expDate });
            if (res.success) { setShowExpenseForm(false); loadAll(); showToast('✅', 'Berhasil', 'Pengeluaran disimpan'); }
            else showToast('❌', 'Gagal', res.error || 'Terjadi kesalahan');
        } catch (e: any) { showToast('❌', 'Gagal', e.response?.data?.error || 'Coba lagi'); }
        finally { setExpSubmitting(false); }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <StatusBar style="light" />

            {/* Fixed Summary Card */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                <View style={{ backgroundColor: '#1D4ED8', borderRadius: 18, padding: 20, marginBottom: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>Sisa Budget</Text>
                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 4 }}>
                        {formatRupiah(Math.abs(sisaBudget))}
                    </Text>
                    {!isPositive && (
                        <Text style={{ color: '#FCA5A5', fontSize: 11, textAlign: 'center', marginTop: 2 }}>⚠ Melebihi budget</Text>
                    )}
                    <View style={{ flexDirection: 'row', marginTop: 16 }}>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' }}>FUND REQUEST</Text>
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2 }}>{formatRupiah(saldoAwal)}</Text>
                        </View>
                        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' }}>KELUAR</Text>
                            <Text style={{ color: '#FCA5A5', fontSize: 13, fontWeight: '700', marginTop: 2 }}>-{formatRupiah(totalOut)}</Text>
                        </View>
                    </View>
                </View>
                <Text style={{ color: '#374151', fontWeight: '700', fontSize: 15, marginBottom: 8 }}>Riwayat Pengajuan</Text>
            </View>

            {/* Scrollable Cards */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loadingHistory ? (
                    <ActivityIndicator color="#2563EB" style={{ marginTop: 32 }} />
                ) : history.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                        <Text style={{ fontSize: 48 }}>📋</Text>
                        <Text style={{ color: '#9CA3AF', marginTop: 12 }}>Belum ada pengajuan</Text>
                    </View>
                ) : (
                    history.map((fr, idx) => {
                        // Find linked expenses + unlinked expenses go to latest approved FR
                        const linkedTx = transactions.filter(tx => tx.fund_request_id === fr.id);
                        // Find unlinked expenses (no fund_request_id)
                        const unlinkedTx = transactions.filter(tx => !tx.fund_request_id);
                        // Attach unlinked to the first approved FR, or first FR if none approved
                        const latestApprovedIdx = history.findIndex(h => h.status === 'APPROVED');
                        const targetIdx = latestApprovedIdx >= 0 ? latestApprovedIdx : 0;
                        const frTx = idx === targetIdx ? [...linkedTx, ...unlinkedTx] : linkedTx;
                        return (
                            <View key={fr.id} style={{
                                backgroundColor: '#fff', borderRadius: 14,
                                marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden',
                            }}>
                                {/* FR Card Row */}
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => { if (frTx.length > 0) toggleExpand(fr.id); }}
                                    style={{ padding: 14, flexDirection: 'row' }}
                                >
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 3 }}>{formatDate(fr.request_date)}</Text>
                                        <Text style={{ color: '#374151', fontSize: 13 }} numberOfLines={2}>{fr.description}</Text>
                                        {/* Expense count badge */}
                                        {frTx.length > 0 && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                                                <Text style={{ fontSize: 10, color: expandedFR[fr.id] ? '#1D4ED8' : '#9CA3AF' }}>
                                                    {expandedFR[fr.id] ? '▼' : '▶'}
                                                </Text>
                                                <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
                                                    {frTx.length} pengeluaran
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', minWidth: 110 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            {statusBadge(fr.status)}
                                            <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => setMenuFR(fr)}>
                                                <Text style={{ fontSize: 20, color: '#9CA3AF', fontWeight: '800' }}>⋯</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 14, marginTop: 4 }}>{formatRupiah(fr.amount)}</Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Sub: Transaction list — collapsible */}
                                {expandedFR[fr.id] && frTx.length > 0 && (
                                    <View style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FAFAFA' }}>
                                        {frTx.map(tx => (
                                            <View key={tx.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                                                <View style={{
                                                    width: 24, height: 24, borderRadius: 12, marginRight: 10,
                                                    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <Text style={{ fontSize: 10, color: '#DC2626' }}>↓</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ color: '#374151', fontSize: 12, fontWeight: '500' }} numberOfLines={1}>{tx.description || tx.category}</Text>
                                                    <Text style={{ color: '#D1D5DB', fontSize: 9 }}>{formatDateShort(tx.transaction_date)}</Text>
                                                </View>
                                                <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>−{formatRupiah(tx.amount)}</Text>
                                                <TouchableOpacity onPress={() => setDeleteTx(tx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 8 }}>
                                                    <Text style={{ color: '#D1D5DB', fontSize: 9 }}>✕</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* FAB — Pengeluaran (red, left) */}
            <TouchableOpacity
                onPress={() => { setExpDesc(''); setExpAmount(0); setExpDate(todayISO()); setExpErrors({}); setShowExpenseForm(true); }}
                activeOpacity={0.85}
                style={{
                    position: 'absolute', bottom: 24, left: 20,
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
                    elevation: 6, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
                }}
            >
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 }}>−</Text>
            </TouchableOpacity>

            {/* FAB — Fund Request (blue, right) */}
            <TouchableOpacity
                onPress={() => { setItems([{ ...DEFAULT_ITEM }]); setRequestDate(todayISO()); setFormErrors({}); setShowForm(true); }}
                activeOpacity={0.85}
                style={{
                    position: 'absolute', bottom: 24, right: 20,
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center',
                    elevation: 6, shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
                }}
            >
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 }}>+</Text>
            </TouchableOpacity>

            {/* Modal Form Pengajuan */}
            <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    {/* Fixed Header */}
                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
                        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                    }}>
                        <View>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Fund Request</Text>
                            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Buat pengajuan dana baru</Text>
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

                    {/* Scrollable Form */}
                    <ScrollView
                        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Pemohon */}
                        <FormSection title="Pemohon">
                            <View style={{
                                flexDirection: 'row', alignItems: 'center',
                                backgroundColor: '#F0F5FF', borderRadius: 12, padding: 14,
                            }}>
                                <View style={{
                                    width: 36, height: 36, borderRadius: 18,
                                    backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center',
                                    marginRight: 12,
                                }}>
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                        {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ color: '#1F2937', fontSize: 14, fontWeight: '600' }}>{user?.full_name}</Text>
                                    <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 1 }}>{user?.department}</Text>
                                </View>
                            </View>
                        </FormSection>

                        {/* Tanggal */}
                        <FormSection title="Tanggal Pengajuan">
                            <Input
                                value={requestDate}
                                onChangeText={setRequestDate}
                                placeholder="2025-01-15"
                                hint="Format: YYYY-MM-DD"
                            />
                        </FormSection>

                        {/* Items */}
                        <FormSection title="Daftar Item">
                            {items.map((item, index) => (
                                <ItemCard
                                    key={index}
                                    item={item}
                                    index={index}
                                    onUpdate={updateItem}
                                    onDelete={removeItem}
                                    canDelete={items.length > 1}
                                    error={formErrors[`item_${index}`]}
                                />
                            ))}

                            <TouchableOpacity
                                onPress={addItem}
                                style={{
                                    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#93C5FD',
                                    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
                                    backgroundColor: '#F0F5FF',
                                }}
                            >
                                <Text style={{ color: '#2563EB', fontWeight: '600', fontSize: 13 }}>+ Tambah Item</Text>
                            </TouchableOpacity>

                            {formErrors.items && (
                                <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 6 }}>{formErrors.items}</Text>
                            )}
                        </FormSection>

                        {/* Total Summary */}
                        <View style={{
                            backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16,
                            borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24,
                        }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 13 }}>Total</Text>
                                <Text style={{ color: '#1D4ED8', fontWeight: '800', fontSize: 18 }}>
                                    Rp {totalAmount.toLocaleString('id-ID')}
                                </Text>
                            </View>
                            {totalAmount > 0 && (
                                <Text style={{ color: '#6B7280', fontSize: 11, fontStyle: 'italic', marginTop: 8 }}>
                                    {terbilang(totalAmount)}
                                </Text>
                            )}
                            {formErrors.amount && (
                                <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{formErrors.amount}</Text>
                            )}
                        </View>

                        {/* Buttons */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={submitting}
                            style={{
                                backgroundColor: '#1D4ED8', borderRadius: 14, paddingVertical: 16,
                                alignItems: 'center', marginBottom: 10, opacity: submitting ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                {submitting ? 'Memproses...' : 'Submit Request'}
                            </Text>
                        </TouchableOpacity>


                    </ScrollView>
                </View>
            </Modal>

            {/* Modal Edit Fund Request */}
            <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet">
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    {/* Fixed Header */}
                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
                        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                    }}>
                        <View>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Edit Request</Text>
                            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Ubah detail pengajuan</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowEdit(false)}
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
                                value={editDate}
                                onChangeText={setEditDate}
                                placeholder="YYYY-MM-DD"
                            />
                        </FormSection>
                        <FormSection title="Deskripsi">
                            <Input
                                value={editDesc}
                                onChangeText={setEditDesc}
                                placeholder="Keterangan fund request"
                            />
                        </FormSection>
                        <FormSection title="Nominal">
                            <CurrencyInput
                                value={editAmount}
                                onChangeValue={setEditAmount}
                            />
                        </FormSection>

                        <TouchableOpacity
                            disabled={editSaving}
                            onPress={async () => {
                                if (!editFR) return;
                                setEditSaving(true);
                                try {
                                    const res = await fundRequestApi.update(editFR.id, {
                                        description: editDesc,
                                        amount: editAmount,
                                        request_date: editDate,
                                    });
                                    if (res.success) {
                                        setShowEdit(false);
                                        loadHistory();
                                        showToast('✅', 'Berhasil', 'Fund request diperbarui');
                                    } else {
                                        showToast('❌', 'Gagal', res.error || 'Terjadi kesalahan');
                                    }
                                } catch (e: any) {
                                    showToast('❌', 'Gagal', e.response?.data?.error || 'Coba lagi');
                                } finally { setEditSaving(false); }
                            }}
                            style={{
                                backgroundColor: '#1D4ED8', borderRadius: 14, paddingVertical: 16,
                                alignItems: 'center', marginBottom: 10, opacity: editSaving ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowEdit(false)}
                            style={{
                                borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
                                paddingVertical: 14, alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '600' }}>Batal</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            {/* ══ Bottom Sheet: Opsi Menu ══ */}
            <Modal visible={!!menuFR} transparent animationType="fade" onRequestClose={() => setMenuFR(null)}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setMenuFR(null)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
                >
                    <View style={{
                        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
                        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36,
                    }}>
                        {/* Handle */}
                        <View style={{ width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

                        {/* Title */}
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
                            FR #{menuFR?.id}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
                            {menuFR?.description}
                        </Text>

                        {/* Approve — only PENDING */}
                        {menuFR?.status === 'PENDING' && (
                            <TouchableOpacity
                                onPress={() => { setShowApprove(true); }}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
                                    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                                }}
                            >
                                <Text style={{ fontSize: 18, marginRight: 14 }}>✅</Text>
                                <Text style={{ fontSize: 15, color: '#059669', fontWeight: '600' }}>Approve</Text>
                            </TouchableOpacity>
                        )}

                        {/* Edit — PENDING or APPROVED */}
                        {(menuFR?.status === 'PENDING' || menuFR?.status === 'APPROVED') && (
                            <TouchableOpacity
                                onPress={() => {
                                    if (!menuFR) return;
                                    setEditFR(menuFR);
                                    setEditDesc(menuFR.description);
                                    setEditAmount(menuFR.amount);
                                    setEditDate(typeof menuFR.request_date === 'string' ? menuFR.request_date.split('T')[0] : todayISO());
                                    setMenuFR(null);
                                    setShowEdit(true);
                                }}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
                                    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                                }}
                            >
                                <Text style={{ fontSize: 18, marginRight: 14 }}>✏️</Text>
                                <Text style={{ fontSize: 15, color: '#374151', fontWeight: '600' }}>Edit</Text>
                            </TouchableOpacity>
                        )}

                        {/* Cetak PDF — only when not PENDING */}
                        {menuFR?.status !== 'PENDING' && (
                            <TouchableOpacity
                                onPress={() => { if (menuFR) printFundRequest(menuFR); setMenuFR(null); }}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
                                    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                                }}
                            >
                                <Text style={{ fontSize: 18, marginRight: 14 }}>🖨</Text>
                                <Text style={{ fontSize: 15, color: '#374151', fontWeight: '600' }}>Cetak PDF</Text>
                            </TouchableOpacity>
                        )}

                        {/* Closing — only APPROVED */}
                        {menuFR?.status === 'APPROVED' && (
                            <TouchableOpacity
                                onPress={() => { setShowClosing(true); }}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
                                    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                                }}
                            >
                                <Text style={{ fontSize: 18, marginRight: 14 }}>📊</Text>
                                <Text style={{ fontSize: 15, color: '#1D4ED8', fontWeight: '600' }}>Closing</Text>
                            </TouchableOpacity>
                        )}

                        {/* Delete — PENDING or APPROVED */}
                        {(menuFR?.status === 'PENDING' || menuFR?.status === 'APPROVED') && (
                            <TouchableOpacity
                                onPress={() => {
                                    if (!menuFR) return;
                                    setDeleteFR(menuFR);
                                    setMenuFR(null);
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
                            >
                                <Text style={{ fontSize: 18, marginRight: 14 }}>🗑</Text>
                                <Text style={{ fontSize: 15, color: '#DC2626', fontWeight: '600' }}>Hapus</Text>
                            </TouchableOpacity>
                        )}

                        {/* Batal */}
                        <TouchableOpacity
                            onPress={() => setMenuFR(null)}
                            style={{
                                marginTop: 8, paddingVertical: 14, borderRadius: 12,
                                backgroundColor: '#F3F4F6', alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 15, color: '#6B7280', fontWeight: '600' }}>Batal</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ══ Bottom Sheet: Konfirmasi Approve ══ */}
            <Modal visible={showApprove} transparent animationType="fade" onRequestClose={() => setShowApprove(false)}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setShowApprove(false)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
                >
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 20, padding: 24,
                        width: '100%', maxWidth: 340,
                    }}>
                        <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>✅</Text>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 }}>
                            Approve Fund Request?
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
                            Setujui {menuFR ? formatRupiah(menuFR.amount) : ''}{"\n"}Saldo akan otomatis masuk ke transaksi.
                        </Text>

                        <TouchableOpacity
                            disabled={approving}
                            onPress={async () => {
                                if (!menuFR) return;
                                setApproving(true);
                                try {
                                    const res = await fundRequestApi.approve(menuFR.id);
                                    if (res.success) {
                                        setShowApprove(false);
                                        setMenuFR(null);
                                        loadHistory();
                                        showToast('✅', 'Berhasil', 'Disetujui & saldo masuk ke transaksi');
                                    } else {
                                        showToast('❌', 'Gagal', res.error || 'Terjadi kesalahan');
                                    }
                                } catch (e: any) {
                                    showToast('❌', 'Gagal', e.response?.data?.error || 'Coba lagi');
                                } finally { setApproving(false); }
                            }}
                            style={{
                                backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14,
                                alignItems: 'center', marginBottom: 10, opacity: approving ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                {approving ? 'Memproses...' : 'Ya, Approve'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowApprove(false)}
                            style={{ paddingVertical: 12, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '600' }}>Batal</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ══ Delete Confirmation Modal ══ */}
            <Modal visible={!!deleteFR} transparent animationType="fade" onRequestClose={() => setDeleteFR(null)}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setDeleteFR(null)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
                >
                    <View style={{
                        backgroundColor: '#fff', borderRadius: 20, padding: 24,
                        width: '100%', maxWidth: 320,
                    }}>
                        <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🗑</Text>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 }}>
                            Hapus Fund Request?
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
                            Data yang sudah dihapus tidak bisa dikembalikan.
                        </Text>

                        <TouchableOpacity
                            disabled={deleting}
                            onPress={async () => {
                                if (!deleteFR) return;
                                setDeleting(true);
                                try {
                                    await fundRequestApi.delete(deleteFR.id);
                                    setDeleteFR(null);
                                    loadHistory();
                                    showToast('✅', 'Dihapus', 'Fund request berhasil dihapus');
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

                        <TouchableOpacity
                            onPress={() => setDeleteFR(null)}
                            style={{ paddingVertical: 12, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '600' }}>Batal</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ══ Form Pengeluaran ══ */}
            <Modal visible={showExpenseForm} animationType="slide" presentationStyle="pageSheet">
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
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
                            onPress={() => setShowExpenseForm(false)}
                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '600' }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                        <FormSection title="Tanggal">
                            <Input value={expDate} onChangeText={setExpDate} placeholder="YYYY-MM-DD" />
                        </FormSection>
                        <FormSection title="Deskripsi">
                            <Input value={expDesc} onChangeText={setExpDesc} placeholder="Keterangan pengeluaran..." />
                            {expErrors.description && <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{expErrors.description}</Text>}
                        </FormSection>
                        <FormSection title="Nominal">
                            <CurrencyInput value={expAmount} onChangeValue={setExpAmount} />
                            {expErrors.amount && <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{expErrors.amount}</Text>}
                        </FormSection>
                        <TouchableOpacity
                            onPress={handleExpenseSubmit}
                            disabled={expSubmitting}
                            style={{
                                backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 16,
                                alignItems: 'center', opacity: expSubmitting ? 0.6 : 1, marginTop: 8,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                {expSubmitting ? 'Memproses...' : 'Simpan Pengeluaran'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            {/* ══ Delete Transaction Confirmation ══ */}
            <Modal visible={!!deleteTx} transparent animationType="fade" onRequestClose={() => setDeleteTx(null)}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setDeleteTx(null)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
                >
                    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320 }}>
                        <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🗑</Text>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 }}>Hapus Pengeluaran?</Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 }}>Data tidak bisa dikembalikan.</Text>
                        <TouchableOpacity
                            disabled={deletingTx}
                            onPress={async () => {
                                if (!deleteTx) return;
                                setDeletingTx(true);
                                try {
                                    await transactionApi.delete(deleteTx.id);
                                    setDeleteTx(null);
                                    loadAll();
                                    showToast('✅', 'Dihapus', 'Pengeluaran berhasil dihapus');
                                } catch { showToast('❌', 'Gagal', 'Tidak bisa menghapus'); }
                                finally { setDeletingTx(false); }
                            }}
                            style={{
                                backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 14,
                                alignItems: 'center', marginBottom: 10, opacity: deletingTx ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{deletingTx ? 'Menghapus...' : 'Ya, Hapus'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setDeleteTx(null)} style={{ paddingVertical: 12, alignItems: 'center' }}>
                            <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '600' }}>Batal</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ══ Closing Confirmation Modal ══ */}
            <Modal visible={showClosing} transparent animationType="fade" onRequestClose={() => setShowClosing(false)}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setShowClosing(false)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
                >
                    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
                        <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>📊</Text>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 }}>
                            Closing Fund Request?
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
                            Menutup siklus FR #{menuFR?.id}{"\n"}Summary transaksi akan dicetak sebagai PDF dan sisa budget akan di-reset.
                        </Text>

                        <TouchableOpacity
                            disabled={closing}
                            onPress={async () => {
                                if (!menuFR) return;
                                setClosing(true);
                                try {
                                    const res = await fundRequestApi.close(menuFR.id);
                                    if (res.success && res.data) {
                                        const { fund_request, summary, transactions: txList } = res.data;
                                        // Generate closing summary PDF
                                        const outTxs = (txList || []).filter((tx: any) => tx.type === 'OUT');
                                        const closingHTML = `
<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #111; font-size: 13px; }
  h1 { text-align: center; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
  .period { text-align: center; color: #555; margin-bottom: 24px; }
  .summary-box { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
  .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #DBEAFE; font-size: 13px; }
  .summary-row:last-child { border-bottom: none; font-weight: bold; font-size: 15px; }
  .remaining { color: ${summary.remaining_balance >= 0 ? '#059669' : '#DC2626'}; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #F3F4F6; text-align: left; padding: 8px 10px; font-size: 12px; }
  td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; }
  h3 { margin-top: 24px; margin-bottom: 8px; color: #374151; font-size: 14px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
  .sign-area { display: flex; justify-content: space-between; margin-top: 48px; }
  .sign-box { text-align: center; width: 200px; }
  .sign-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 6px; font-size: 12px; }
</style></head><body>
<h1>📊 Closing Summary - Fund Request</h1>
<div class="period">
  FR #${menuFR.id} — ${menuFR.description}<br/>
  Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}
</div>
<div class="summary-box">
  <div class="summary-row"><span>Dana Fund Request</span><span>${formatRupiah(summary.total_budget)}</span></div>
  <div class="summary-row"><span>− Total Pengeluaran</span><span style="color:#DC2626">${formatRupiah(summary.total_expense)}</span></div>
  <div class="summary-row"><span>= Sisa yang Dikembalikan</span><span class="remaining">${formatRupiah(summary.remaining_balance)}</span></div>
</div>
${outTxs.length > 0 ? `
  <h3>💸 Rincian Pengeluaran</h3>
  <table>
    <thead><tr><th>Tanggal</th><th>Keterangan</th><th style="text-align:right">Nominal</th></tr></thead>
    <tbody>${outTxs.map((tx: any) => `
      <tr>
        <td>${formatDate(tx.transaction_date)}</td>
        <td>${tx.description || tx.category}</td>
        <td style="text-align:right;color:#DC2626">− ${formatRupiah(tx.amount)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}
<div class="sign-area">
  <div class="sign-box"><div class="sign-line">Dibuat oleh<br/><strong>${menuFR.full_name}</strong></div></div>
  <div class="sign-box"><div class="sign-line">Diperiksa oleh<br/><strong>Atasan Langsung</strong></div></div>
  <div class="sign-box"><div class="sign-line">Disetujui oleh<br/><strong>Admin / Finance</strong></div></div>
</div>
<div class="footer">Laporan ini dibuat otomatis melalui Aplikasi FundRequest &copy; ${new Date().getFullYear()}</div>
</body></html>`;
                                        try {
                                            const { uri } = await Print.printToFileAsync({ html: closingHTML, base64: false });
                                            if (await Sharing.isAvailableAsync()) {
                                                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Closing Summary FR' });
                                            }
                                        } catch {}

                                        setShowClosing(false);
                                        setMenuFR(null);
                                        loadAll();
                                        showToast('✅', 'Berhasil', 'Fund Request di-closing & summary dicetak');
                                    } else {
                                        showToast('❌', 'Gagal', res.error || 'Terjadi kesalahan');
                                    }
                                } catch (e: any) {
                                    showToast('❌', 'Gagal', e.response?.data?.error || 'Coba lagi');
                                } finally { setClosing(false); }
                            }}
                            style={{
                                backgroundColor: '#1D4ED8', borderRadius: 12, paddingVertical: 14,
                                alignItems: 'center', marginBottom: 10, opacity: closing ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                {closing ? 'Memproses...' : 'Ya, Closing & Cetak PDF'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowClosing(false)}
                            style={{ paddingVertical: 12, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '600' }}>Batal</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ══ Toast Notification ══ */}
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
                        <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>{toast?.message}</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
