import React from 'react';
import { View, Text } from 'react-native';

interface FormSectionProps {
    title: string;
    children: React.ReactNode;
}

export function FormSection({ title, children }: FormSectionProps) {
    return (
        <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {title}
            </Text>
            <View>{children}</View>
        </View>
    );
}
