import React from 'react';
import { View, Text } from 'react-native';

function formatRupiah(value: number) {
    return 'Rp ' + value.toLocaleString('id-ID');
}

interface SummaryCardProps {
    initialBalance: number;
    totalExpense: number;
    totalIncome: number;
    remainingBalance: number;
}

interface StatRowProps {
    label: string;
    value: number;
    color?: string;
    bold?: boolean;
}

function StatRow({ label, value, color = 'text-gray-700', bold = false }: StatRowProps) {
    return (
        <View className="flex-row justify-between items-center py-2 border-b border-gray-100 last:border-0">
            <Text className="text-gray-500 text-sm">{label}</Text>
            <Text className={`text-sm ${bold ? 'font-bold text-base' : 'font-semibold'} ${color}`}>
                {formatRupiah(value)}
            </Text>
        </View>
    );
}

export function SummaryCard({ initialBalance, totalExpense, totalIncome, remainingBalance }: SummaryCardProps) {
    const isPositive = remainingBalance >= 0;

    return (
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            {/* Header — Sisa Budget */}
            <View className={`rounded-xl p-4 mb-4 items-center ${isPositive ? 'bg-success-50' : 'bg-danger-50'}`}>
                <Text className="text-gray-500 text-sm mb-1">Sisa Budget</Text>
                <Text className={`text-3xl font-bold ${isPositive ? 'text-success-700' : 'text-danger-600'}`}>
                    {formatRupiah(Math.abs(remainingBalance))}
                </Text>
                {!isPositive && (
                    <Text className="text-danger-500 text-xs mt-1">⚠ Melebihi budget</Text>
                )}
            </View>

            {/* Detail rows */}
            <StatRow label="Dana Awal (Fund Request)" value={initialBalance} />
            <StatRow label="+ Pemasukan Tambahan" value={totalIncome} color="text-success-600" />
            <StatRow label="− Total Pengeluaran" value={totalExpense} color="text-danger-600" />
            <View className="mt-2 pt-2 border-t-2 border-gray-200">
                <StatRow
                    label="= Sisa yang Dikembalikan"
                    value={remainingBalance}
                    color={isPositive ? 'text-success-700' : 'text-danger-600'}
                    bold
                />
            </View>
        </View>
    );
}
