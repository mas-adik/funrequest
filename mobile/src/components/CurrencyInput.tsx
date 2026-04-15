import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
    label?: string;
    error?: string;
    value: number;
    onChangeValue: (value: number) => void;
}

function formatRupiah(value: number): string {
    if (!value || isNaN(value)) return '';
    return value.toLocaleString('id-ID');
}

function parseRupiah(text: string): number {
    const cleaned = text.replace(/\./g, '').replace(/,/g, '').replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned) : 0;
}

export function CurrencyInput({ label, error, value, onChangeValue, className, ...props }: CurrencyInputProps) {
    const [focused, setFocused] = useState(false);
    const [displayValue, setDisplayValue] = useState(value ? formatRupiah(value) : '');

    const handleChange = (text: string) => {
        // Strip non-digits
        const digitsOnly = text.replace(/[^0-9]/g, '');
        const num = digitsOnly ? parseInt(digitsOnly) : 0;
        setDisplayValue(digitsOnly ? formatRupiah(num) : '');
        onChangeValue(num);
    };

    return (
        <View className="mb-4">
            {label && (
                <Text className="text-gray-700 font-semibold text-sm mb-1.5">{label}</Text>
            )}
            <View
                className={cn(
                    'flex-row items-center border rounded-xl bg-white',
                    focused ? 'border-primary-500' : 'border-gray-200',
                    error ? 'border-danger-500 bg-danger-50' : '',
                )}
            >
                {/* Prefix Rp */}
                <View className="pl-4 pr-2 py-3 border-r border-gray-200">
                    <Text className="text-gray-500 font-semibold text-base">Rp</Text>
                </View>
                <TextInput
                    className={cn('flex-1 px-3 py-3 text-gray-800 text-base font-semibold', className)}
                    value={displayValue}
                    onChangeText={handleChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    {...props}
                />
            </View>
            {error && <Text className="text-danger-600 text-xs mt-1 ml-1">{error}</Text>}
        </View>
    );
}
