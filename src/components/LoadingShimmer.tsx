import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export const LoadingShimmer = () => (
    <View style={styles.container}>
        <ActivityIndicator size="large" color="#00F5FF" />
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
