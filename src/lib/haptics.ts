import * as Haptics from 'expo-haptics';

// Subtle feedback only; failures (e.g. unsupported hardware) are ignored.
export const haptic = {
  tap: () => Haptics.selectionAsync().catch(() => undefined),
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
};
