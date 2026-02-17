import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';

export const MemoryPreviewCard = ({ memory, onPress }: any) => (
    <TouchableOpacity onPress={onPress}>
        <GlassCard style={styles.card}>
            <Text style={styles.text} numberOfLines={2}>{memory.content || 'Voice Memory'}</Text>
            <Text style={styles.date}>{new Date(memory.createdAt).toLocaleDateString()}</Text>
        </GlassCard>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    card: { padding: 16, marginBottom: 12 },
    text: { color: 'white', fontSize: 14 },
    date: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
});
