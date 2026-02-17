import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const HolographicBackground: React.FC = () => {
    return (
        <View style={StyleSheet.absoluteFill}>
            <LinearGradient
                colors={['#0f172a', '#1e1b4b', '#312e81']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={['transparent', 'rgba(0, 245, 255, 0.05)', 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
};
