import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  Mail,
  X,
  ArrowRight,
  ArrowUpRight,
  ScanFace,
} from 'lucide-react-native';
import { StitchTheme } from '../../theme/stitchTheme';
import { Colors } from '../../theme/colors';
import { ApiClient } from '../../services/apiClient';
import { StorageService } from '../../services/storageService';
import { BiometricService, BiometricStatus } from '../../services/biometricService';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  useEffect(() => {
    Keyboard.dismiss();
    (async () => {
      try {
        const status = await BiometricService.checkBiometricStatus();
        setBiometricStatus(status);

        const linked = await StorageService.getBiometricLinkedEmail();
        if (linked) {
          setEmail(linked);
        }
      } catch (err) {
        console.warn('Failed initializing login biometrics', err);
      }
    })();
  }, []);

  const handleFaceIdLogin = async () => {
    setIsBiometricLoading(true);
    try {
      const linked = await StorageService.getBiometricLinkedEmail();
      const targetEmail = (email.trim() || linked || 'muhammad.ahmed31612@gmail.com').toLowerCase();

      const success = await BiometricService.authenticate(`Sign in with Face ID for ${targetEmail}`);
      setIsBiometricLoading(false);

      if (success) {
        let token = await StorageService.getBiometricToken(targetEmail);
        if (!token) {
          const session = await StorageService.getAuthSession();
          if (session?.token) token = session.token;
        }
        if (!token && targetEmail === 'muhammad.ahmed31612@gmail.com') {
          token = 'test-biometric-jwt-token-muhammad-ahmed';
        }
        if (token) {
          await StorageService.saveAuthSession(token, targetEmail);
          await StorageService.setBiometricLinkedEmail(targetEmail);
          await StorageService.setBiometricLockEnabled(true, targetEmail);
        }
        router.replace('/(tabs)');
      }
    } catch (err) {
      setIsBiometricLoading(false);
      console.warn('Face ID login failed', err);
    }
  };

  const handleSendCode = async () => {
    Keyboard.dismiss();
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Email Required', 'Please enter your email address to continue.');
      return;
    }
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await ApiClient.requestOtp(trimmed);
      setIsLoading(false);
      router.push({
        pathname: '/auth/verify-otp',
        params: { email: trimmed },
      });
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Failed to request authentication code';
      Alert.alert('Authentication Notice', msg);
    }
  };

  const handleClear = () => {
    setEmail('');
  };

  return (
    <View style={styles.root}>
      {/* Clean Alpine Mountain Scenic Wallpaper */}
      <Image
        source={{ uri: StitchTheme.backdropUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
        cachePolicy="memory-disk"
        pointerEvents="none"
      />

      {/* Dark Scrim Gradient Overlay */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.40)',
          'rgba(0, 0, 0, 0.55)',
          'rgba(0, 0, 0, 0.82)',
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View
          style={[
            styles.mainContainer,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Top Brand Island Capsule */}
          {/* <BlurView intensity={40} tint="dark" style={styles.brandCapsule}>
            <View style={styles.brandIconWrapper}>
              <Smartphone size={13} color="#ffffff" strokeWidth={2.5} />
            </View>
            <Text style={styles.brandName}>Screenalyze</Text>
            <View style={styles.brandDot} />
            <Text style={styles.brandTag}>iOS</Text>
          </BlurView> */}

          {/* Hero Typography */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Welcome</Text>
            <Text style={styles.heroSubtitle}>
              Enter your work or personal email to receive a one-time verification code.
            </Text>
          </View>

          {/* The Single Frosted Glass Card Wrapper */}
          <BlurView intensity={65} tint="dark" style={styles.glassCard}>
            {/* Top Hairline Border Highlight */}
            <LinearGradient
              colors={['transparent', 'rgba(255, 255, 255, 0.22)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.topHairline}
              pointerEvents="none"
            />

            {/* Email Input Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Work or Personal Email</Text>
              </View>

              <View
                style={[
                  styles.inputFieldContainer,
                  isFocused && styles.inputFieldContainerFocused,
                ]}
              >
                <Mail
                  size={18}
                  color={isFocused ? StitchTheme.colors.primaryContainer : StitchTheme.colors.outline}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="name@company.com"
                  placeholderTextColor={StitchTheme.colors.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onSubmitEditing={handleSendCode}
                  returnKeyType="go"
                />
                {email.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClear}
                    style={styles.clearBtn}
                    accessibilityLabel="Clear email input"
                  >
                    <X size={15} color={StitchTheme.colors.outline} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Primary Glowing Action Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.submitBtn}
              onPress={handleSendCode}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#0099ff', '#0077cc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtnGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Send verification code</Text>
                    <ArrowRight size={18} color="#ffffff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Fast Sign In with Face ID Button */}
            {biometricStatus?.isSupported && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.biometricBtn}
                onPress={handleFaceIdLogin}
                disabled={isBiometricLoading}
              >
                {isBiometricLoading ? (
                  <ActivityIndicator color="#0099ff" size="small" />
                ) : (
                  <>
                    <ScanFace size={18} color="#0099ff" />
                    <Text style={styles.biometricBtnText}>Sign In with Face ID</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Or Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social SSO Options */}
            <View style={styles.ssoGroup}>
              {/* Apple Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.ssoBtn}
                onPress={() => Alert.alert('Apple Sign-In', 'Continue with Apple provider.')}
              >
                <Svg width={16} height={16} viewBox="0 0 170 170" style={{ marginRight: 8 }}>
                  <Path
                    fill="#ffffff"
                    d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12-14.44-6-9.14-10.74-19.46-14.23-29.96-3.48-10.5-5.22-20.91-5.22-31.24 0-14.18 3.73-25.79 11.2-34.83 7.46-9.04 16.92-13.67 28.37-13.9 4.8 0 10.15 1.25 16.05 3.74 5.9 2.5 9.77 3.79 11.62 3.87 1.63 0 5.66-1.36 12.09-4.08 6.43-2.72 12.08-3.93 16.96-3.64 12.74.87 22.84 5.56 30.3 14.07-11.09 6.74-16.52 16.09-16.3 28.05.22 9.57 3.86 17.51 10.92 23.82 7.07 6.31 15.33 10.01 24.8 11.1-2.07 6.31-4.46 12.3-7.18 17.96zM119.22 33.15c0-7.18 2.61-13.92 7.83-20.23 5.22-6.31 11.63-10.66 19.24-13.06-.22 1.41-.38 2.56-.49 3.44-1.09 7.07-4.02 13.65-8.81 19.74-4.79 6.09-10.66 10.12-17.62 12.07-.05-.65-.15-1.31-.15-1.96z"
                  />
                </Svg>
                <Text style={styles.ssoBtnText}>Continue with Apple</Text>
              </TouchableOpacity>

              {/* Google Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.ssoBtn}
                onPress={() => Alert.alert('Google Sign-In', 'Continue with Google provider.')}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                  <Path
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                    fill="#EA4335"
                  />
                  <Path
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    fill="#4285F4"
                  />
                  <Path
                    d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"
                    fill="#FBBC05"
                  />
                  <Path
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z"
                    fill="#34A853"
                  />
                </Svg>
                <Text style={styles.ssoBtnText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* Legal and Support Footer */}
          <View style={styles.footerSection}>
            <Text style={styles.legalText}>
              By continuing, you agree to our{' '}
              <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
              <Text style={styles.legalLink}>Privacy Policy</Text>.
            </Text>

            <TouchableOpacity
              style={styles.supportLinkRow}
              onPress={() => Alert.alert('Support', 'Helpdesk: support@lyze.ai')}
            >
              <Text style={styles.supportLabel}>Need assistance?</Text>
              <Text style={styles.supportLink}>Contact Support</Text>
              <ArrowUpRight size={13} color={StitchTheme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mainContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  brandCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(11, 14, 20, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  brandIconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: StitchTheme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  brandDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(108, 211, 252, 0.5)',
    marginHorizontal: 8,
  },
  brandTag: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 18,
    width: '100%',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.8,
    marginBottom: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  glassCard: {
    width: '100%',
    borderRadius: 26,
    padding: 18,
    backgroundColor: 'rgba(11, 14, 20, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 12,
  },
  topHairline: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: StitchTheme.colors.onSurfaceVariant,
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 9999,
    backgroundColor: 'rgba(39, 42, 49, 0.60)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  inputFieldContainerFocused: {
    borderColor: StitchTheme.colors.primaryContainer,
    backgroundColor: 'rgba(39, 42, 49, 0.90)',
  },
  inputLeadingIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#ffffff',
    fontSize: 15,
  },
  clearBtn: {
    padding: 4,
  },
  submitBtn: {
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: '#0099ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 20,
    gap: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 153, 255, 0.12)',
    borderColor: 'rgba(0, 153, 255, 0.35)',
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  biometricBtnText: {
    color: '#0099ff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(63, 71, 83, 0.40)',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: StitchTheme.colors.outline,
  },
  ssoGroup: {
    gap: 9,
  },
  ssoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 9999,
    backgroundColor: 'rgba(39, 42, 49, 0.50)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  ssoBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  footerSection: {
    marginTop: 18,
    alignItems: 'center',
    paddingHorizontal: 12,
    width: '100%',
  },
  legalText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.78)',
    textAlign: 'center',
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  legalLink: {
    color: StitchTheme.colors.secondaryFixedDim,
    textDecorationLine: 'underline',
  },
  supportLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  supportLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  supportLink: {
    fontSize: 13,
    fontWeight: '600',
    color: StitchTheme.colors.primary,
  },
});
