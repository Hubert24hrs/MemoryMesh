// src/components/Inputs/VoiceInput.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { WaveformVisualizer } from '../Visualizations/WaveformVisualizer';
import { GlassCard } from '../GlassCard';
import { useHaptics } from '../../hooks/useHaptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence 
} from 'react-native-reanimated';

interface VoiceInputProps {
  onRecordingComplete: (fileUri: string) => void;
  transcriptionPreview?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onRecordingComplete,
  transcriptionPreview = '',
}) => {
  const {
    isRecording,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
  } = useAudioRecorder();

  const { triggerSuccess, triggerLight, triggerMedium } = useHaptics();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1.0, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [isRecording]);

  const animatedRecordBtn = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handleRecordToggle = async () => {
    if (isRecording) {
      triggerMedium();
      const fileUri = await stopRecording();
      if (fileUri) {
        triggerSuccess();
        onRecordingComplete(fileUri);
      }
    } else {
      triggerLight();
      await startRecording();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <GlassCard style={styles.container} glowColor={isRecording ? '#FF0080' : '#00F5FF'}>
      {isRecording && (
        <View style={styles.waveContainer}>
          <WaveformVisualizer audioLevel={audioLevel} isActive={isRecording} />
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>
      )}

      {/* Transcription Preview Box */}
      {isRecording && transcriptionPreview.length > 0 && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>🔴 Live Streaming transcription...</Text>
          <Text style={styles.previewText}>{transcriptionPreview}</Text>
        </View>
      )}

      {/* Button Controller */}
      <View style={styles.buttonContainer}>
        <Animated.View style={[animatedRecordBtn]}>
          <Pressable 
            onPress={handleRecordToggle}
            style={[
              styles.recordBtn,
              isRecording ? styles.recordingActive : styles.recordingIdle
            ]}
          >
            <View style={styles.recordInner} />
          </Pressable>
        </Animated.View>
        <Text style={styles.statusText}>
          {isRecording ? 'TAP TO COMPLETE MEMORY' : 'TAP MICROPHONE TO SPEAK'}
        </Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
  },
  waveContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  durationText: {
    color: '#FF0080',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    marginTop: 8,
    letterSpacing: 1.5,
  },
  previewContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: 11,
    color: '#B026FF',
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 13,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  recordBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  recordingIdle: {
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderColor: '#00F5FF',
    borderWidth: 2,
  },
  recordingActive: {
    backgroundColor: 'rgba(255, 0, 128, 0.2)',
    borderColor: '#FF0080',
    borderWidth: 2,
  },
  recordInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF0080',
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Bold',
    marginTop: 12,
    letterSpacing: 1.2,
  },
});
export default VoiceInput;
