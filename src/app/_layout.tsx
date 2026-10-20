import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Stack, router, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationService } from '../services/notificationService';
import { AppThemeProvider, useTheme } from '../theme/ThemeContext';
import { StorageService } from '../services/storageService';
import { BiometricService } from '../services/biometricService';
import { StitchTheme } from '../theme/stitchTheme';

function NavigationRoot() {
  const { isDark, colors } = useTheme();
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    // Strict Auth Gate & Automatic Face ID Login Check
    (async () => {
      try {
        const session = await StorageService.getAuthSession();
        const linkedEmail = await StorageService.getBiometricLinkedEmail();

        // 1. If an active session exists
        if (session) {
          const biometricEnabled = await StorageService.isBiometricLockEnabled(session.email);

          if (biometricEnabled) {
            // Strict account matching: Face ID must belong to this specific session account
            if (linkedEmail && linkedEmail.toLowerCase() !== session.email.toLowerCase()) {
              console.warn(
                `[AuthGate] Face ID is linked to ${linkedEmail}, but session is ${session.email}. Requiring OTP verification.`
              );
              await StorageService.clearAuthSession();
              if (isSubscribed) {
                setIsAuthReady(true);
                router.replace('/auth/login');
              }
              return;
            }

            const status = await BiometricService.checkBiometricStatus();
            if (status.isSupported) {
              const unlocked = await BiometricService.authenticate(
                `Sign in with ${status.label}`
              );
              if (!unlocked) {
                if (isSubscribed) {
                  setIsAuthReady(true);
                  router.replace('/auth/login');
                }
                return;
              }
            }
          }

          if (isSubscribed) {
            setIsAuthReady(true);
          }
          return;
        }

        // 2. No active session in memory, but user previously gave Face ID consent with saved token
        if (linkedEmail) {
          const biometricEnabled = await StorageService.isBiometricLockEnabled(linkedEmail);
          const savedToken = await StorageService.getBiometricToken(linkedEmail);

          if (biometricEnabled && savedToken) {
            const status = await BiometricService.checkBiometricStatus();
            if (status.isSupported) {
              const unlocked = await BiometricService.authenticate(
                `Sign in with ${status.label}`
              );
              if (unlocked) {
                await StorageService.saveAuthSession(savedToken, linkedEmail);
                if (isSubscribed) {
                  setIsAuthReady(true);
                  router.replace('/(tabs)');
                  return;
                }
              }
            }
          }
        }

        // 3. Fallback: No session and no successful biometric unlock
        if (isSubscribed) {
          setIsAuthReady(true);
          router.replace('/auth/login');
        }
      } catch (e) {
        console.warn('Auth guard check error:', e);
        if (isSubscribed) {
          setIsAuthReady(true);
          router.replace('/auth/login');
        }
      } finally {
        if (isSubscribed) {
          setIsAuthReady(true);
        }
      }
    })();

    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    // Initialize notifications, interactive actions, and daily evening nudge
    NotificationService.configureNotifications().then(async (granted) => {
      if (granted) {
        try {
          const settings = await StorageService.getSettings();
          if (settings.dailyNudgeEnabled !== false) {
            await NotificationService.scheduleDailyEveningNudge(
              settings.dailyNudgeHour ?? 20,
              settings.dailyNudgeMinute ?? 0
            );
          }
        } catch (e) {
          console.warn('Failed to setup daily evening nudge', e);
        }
      }
    });

    // Listen to notification interactions (when user taps notification or action buttons)
    const subscription = NotificationService.addResponseListener(
      ({ screenshotId, actionIdentifier, type }) => {
        if (type === 'daily_nudge') {
          // Navigate to home tab to execute instant detection and analysis workflow
          router.replace('/(tabs)');
          return;
        }

        if (screenshotId) {
          // Navigate to screenshot detail screen with the action parameter
          router.push({
            pathname: '/screenshot/[id]',
            params: {
              id: screenshotId,
              autoAction: actionIdentifier,
            },
          });
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background,
          card: colors.card,
          border: colors.border,
          text: colors.textPrimary,
          primary: colors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.card,
          border: colors.border,
          text: colors.textPrimary,
          primary: colors.primary,
        },
      };

  if (!isAuthReady) {
    return (
      <View style={splashStyles.container}>
        <StatusBar style="light" />
        <Image
          source={{ uri: StitchTheme.backdropUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          priority="high"
        />
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          animation: 'slide_from_right',
          animationDuration: 260,
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="analyze"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="auth/login"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="auth/verify-otp"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="screenshot/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <NavigationRoot />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
