// src/screens/Capture/CaptureScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Image } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { HolographicBackground } from '../../components/HolographicBackground';
import { GlassCard } from '../../components/GlassCard';
import { VoiceInput } from '../../components/Inputs/VoiceInput';
import { useHaptics } from '../../hooks/useHaptics';
import { memoryService } from '../../services/memory';
import { useAuthStore } from '../../store/authStore';
import { useMemoryStore } from '../../store/memoryStore';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

type CaptureRouteProp = RouteProp<RootStackParamList, 'Capture'>;
type CaptureMode = 'voice' | 'text' | 'image';

export const CaptureScreen: React.FC = () => {
  const route = useRoute<CaptureRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const defaultMode = route.params?.mode || 'text';

  const [mode, setMode] = useState<CaptureMode>(defaultMode);
  const [textContent, setTextContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuthStore();
  const { fetchMemories } = useMemoryStore();
  const { triggerLight, triggerSuccess, triggerError } = useHaptics();

  const handlePickImage = async () => {
    triggerLight();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCaptureSubmit = async (customContent?: string, audioUrl?: string) => {
    if (isSubmitting) return;

    const contentToSave = customContent || (mode === 'text' ? textContent : imageCaption);
    if (!contentToSave.trim() && !imageUri && !audioUrl) {
      triggerError();
      return;
    }

    setIsSubmitting(true);
    triggerLight();

    try {
      // 1. Core memory creation
      const created = await memoryService.createMemory({
        userId: user?.id || '',
        content: contentToSave || (imageUri ? '[Image Capture]' : '[Voice Recording]'),
        type: mode,
        audioUrl,
        imageUrl: imageUri || undefined,
      });

      // 2. Fetch fresh local memory list
      await fetchMemories(true);

      triggerSuccess();
      
      // Navigate to Processing screen for premium checks
      navigation.navigate('Processing', { tempMemoryId: created.id });
    } catch (e) {
      console.error('Submission failed:', e);
      triggerError();
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <HolographicBackground />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { triggerLight(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#00F5FF" />
        </Pressable>
        <Text style={styles.headerText}>Capture Core</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Dynamic Mode Sliding Indicator tab */}
      <View style={styles.modesRow}>
        <Pressable 
          onPress={() => { triggerLight(); setMode('text'); }} 
          style={[styles.modeTab, mode === 'text' && styles.activeModeTab]}
        >
          <Text style={[styles.modeText, mode === 'text' && styles.activeModeText]}>TEXT</Text>
        </Pressable>
        <Pressable 
          onPress={() => { triggerLight(); setMode('voice'); }} 
          style={[styles.modeTab, mode === 'voice' && styles.activeModeTab]}
        >
          <Text style={[styles.modeText, mode === 'voice' && styles.activeModeText]}>VOICE</Text>
        </Pressable>
        <Pressable 
          onPress={() => { triggerLight(); setMode('image'); }} 
          style={[styles.modeTab, mode === 'image' && styles.activeModeTab]}
        >
          <Text style={[styles.modeText, mode === 'image' && styles.activeModeText]}>IMAGE</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {mode === 'text' && (
          <GlassCard style={styles.card} glowColor="#00F5FF">
            <Text style={styles.label}>WHAT IS ON YOUR MIND?</Text>
            <TextInput
              multiline
              style={styles.textArea}
              placeholder="Record your thoughts, tasks, or lessons..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={textContent}
              onChangeText={setTextContent}
              maxLength={2000}
            />
            <Text style={styles.charCount}>{textContent.length}/2000</Text>
            
            <Pressable onPress={() => handleCaptureSubmit()} style={styles.submitBtn}>
              <Text style={styles.submitBtnText}>INTEGRATE THOUGHT</Text>
            </Pressable>
          </GlassCard>
        )}

        {mode === 'voice' && (
          <VoiceInput 
            onRecordingComplete={(uri) => handleCaptureSubmit('Voice capture transcript', uri)} 
            transcriptionPreview="Streaming transcript preview matches sound..."
          />
        )}

        {mode === 'image' && (
          <View style={{ gap: 16 }}>
            <GlassCard style={styles.card} glowColor="#FF0080">
              <Text style={styles.label}>VISUAL INTEGRATION</Text>
              
              {imageUri ? (
                <View style={styles.previewBox}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                  <Pressable onPress={() => setImageUri(null)} style={styles.clearImageBtn}>
                    <Ionicons name="trash" size={18} color="#ffffff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={handlePickImage} style={styles.uploadBox}>
                  <Ionicons name="image-outline" size={40} color="#FF0080" />
                  <Text style={styles.uploadText}>Select from Media Library</Text>
                </Pressable>
              )}
            </GlassCard>

            {imageUri && (
              <GlassCard glowColor="#B026FF">
                <Text style={styles.label}>IMAGE CONTEXT / CAPTION</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="What is the significance of this image?"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={imageCaption}
                  onChangeText={setImageCaption}
                />
                
                <Pressable onPress={() => handleCaptureSubmit()} style={styles.submitBtn}>
                  <Text style={styles.submitBtnText}>INTEGRATE IMAGE</Text>
                </Pressable>
              </GlassCard>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    padding: 6,
  },
  headerText: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    letterSpacing: 1.0,
  },
  modesRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    marginHorizontal: 16,
    height: 44,
    padding: 3,
    marginBottom: 16,
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
  },
  modeTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 11,
  },
  activeModeTab: {
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderColor: '#00F5FF',
    borderWidth: 1,
  },
  modeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 1.2,
  },
  activeModeText: {
    color: '#00F5FF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    padding: 20,
  },
  label: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#B026FF',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  textArea: {
    height: 160,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    marginTop: 6,
  },
  textInput: {
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 12,
    color: '#ffffff',
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#00F5FF',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#00F5FF',
    shadowRadius: 8,
    shadowOpacity: 0.3,
  },
  submitBtnText: {
    color: '#00F5FF',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  uploadBox: {
    height: 180,
    borderColor: 'rgba(255, 0, 128, 0.2)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 128, 0.03)',
  },
  uploadText: {
    color: '#FF0080',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    letterSpacing: 1.0,
    marginTop: 8,
  },
  previewBox: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  clearImageBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default CaptureScreen;
