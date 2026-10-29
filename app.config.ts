import type { ConfigContext, ExpoConfig } from 'expo/config';

// AdMob app IDs are public identifiers, but they differ per environment, so
// they come from build-time env vars. Google's sample IDs are used otherwise.
const ADMOB_IOS_APP_ID = process.env.ADMOB_IOS_APP_ID ?? 'ca-app-pub-3940256099942544~1458002511';
const ADMOB_ANDROID_APP_ID = process.env.ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'MemoryMesh',
  slug: 'memorymesh',
  version: '3.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'memorymesh',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.memorymesh.app',
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.memorymesh.app',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#0B0D10' },
    permissions: ['android.permission.RECORD_AUDIO', 'android.permission.USE_BIOMETRIC'],
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        backgroundColor: '#FFFFFF',
        dark: { image: './assets/splash-icon.png', backgroundColor: '#0B0D10' },
      },
    ],
    'expo-sqlite',
    'expo-secure-store',
    'expo-font',
    ['expo-local-authentication', { faceIDPermission: 'Unlock MemoryMesh with Face ID.' }],
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'MemoryMesh records your voice to turn it into a note.',
        speechRecognitionPermission: 'MemoryMesh transcribes your voice notes as you speak.',
        androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
      },
    ],
    [
      'expo-share-intent',
      {
        iosActivationRules: {
          NSExtensionActivationSupportsWebURLWithMaxCount: 1,
          NSExtensionActivationSupportsWebPageWithMaxCount: 1,
          NSExtensionActivationSupportsText: true,
          NSExtensionActivationSupportsImageWithMaxCount: 4,
        },
        androidIntentFilters: ['text/*', 'image/*'],
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        iosAppId: ADMOB_IOS_APP_ID,
        androidAppId: ADMOB_ANDROID_APP_ID,
      },
    ],
  ],
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
