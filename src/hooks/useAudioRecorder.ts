// src/hooks/useAudioRecorder.ts
import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { usePermissions } from './usePermissions';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  
  const { requestPermission } = usePermissions();
  const recordingRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Unmount cleanup
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(console.error);
      }
    };
  }, []);

  /**
   * Initialize and start the device microphone recording session
   */
  const startRecording = async (): Promise<void> => {
    try {
      const granted = await requestPermission('microphone');
      if (!granted) {
        throw new Error('Microphone permission is required');
      }

      // iOS specific Gotcha: Set AVAudioSession category to PlayAndRecord
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldRouteThroughEarpieceIOS: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setUri(null);
      setDuration(0);
      setIsRecording(true);

      // Decibel and time tracking loop
      intervalRef.current = setInterval(async () => {
        if (!recordingRef.current) return;
        
        const status = await recordingRef.current.getStatusAsync();
        setDuration(Math.floor(status.durationMillis / 1000));
        
        // Simulating floating decibel level between 0 and 1
        const randomFluctuation = Math.random() * 0.4 + 0.1;
        setAudioLevel(randomFluctuation);
      }, 200);

    } catch (e) {
      console.error('Failed to start audio recording:', e);
      setIsRecording(false);
    }
  };

  /**
   * Stop recording and return the resulting local file URI path
   */
  const stopRecording = async (): Promise<string | null> => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!recordingRef.current) return null;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const fileUri = recordingRef.current.getURI();
      
      setIsRecording(false);
      setUri(fileUri);
      recordingRef.current = null;
      
      // Reset mode settings
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      return fileUri;
    } catch (e) {
      console.error('Failed to stop audio recording:', e);
      setIsRecording(false);
      return null;
    }
  };

  /**
   * Play back recording locally
   */
  const playback = async (audioUri: string): Promise<void> => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.error('Failed to play back recording:', e);
    }
  };

  return {
    isRecording,
    duration,
    audioLevel,
    uri,
    startRecording,
    stopRecording,
    playback,
  };
};
export default useAudioRecorder;
