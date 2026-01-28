import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    TouchableOpacityProps,
} from 'react-native';
import { cn } from '@/lib/utils';

interface ButtonProps extends TouchableOpacityProps {
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    children: React.ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className,
    children,
    ...props
}: ButtonProps) {
    const baseStyles = 'rounded-lg items-center justify-center flex-row';

    const variantStyles = {
        primary: 'bg-sage active:bg-primary-600',
        secondary: 'bg-warmGray-200 active:bg-warmGray-300',
        outline: 'border-2 border-sage bg-transparent active:bg-sage/10',
    };

    const sizeStyles = {
        sm: 'px-4 py-2',
        md: 'px-6 py-3',
        lg: 'px-8 py-4',
    };

    const textVariantStyles = {
        primary: 'text-white font-semibold',
        secondary: 'text-warmGray-800 font-semibold',
        outline: 'text-sage font-semibold',
    };

    const textSizeStyles = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            className={cn(
                baseStyles,
                variantStyles[variant],
                sizeStyles[size],
                isDisabled && 'opacity-50',
                className
            )}
            disabled={isDisabled}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? '#fff' : '#6B8E6F'} />
            ) : (
                <Text className={cn(textVariantStyles[variant], textSizeStyles[size])}>
                    {children}
                </Text>
            )}
        </TouchableOpacity>
    );
}
