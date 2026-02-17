import React from 'react';
import { View, ActivityIndicator } from 'react-native';

export const LoadingScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#00F5FF" />
    </View>
);
