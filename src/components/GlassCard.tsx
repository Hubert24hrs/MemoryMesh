import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';

interface GlassCardProps extends ViewProps {
    intensity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    style,
    intensity = 20,
    ...props
}) => {
    return (
        <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            style={[styles.container, style]}
            {...props}
        >
            <BlurView intensity={intensity} style={StyleSheet.absoluteFill} tint="dark" />
            <View style={styles.content}>{children}</View>
        </MotiView>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    content: {
        padding: 16,
    },
});
