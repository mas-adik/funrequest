import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { cn } from '@/lib/utils';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    hint?: string;
    rightElement?: React.ReactNode;
}

export function Input({ label, error, hint, className, rightElement, ...props }: InputProps) {
    const [focused, setFocused] = useState(false);

    return (
        <View className="mb-4">
            {label && (
                <Text className="text-gray-700 font-semibold text-sm mb-1.5">{label}</Text>
            )}
            <View
                className={cn(
                    'flex-row items-center border rounded-xl px-4 bg-white',
                    focused ? 'border-primary-500' : 'border-gray-200',
                    error ? 'border-danger-500 bg-danger-50' : '',
                )}
            >
                <TextInput
                    className={cn(
                        'flex-1 py-3 text-gray-800 text-base',
                        className
                    )}
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    {...props}
                />
                {rightElement && <View className="ml-2">{rightElement}</View>}
            </View>
            {error && <Text className="text-danger-600 text-xs mt-1 ml-1">{error}</Text>}
            {hint && !error && <Text className="text-gray-400 text-xs mt-1 ml-1">{hint}</Text>}
        </View>
    );
}
