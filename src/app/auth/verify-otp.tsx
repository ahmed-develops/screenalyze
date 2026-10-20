import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  HelpCircle,
  MailCheck,
  Pencil,
  ClipboardPaste,
  Clock,
  ArrowRight,
  Gift,
  CreditCard,
  Headphones,
} from 'lucide-react-native';
import { StitchTheme } from '../../theme/stitchTheme';
import { Colors } from '../../theme/colors';
import { ApiClient } from '../../services/apiClient';
import { StorageService } from '../../services/storageService';
import { BiometricService } from '../../services/biometricService';

export default function VerifyOtpScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || 'muhammad.ahmed31612@gmail.com';

  const [otp, setOtp] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const canResend = countdown === 0;
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [clipboardCode, setClipboardCode] = useState<string | null>('842109');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Keyboard.dismiss();
    inputRef.current?.blur();
  }, []);

  useEffect(() => {
    // Check real device clipboard for 6-digit number
    (async () => {
      try {
        const text = await Clipboard.getStringAsync();
        const digits = text.replace(/\D/g, '');
        if (digits.length === 6) {
          setClipboardCode(digits);
        }
      } catch {
        // Fallback demo clipboard code
      }
    })();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const dismissKeypad = () => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    setIsInputFocused(false);
  };

  const handleQuickPaste = () => {
    if (clipboardCode && !isVerifying && !isVerified) {
      const chars = clipboardCode.slice(0, 6).split('');
      setOtp(chars);
      dismissKeypad();
      verifyCode(chars.join(''));
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setOtp([]);
    setCountdown(60);
    try {
      await ApiClient.requestOtp(email);
      Alert.alert('Code Sent', `A new 6-digit verification code has been dispatched to ${email}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to resend verification code';
      Alert.alert('Notice', msg);
    }
  };

  const verifyCode = async (code: string) => {
    dismissKeypad();
    setIsVerifying(true);
    try {
      const authRes = await ApiClient.verifyOtp(email, code);
      setIsVerifying(false);
      setIsVerified(true);
      Keyboard.dismiss();
      inputRef.current?.blur();

      // Persist session token & profile returned from backend
      if (authRes.token) {
        await StorageService.saveAuthSession(authRes.token, email);
      }
      if (authRes.user) {
        await StorageService.saveUserProfile(authRes.user);
      }

      // Check device biometric capabilities
      const biometricStatus = await BiometricService.checkBiometricStatus();

      // If biometrics is supported on this device, prompt user for consent
      if (biometricStatus.isSupported) {
        setTimeout(() => {
          Alert.alert(
            `Enable ${biometricStatus.label}?`,
            `Would you like to use ${biometricStatus.label} to log in automatically next time you open Screenalyze?`,
            [
              {
                text: 'Not Now',
                style: 'cancel',
                onPress: async () => {
                  await StorageService.setBiometricLockEnabled(false, email);
                  await StorageService.saveUserProfile({ biometricLock: false });
                  Keyboard.dismiss();
                  router.replace('/(tabs)');
                },
              },
              {
                text: `Enable ${biometricStatus.label}`,
                style: 'default',
                onPress: async () => {
                  const authenticated = await BiometricService.authenticate(
                    `Enable ${biometricStatus.label} for ${email}`
                  );
                  if (authenticated) {
                    if (authRes.token) {
                      await StorageService.setBiometricLinkedEmail(email);
                      await StorageService.saveBiometricToken(email, authRes.token);
                    }
                    await StorageService.setBiometricLockEnabled(true, email);
                    await StorageService.saveUserProfile({ biometricLock: true });
                  } else {
                    await StorageService.setBiometricLockEnabled(false, email);
                    await StorageService.saveUserProfile({ biometricLock: false });
                  }
                  Keyboard.dismiss();
                  router.replace('/(tabs)');
                },
              },
            ],
            { cancelable: false }
          );
        }, 150);
      } else {
        await StorageService.setBiometricLockEnabled(false, email);
        setTimeout(() => {
          Alert.alert('Success', 'Email verified successfully! Welcome to Screenalyze.', [
            {
              text: 'Get Started',
              onPress: () => {
                Keyboard.dismiss();
                router.replace('/(tabs)');
              },
            },
          ]);
        }, 100);
      }
    } catch (err: unknown) {
      setIsVerifying(false);
      const msg = err instanceof Error ? err.message : 'Invalid verification code.';
      Alert.alert('Verification Failed', msg);
    }
  };

  const handleManualVerify = () => {
    if (isVerifying || isVerified) return;
    if (otp.length < 6) {
      Alert.alert('Incomplete Code', 'Please enter all 6 digits of your verification code.');
      return;
    }
    dismissKeypad();
    verifyCode(otp.join(''));
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

      {/* Atmospheric Scrim Gradients */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.35)',
          'rgba(0, 0, 0, 0.60)',
          'rgba(0, 0, 0, 0.85)',
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* 100% Transparent Title Bar Floating over Wallpaper */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            dismissKeypad();
            router.back();
          }}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Verify</Text>

        <TouchableOpacity
          onPress={() => Alert.alert('Help', 'Enter the 6-digit code received in your inbox.')}
          style={styles.headerBtn}
          accessibilityLabel="Help"
        >
          <HelpCircle size={20} color="rgba(255, 255, 255, 0.75)" />
        </TouchableOpacity>
      </View>

      {/* Centered Main Content Container */}
      <TouchableWithoutFeedback onPress={dismissKeypad} accessible={false}>
        <View
          style={[
            styles.mainContainer,
            {
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
        {/* Main Hero Frosted Capsule Card */}
        <BlurView intensity={65} tint="dark" style={styles.heroCard}>
          {/* Top Hairline Border Highlight */}
          <LinearGradient
            colors={['transparent', 'rgba(255, 255, 255, 0.22)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topHairline}
            pointerEvents="none"
          />

          {/* Atmospheric Watermark Icon */}
          <View style={styles.iconCircleOuter}>
            <View style={styles.iconCircleInner}>
              <MailCheck size={22} color={StitchTheme.colors.primaryContainer} />
            </View>
          </View>

          {/* Title and Subtitle */}
          <Text style={styles.title}>Verify your code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {/* Edit Email Action */}
          <TouchableOpacity
            style={styles.editEmailBtn}
            onPress={() => {
              dismissKeypad();
              router.back();
            }}
          >
            <Text style={styles.editEmailText}>Edit email address</Text>
            <Pencil size={13} color={StitchTheme.colors.primaryContainer} />
          </TouchableOpacity>

          {/* Clipboard Auto-Fill Pill */}
          {clipboardCode && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.clipboardPill}
              onPress={handleQuickPaste}
            >
              <ClipboardPaste size={14} color={StitchTheme.colors.primaryContainer} />
              <Text style={styles.clipboardPillLabel}>Code detected in clipboard:</Text>
              <Text style={styles.clipboardPillCode}>
                {clipboardCode.slice(0, 3)}-{clipboardCode.slice(3, 6)}
              </Text>
            </TouchableOpacity>
          )}

          {/* 6-Digit OTP Interactive Boxes Area with Direct Pressable Native Keypad trigger */}
          <Pressable
            style={styles.otpBoxesContainer}
            disabled={isVerifying || isVerified}
            onPress={() => {
              if (!isVerifying && !isVerified) {
                setIsInputFocused(true);
                inputRef.current?.focus();
              }
            }}
          >
            <View style={styles.otpBoxesRow} pointerEvents="none">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const isFilled = index < otp.length;
                const isFocused = isInputFocused && index === otp.length;

                return (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      isFilled && styles.otpBoxFilled,
                      isFocused && styles.otpBoxFocused,
                    ]}
                  >
                    {isFilled ? (
                      <Text style={styles.otpDigitText}>{otp[index]}</Text>
                    ) : isFocused ? (
                      <View style={styles.cursorBlinker} />
                    ) : (
                      <View style={styles.emptyDot} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Reliable Native Number Pad Input Overlay - completely unmounted on verification to prevent iOS Alert keypad restore flicker */}
            {!isVerified && (
              <TextInput
                ref={inputRef}
                style={styles.otpInputOverlay}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp.join('')}
                editable={!isVerifying && !isVerified}
                caretHidden={true}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '').slice(0, 6);
                  setOtp(cleaned.split(''));
                  if (cleaned.length === 6) {
                    verifyCode(cleaned);
                  }
                }}
              />
            )}
          </Pressable>

          {/* Resend Timer Frosted Badge */}
          <View style={styles.resendBadge}>
            <Clock size={13} color={StitchTheme.colors.outline} />
            <Text style={styles.resendLabel}>{"Didn't receive code?"}</Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendAction}>Resend code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>Resend in {countdown}s</Text>
            )}
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.verifyBtn}
            onPress={handleManualVerify}
            disabled={isVerifying}
          >
            <LinearGradient
              colors={['#0099ff', '#0077cc']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.verifyBtnGradient}
            >
              {isVerifying ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.verifyBtnText}>Verify & Continue</Text>
                  <ArrowRight size={18} color="#ffffff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Trust and Platform Micro Badges */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Gift size={13} color={StitchTheme.colors.tertiary} />
              <Text style={styles.trustText}>Includes 7-day free trial</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <CreditCard size={13} color={StitchTheme.colors.secondary} />
              <Text style={styles.trustText}>No card required</Text>
            </View>
          </View>
        </BlurView>

        {/* Bottom Assistance Floating Action */}
        <TouchableOpacity
          style={styles.supportPill}
          onPress={() => Alert.alert('Support', 'Contact: help@screenalyze.app')}
        >
          <Headphones size={15} color={StitchTheme.colors.onSurfaceVariant} />
          <Text style={styles.supportPillText}>Need help signing in?</Text>
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
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
  heroCard: {
    width: '100%',
    borderRadius: 26,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(11, 14, 20, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 26,
    elevation: 14,
  },
  topHairline: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  iconCircleOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(39, 42, 49, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconCircleInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 153, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  emailHighlight: {
    color: '#ffffff',
    fontWeight: '600',
  },
  editEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editEmailText: {
    fontSize: 13,
    fontWeight: '600',
    color: StitchTheme.colors.primaryContainer,
  },
  clipboardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 42, 49, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
    gap: 6,
  },
  clipboardPillLabel: {
    fontSize: 11,
    color: StitchTheme.colors.onSurfaceVariant,
  },
  clipboardPillCode: {
    fontSize: 11,
    fontWeight: '700',
    color: StitchTheme.colors.primary,
    letterSpacing: 0.5,
  },
  otpBoxesContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  otpBox: {
    width: 46,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(25, 28, 34, 0.70)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    backgroundColor: 'rgba(50, 53, 60, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  otpBoxFocused: {
    backgroundColor: 'rgba(29, 32, 38, 0.95)',
    borderColor: StitchTheme.colors.primaryContainer,
    borderWidth: 1.5,
    shadowColor: StitchTheme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  cursorBlinker: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: StitchTheme.colors.primaryContainer,
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(63, 71, 83, 0.7)',
  },
  otpInputOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 1,
    color: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 1,
  },
  resendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 32, 38, 0.75)',
    borderRadius: 9999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 16,
  },
  resendLabel: {
    fontSize: 12,
    color: StitchTheme.colors.onSurfaceVariant,
  },
  resendTimer: {
    fontSize: 12,
    fontWeight: '600',
    color: StitchTheme.colors.secondary,
  },
  resendAction: {
    fontSize: 12,
    fontWeight: '700',
    color: StitchTheme.colors.primaryContainer,
  },
  verifyBtn: {
    width: '100%',
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: '#0099ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  verifyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 20,
    gap: 8,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 8,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    color: StitchTheme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: StitchTheme.colors.outlineVariant,
  },
  supportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 19, 25, 0.50)',
    borderRadius: 9999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginTop: 18,
  },
  supportPillText: {
    fontSize: 13,
    color: StitchTheme.colors.onSurfaceVariant,
  },
});
