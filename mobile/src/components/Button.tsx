import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    TouchableOpacityProps,
    View,
} from 'react-native';
import { cn } from '@/lib/utils';

interface ButtonProps extends TouchableOpacityProps {
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    leftIcon?: React.ReactNode;
    children: React.ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className,
    leftIcon,
    children,
    ...props
}: ButtonProps) {
    const base = 'rounded-xl items-center justify-center flex-row gap-2';

    const variants = {
        primary:   'bg-primary-600 active:bg-primary-700',
        secondary: 'bg-gray-100 active:bg-gray-200',
        outline:   'border-2 border-primary-600 bg-transparent active:bg-primary-50',
        danger:    'bg-danger-600 active:bg-danger-700',
        ghost:     'bg-transparent active:bg-gray-100',
    };

    const sizes = {
        sm: 'px-4 py-2',
        md: 'px-6 py-3',
        lg: 'px-8 py-4',
    };

    const textVariants = {
        primary:   'text-white font-semibold',
        secondary: 'text-gray-800 font-semibold',
        outline:   'text-primary-600 font-semibold',
        danger:    'text-white font-semibold',
        ghost:     'text-gray-700 font-semibold',
    };

    const textSizes = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            className={cn(base, variants[variant], sizes[size], isDisabled && 'opacity-50', className)}
            disabled={isDisabled}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : '#2563EB'} />
            ) : (
                <View className="flex-row items-center justify-center gap-2">
                    {leftIcon && <View>{leftIcon}</View>}
                    <Text className={cn(textVariants[variant], textSizes[size])}>{children}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}
