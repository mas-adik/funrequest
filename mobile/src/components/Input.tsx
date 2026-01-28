import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { cn } from '@/lib/utils';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerClassName?: string;
}

export function Input({
    label,
    error,
    containerClassName,
    className,
    ...props
}: InputProps) {
    return (
        <View className={cn('mb-4', containerClassName)}>
            {label && (
                <Text className="text-warmGray-700 font-medium mb-2 text-sm">
                    {label}
                </Text>
            )}
            <TextInput
                className={cn(
                    'border-2 rounded-lg px-4 py-3 text-base',
                    error
                        ? 'border-red-500 bg-red-50'
                        : 'border-warmGray-300 bg-white focus:border-sage',
                    className
                )}
                placeholderTextColor="#a8a29e"
                {...props}
            />
            {error && (
                <Text className="text-red-500 text-sm mt-1">{error}</Text>
            )}
        </View>
    );
}
