// src/navigation/AuthNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthScreen } from '../screens/Auth/AuthScreen';
import { WelcomeScreen } from '../screens/Onboarding/WelcomeScreen';

// Stub panels to support quick, clean builds
import { View, Text } from 'react-native';
const StubAuthPanel = (name: string) => () => (
  <View style={{ flex: 1, backgroundColor: '#0A0A1A', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#00F5FF', fontSize: 18, fontFamily: 'SpaceGrotesk-Bold' }}>{name} Panel</Text>
  </View>
);

const BiometricAuthScreen = StubAuthPanel('Biometric Unlock');
const ForgotPasswordScreen = StubAuthPanel('Forgot Password');

export type AuthStackParamList = {
  Welcome: undefined;
  AuthScreen: undefined;
  BiometricAuth: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="AuthScreen" component={AuthScreen} />
      <Stack.Screen name="BiometricAuth" component={BiometricAuthScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};
export default AuthNavigator;
