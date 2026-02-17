import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';

interface FABProps {
    onPress: () => void;
}

export default function FloatingActionButton({ onPress }: FABProps) {
    return (
        <MotiView
            from={{ opacity: 0, scale: 0.5, translateY: 100 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            style={{ position: 'absolute', bottom: 30, right: 30 }}
        >
            <TouchableOpacity
                onPress={onPress}
                className="w-16 h-16 bg-cyan-400 rounded-full items-center justify-center shadow-lg shadow-cyan-500/50"
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>
        </MotiView>
    );
}
