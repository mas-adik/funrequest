import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import type { FRItem } from '@/types';

interface ItemCardProps {
    item: FRItem;
    index: number;
    onUpdate: (index: number, field: keyof FRItem, value: string | number) => void;
    onDelete: (index: number) => void;
    canDelete: boolean;
    error?: string;
}

export function ItemCard({ item, index, onUpdate, onDelete, canDelete, error }: ItemCardProps) {
    return (
        <View style={{ marginBottom: 12 }}>
            <View style={{
                backgroundColor: '#fff', borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: error ? '#FECACA' : '#E5E7EB',
            }}>
                {/* Header row: #number + delete */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '700' }}>#{index + 1}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => onDelete(index)}
                        disabled={!canDelete}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text style={{ fontSize: 16, color: canDelete ? '#EF4444' : '#E5E7EB' }}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* Item description */}
                <TextInput
                    style={{
                        backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
                        paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937', marginBottom: 10,
                    }}
                    placeholder="Deskripsi item..."
                    placeholderTextColor="#D1D5DB"
                    value={item.item}
                    onChangeText={(text) => onUpdate(index, 'item', text)}
                />

                {/* Amount */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
                    borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12,
                }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginRight: 4 }}>Rp</Text>
                    <TextInput
                        style={{ flex: 1, fontSize: 14, color: '#1F2937', paddingVertical: 10, textAlign: 'right' }}
                        placeholder="0"
                        placeholderTextColor="#D1D5DB"
                        value={item.amount > 0 ? item.amount.toString() : ''}
                        onChangeText={(text) => {
                            const num = parseInt(text.replace(/\D/g, ''), 10) || 0;
                            onUpdate(index, 'amount', num);
                        }}
                        keyboardType="numeric"
                    />
                </View>
            </View>

            {error && (
                <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4, marginLeft: 4 }}>{error}</Text>
            )}
        </View>
    );
}
