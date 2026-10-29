import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { CaptureScreen } from '../screens/CaptureScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { CollectionScreen, CollectionsScreen } from '../screens/CollectionsScreen';
import { EditorScreen } from '../screens/EditorScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { useSettings } from '../store/settings';
import { font, useTheme } from '../theme/theme';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, keyof typeof Feather.glyphMap> = {
  Notes: 'file-text',
  Search: 'search',
  Chat: 'message-circle',
  Capture: 'mic',
};

function Tabs() {
  const { c } = useTheme();
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.accentText,
        tabBarInactiveTintColor: c.textFaint,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.border },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
        tabBarIcon: ({ color, size }) => <Feather name={TAB_ICONS[route.name]} size={size - 2} color={color} />,
      })}
    >
      <Tab.Screen name="Notes" component={NotesScreen} options={{ title: t('tabs.notes') }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: t('tabs.search') }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: t('tabs.chat') }} />
      <Tab.Screen name="Capture" component={CaptureScreen} options={{ title: t('tabs.capture') }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { c } = useTheme();
  const { t } = useTranslation();
  const onboarded = useSettings((s) => s.onboarded);
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerTitleStyle: { fontFamily: font.semibold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      {!onboarded ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="Editor" component={EditorScreen} options={{ title: '' }} />
          <Stack.Screen name="Collections" component={CollectionsScreen} options={{ title: t('collections.title') }} />
          <Stack.Screen name="Collection" component={CollectionScreen} options={({ route }) => ({ title: route.params.name })} />
          <Stack.Screen name="Insights" component={InsightsScreen} options={{ title: t('insights.title') }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings.title') }} />
        </>
      )}
      <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: t('auth.title'), presentation: 'modal' }} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{ headerShown: false, presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
