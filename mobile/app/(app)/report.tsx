import React, { useState } from 'react';
import {
    View, Text, ScrollView, Alert, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { reportApi } from '@/lib/api';
import type { ReportSummary, Transaction } from '@/types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function formatRupiah(v: number) { return 'Rp ' + v.toLocaleString('id-ID'); }
function formatDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getThisWeek() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now); mon.setDate(now.getDate() + diffToMon); mon.setHours(0,0,0,0);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return {
        from: mon.toISOString().split('T')[0],
        to: sun.toISOString().split('T')[0],
    };
}

function generateReportHTML(report: ReportSummary) {
    const { summary, fund_requests, transactions } = report;
    const outTxs = transactions.filter(t => t.type === 'OUT');
    const inTxs  = transactions.filter(t => t.type === 'IN');

    const txRow = (tx: Transaction) => `
        <tr>
            <td>${formatDate(tx.transaction_date)}</td>
            <td>${tx.category}${tx.description ? ' — ' + tx.description : ''}</td>
            <td style="text-align:right; color:${tx.type === 'OUT' ? '#DC2626' : '#059669'}">
                ${tx.type === 'OUT' ? '−' : '+'} ${formatRupiah(tx.amount)}
            </td>
        </tr>`;

    return `
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

<h1>📊 Laporan Keuangan Mingguan</h1>
<div class="period">
  Periode: ${formatDate(report.period.from)} — ${formatDate(report.period.to)}<br/>
  Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}
</div>

<div class="summary-box">
  <div class="summary-row"><span>Dana Awal (Fund Request)</span><span>${formatRupiah(summary.total_budget)}</span></div>
  ${inTxs.length > 0 ? `<div class="summary-row"><span>+ Pemasukan Tambahan</span><span style="color:#059669">${formatRupiah(summary.total_income)}</span></div>` : ''}
  <div class="summary-row"><span>− Total Pengeluaran</span><span style="color:#DC2626">${formatRupiah(summary.total_expense)}</span></div>
  <div class="summary-row"><span>= Sisa yang Dikembalikan</span><span class="remaining">${formatRupiah(summary.remaining_balance)}</span></div>
</div>

${fund_requests.length > 0 ? `
  <h3>📋 Daftar Fund Request</h3>
  <table>
    <thead><tr><th>Tanggal</th><th>Deskripsi</th><th style="text-align:right">Nominal</th></tr></thead>
    <tbody>
      ${fund_requests.map(fr => `
        <tr>
          <td>${formatDate(fr.request_date)}</td>
          <td>${fr.description}</td>
          <td style="text-align:right;font-weight:bold">${formatRupiah(fr.amount)}</td>
        </tr>`).join('')}
    </tbody>
  </table>` : ''}

${outTxs.length > 0 ? `
  <h3>💸 Rincian Pengeluaran</h3>
  <table>
    <thead><tr><th>Tanggal</th><th>Keterangan</th><th style="text-align:right">Nominal</th></tr></thead>
    <tbody>${outTxs.map(txRow).join('')}</tbody>
  </table>` : ''}

${inTxs.length > 0 ? `
  <h3>💰 Rincian Pemasukan Tambahan</h3>
  <table>
    <thead><tr><th>Tanggal</th><th>Keterangan</th><th style="text-align:right">Nominal</th></tr></thead>
    <tbody>${inTxs.map(txRow).join('')}</tbody>
  </table>` : ''}

<div class="sign-area">
  <div class="sign-box"><div class="sign-line">Dibuat oleh<br/><strong>${fund_requests[0]?.full_name || 'Staff'}</strong></div></div>
  <div class="sign-box"><div class="sign-line">Diperiksa oleh<br/><strong>Atasan Langsung</strong></div></div>
  <div class="sign-box"><div class="sign-line">Disetujui oleh<br/><strong>Admin / Finance</strong></div></div>
</div>

<div class="footer">Laporan ini dibuat otomatis melalui Aplikasi FundRequest &copy; ${new Date().getFullYear()}</div>
</body></html>`;
}

export default function ReportScreen() {
    const week = getThisWeek();
    const [dateFrom, setDateFrom] = useState(week.from);
    const [dateTo, setDateTo]     = useState(week.to);
    const [report, setReport]     = useState<ReportSummary | null>(null);
    const [loading, setLoading]   = useState(false);
    const [errors, setErrors]     = useState<Record<string, string>>({});

    const handleLoad = async () => {
        setErrors({});
        if (!dateFrom) { setErrors({ dateFrom: 'Wajib diisi' }); return; }
        if (!dateTo)   { setErrors({ dateTo: 'Wajib diisi' }); return; }

        setLoading(true);
        try {
            const res = await reportApi.getSummary(dateFrom, dateTo);
            if (res.success && res.data) {
                setReport(res.data);
            } else {
                Alert.alert('Gagal', res.error || 'Terjadi kesalahan');
            }
        } catch (e: any) {
            Alert.alert('Gagal', e.response?.data?.error || 'Coba lagi nanti');
        } finally { setLoading(false); }
    };

    const handlePrint = async () => {
        if (!report) return;
        try {
            const html = generateReportHTML(report);
            const { uri } = await Print.printToFileAsync({ html, base64: false });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Laporan Keuangan Mingguan',
                });
            }
        } catch (e) {
            Alert.alert('Info', 'Laporan siap dicetak!');
        }
    };

    const isPositive = (report?.summary.remaining_balance ?? 0) >= 0;

    return (
        <View className="flex-1 bg-surface">
            <StatusBar style="light" />
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

                {/* Date Filter Card */}
                <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                    <Text className="text-gray-800 font-bold text-base mb-4">⚙️ Pilih Periode Laporan</Text>
                    <Input
                        label="Dari Tanggal"
                        value={dateFrom}
                        onChangeText={setDateFrom}
                        placeholder="YYYY-MM-DD"
                        hint="Contoh: 2025-01-13"
                        error={errors.dateFrom}
                    />
                    <Input
                        label="Sampai Tanggal"
                        value={dateTo}
                        onChangeText={setDateTo}
                        placeholder="YYYY-MM-DD"
                        hint="Contoh: 2025-01-19"
                        error={errors.dateTo}
                    />

                    {/* Quick Week Selector */}
                    <View className="flex-row gap-2 mb-4">
                        <TouchableOpacity
                            onPress={() => { setDateFrom(week.from); setDateTo(week.to); }}
                            className="px-3 py-1 rounded-lg bg-primary-100 border border-primary-200"
                        >
                            <Text className="text-primary-700 text-xs font-semibold">Minggu Ini</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                const now = new Date();
                                const y = now.getFullYear();
                                const m = String(now.getMonth() + 1).padStart(2, '0');
                                setDateFrom(`${y}-${m}-01`);
                                const last = new Date(y, now.getMonth() + 1, 0);
                                setDateTo(`${y}-${m}-${String(last.getDate()).padStart(2, '0')}`);
                            }}
                            className="px-3 py-1 rounded-lg bg-gray-100 border border-gray-200"
                        >
                            <Text className="text-gray-600 text-xs font-semibold">Bulan Ini</Text>
                        </TouchableOpacity>
                    </View>

                    <Button variant="primary" size="md" onPress={handleLoad} loading={loading} className="w-full">
                        Tampilkan Laporan
                    </Button>
                </View>

                {/* Report Preview */}
                {report && (
                    <View>
                        {/* Summary Box */}
                        <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                            <Text className="text-gray-800 font-bold text-base mb-3">
                                📊 Ringkasan — {formatDate(report.period.from)} s/d {formatDate(report.period.to)}
                            </Text>

                            <View className="flex-row justify-between py-2 border-b border-gray-100">
                                <Text className="text-gray-500 text-sm">Dana Awal (Fund Request)</Text>
                                <Text className="text-gray-800 font-semibold text-sm">{formatRupiah(report.summary.total_budget)}</Text>
                            </View>
                            {report.summary.total_income > 0 && (
                                <View className="flex-row justify-between py-2 border-b border-gray-100">
                                    <Text className="text-gray-500 text-sm">+ Pemasukan Tambahan</Text>
                                    <Text className="text-success-600 font-semibold text-sm">{formatRupiah(report.summary.total_income)}</Text>
                                </View>
                            )}
                            <View className="flex-row justify-between py-2 border-b border-gray-100">
                                <Text className="text-gray-500 text-sm">− Total Pengeluaran</Text>
                                <Text className="text-danger-600 font-semibold text-sm">{formatRupiah(report.summary.total_expense)}</Text>
                            </View>
                            <View className={`mt-3 pt-3 border-t-2 ${isPositive ? 'border-success-200' : 'border-danger-200'} flex-row justify-between`}>
                                <Text className="font-bold text-gray-800">= Sisa yang Dikembalikan</Text>
                                <Text className={`font-bold text-lg ${isPositive ? 'text-success-700' : 'text-danger-600'}`}>
                                    {formatRupiah(report.summary.remaining_balance)}
                                </Text>
                            </View>
                        </View>

                        {/* Rincian Transaksi */}
                        {report.transactions.length > 0 && (
                            <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                                <Text className="text-gray-800 font-bold text-base mb-3">Rincian Transaksi</Text>
                                {report.transactions.map(tx => (
                                    <View key={tx.id} className="flex-row justify-between py-2 border-b border-gray-50">
                                        <View className="flex-1 mr-2">
                                            <Text className="text-gray-700 text-sm font-semibold">{tx.category}</Text>
                                            <Text className="text-gray-400 text-xs">{formatDate(tx.transaction_date)}</Text>
                                        </View>
                                        <Text className={`font-semibold text-sm ${tx.type === 'OUT' ? 'text-danger-600' : 'text-success-600'}`}>
                                            {tx.type === 'OUT' ? '−' : '+'} {formatRupiah(tx.amount)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Cetak PDF */}
                        <Button variant="primary" size="lg" onPress={handlePrint} className="w-full">
                            🖨 Cetak / Simpan PDF
                        </Button>
                    </View>
                )}

                {!report && !loading && (
                    <View className="items-center py-16">
                        <Text style={{ fontSize: 60 }}>📊</Text>
                        <Text className="text-gray-500 mt-3 text-center">
                            Pilih periode dan tekan{'\n'}"Tampilkan Laporan"
                        </Text>
                    </View>
                )}

            </ScrollView>
        </View>
    );
}
