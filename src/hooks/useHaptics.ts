// src/hooks/useHaptics.ts
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store/settingsStore';

export const useHaptics = () => {
  const hapticEnabled = useSettingsStore((state) => state.hapticEnabled);

  const triggerLight = async () => {
    if (hapticEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const triggerMedium = async () => {
    if (hapticEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const triggerHeavy = async () => {
    if (hapticEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  const triggerSuccess = async () => {
    if (hapticEnabled) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const triggerError = async () => {
    if (hapticEnabled) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return {
    triggerLight,
    triggerMedium,
    triggerHeavy,
    triggerSuccess,
    triggerError,
  };
};
export default useHaptics;
