import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const StreakCounter = ({ days }: { days: number }) => (
    <View style={styles.container}>
        <Ionicons name="flame" size={20} color="#f97316" />
        <Text style={styles.text}>{days} days</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 20 },
    text: { color: 'white', marginLeft: 4, fontWeight: 'bold' },
});
