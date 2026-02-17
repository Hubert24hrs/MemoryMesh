import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';
import { Ionicons } from '@expo/vector-icons';

export const ProactiveInsightCard = ({ insight, onPress }: any) => (
    <TouchableOpacity onPress={onPress}>
        <GlassCard style={styles.card}>
            <Ionicons name="bulb-outline" size={24} color="#fbbf24" />
            <Text style={styles.title}>{insight.title}</Text>
            <Text style={styles.desc}>{insight.description}</Text>
        </GlassCard>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    card: { padding: 16, marginBottom: 16 },
    title: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
    desc: { color: '#cbd5e1', marginTop: 8 },
});
