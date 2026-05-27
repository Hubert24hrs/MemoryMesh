// src/screens/Auth/AuthScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  Pressable 
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useHaptics } from '../../hooks/useHaptics';
import { HolographicBackground } from '../../components/HolographicBackground';
import { GlassCard } from '../../components/GlassCard';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signUp, isLoading, error, biometricEnabled, authenticateWithBiometric } = useAuthStore();
  const { triggerLight, triggerSuccess, triggerError } = useHaptics();

  const handleAuthSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      triggerError();
      return;
    }
    
    triggerLight();
    if (isLogin) {
      await signIn(email, password);
    } else {
      await signUp(email, password);
    }
  };

  const handleBiometricPress = async () => {
    triggerLight();
    const success = await authenticateWithBiometric();
    if (success) {
      triggerSuccess();
    } else {
      triggerError();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <HolographicBackground />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.neonRing}>
            <Text style={styles.logoIcon}>🧠</Text>
          </View>
          <Text style={styles.logoText}>MemoryMesh</Text>
          <Text style={styles.logoTagline}>WORLD-CLASS COGNITIVE SYNAPSE</Text>
        </View>

        <GlassCard style={styles.card} glowColor="#00F5FF">
          {/* Animated Tab Selector */}
          <View style={styles.tabsRow}>
            <Pressable 
              onPress={() => { triggerLight(); setIsLogin(true); }}
              style={[styles.tab, isLogin && styles.activeTab]}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>SIGN IN</Text>
            </Pressable>
            <Pressable 
              onPress={() => { triggerLight(); setIsLogin(false); }}
              style={[styles.tab, !isLogin && styles.activeTab]}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>SIGN UP</Text>
            </Pressable>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Form Fields */}
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>NEURAL CHANNEL (EMAIL)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your email"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="Email entry"
            />
          </View>

          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>ACCESS KEY (PASSWORD)</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.textInput, { flex: 1, borderWidth: 0, padding: 0 }]}
                placeholder="Enter password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                accessibilityLabel="Password entry"
              />
              <Pressable onPress={() => { triggerLight(); setShowPassword(!showPassword); }}>
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Biometrics quick access */}
          {isLogin && biometricEnabled && (
            <Pressable onPress={handleBiometricPress} style={styles.bioBtn}>
              <Text style={styles.bioText}>🔑 UNLOCK WITH BIOMETRICS</Text>
            </Pressable>
          )}

          <Pressable 
            onPress={handleAuthSubmit}
            disabled={isLoading}
            style={[styles.submitBtn, { backgroundColor: isLogin ? '#00F5FF20' : '#B026FF20', borderColor: isLogin ? '#00F5FF' : '#B026FF' }]}
          >
            {isLoading ? (
              <ActivityIndicator color="#00F5FF" />
            ) : (
              <Text style={[styles.submitBtnText, { color: isLogin ? '#00F5FF' : '#B026FF' }]}>
                {isLogin ? 'ESTABLISH LINK' : 'INITIALIZE PROTOCOL'}
              </Text>
            )}
          </Pressable>
        </GlassCard>

        {/* Social Authentication shortcuts */}
        <View style={styles.socialContainer}>
          <Text style={styles.socialDivider}>OR SIGN IN SECURELY VIA</Text>
          <View style={styles.socialRow}>
            <Pressable onPress={triggerLight} style={styles.socialBtn}>
              <Text style={styles.socialBtnText}>🍎 APPLE</Text>
            </Pressable>
            <Pressable onPress={triggerLight} style={styles.socialBtn}>
              <Text style={styles.socialBtnText}>🌐 GOOGLE</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  neonRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#00F5FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00F5FF',
    shadowRadius: 10,
    shadowOpacity: 0.5,
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
  },
  logoIcon: {
    fontSize: 32,
  },
  logoText: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    marginTop: 12,
    letterSpacing: 1.5,
  },
  logoTagline: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#B026FF',
    letterSpacing: 3,
    marginTop: 4,
  },
  card: {
    width: '100%',
    padding: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00F5FF',
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
  },
  activeTabText: {
    color: '#00F5FF',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputBox: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#B026FF',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  passwordRow: {
    flexDirection: 'row',
    height: 48,
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  eyeIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  bioBtn: {
    alignSelf: 'center',
    marginVertical: 10,
  },
  bioText: {
    color: '#00F5FF',
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 1.2,
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#00F5FF',
    shadowRadius: 10,
    shadowOpacity: 0.3,
  },
  submitBtnText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 2.0,
  },
  socialContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  socialDivider: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2.0,
    marginBottom: 16,
  },
  socialRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  socialBtn: {
    width: '48%',
    height: 44,
    borderRadius: 12,
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialBtnText: {
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    letterSpacing: 1.5,
  },
});
export default AuthScreen;
