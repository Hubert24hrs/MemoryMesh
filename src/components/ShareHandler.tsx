import { useShareIntentContext } from 'expo-share-intent';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { haptic } from '../lib/haptics';
import { navigationRef } from '../navigation/ref';
import { NoteLimitError, captureShare } from '../services/capture';
import { useSettings } from '../store/settings';

/** Turns links, text and images shared from other apps into clip notes. */
export function ShareHandler() {
  const { t } = useTranslation();
  const onboarded = useSettings((s) => s.onboarded);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent || !onboarded) return;
    void (async () => {
      try {
        const note = await captureShare(shareIntent);
        if (note) {
          haptic.success();
          if (navigationRef.isReady()) navigationRef.navigate('Editor', { noteId: note.id });
        }
      } catch (error) {
        if (error instanceof NoteLimitError && navigationRef.isReady()) navigationRef.navigate('Paywall');
        else Alert.alert(t('common.error'), String(error));
      } finally {
        resetShareIntent();
      }
    })();
  }, [hasShareIntent, shareIntent, onboarded, resetShareIntent, t]);

  return null;
}
