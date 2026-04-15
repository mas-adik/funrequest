import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { Transaction } from '@/types';

function formatRupiah(value: number) {
    return 'Rp ' + value.toLocaleString('id-ID');
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

// Ikon tanda panah sederhana
const ArrowUp = () => (
    <Text style={{ fontSize: 20, color: '#10B981' }}>↑</Text>
);
const ArrowDown = () => (
    <Text style={{ fontSize: 20, color: '#EF4444' }}>↓</Text>
);

interface TransactionCardProps {
    transaction: Transaction;
    onDelete?: (id: number) => void;
}

export function TransactionCard({ transaction, onDelete }: TransactionCardProps) {
    const isOut = transaction.type === 'OUT';

    return (
        <View className="bg-white rounded-2xl px-4 py-3 mb-3 flex-row items-center shadow-sm border border-gray-100">
            {/* Icon */}
            <View className={`w-11 h-11 rounded-full items-center justify-center mr-3 ${isOut ? 'bg-danger-50' : 'bg-success-50'}`}>
                {isOut ? <ArrowDown /> : <ArrowUp />}
            </View>

            {/* Info */}
            <View className="flex-1">
                <Text className="font-semibold text-gray-800 text-sm" numberOfLines={1}>
                    {transaction.category}
                </Text>
                {transaction.description ? (
                    <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
                        {transaction.description}
                    </Text>
                ) : null}
                <Text className="text-gray-400 text-xs mt-0.5">
                    {formatDate(transaction.transaction_date)}
                </Text>
            </View>

            {/* Nominal + Delete */}
            <View className="items-end">
                <Text className={`font-bold text-sm ${isOut ? 'text-danger-600' : 'text-success-600'}`}>
                    {isOut ? '− ' : '+ '}{formatRupiah(transaction.amount)}
                </Text>
                {onDelete && (
                    <TouchableOpacity
                        onPress={() => onDelete(transaction.id)}
                        className="mt-1"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text className="text-danger-400 text-xs">Hapus</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
