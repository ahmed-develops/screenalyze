import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ArrowLeft, RefreshCw, AlertCircle, X, ShieldAlert } from 'lucide-react-native';
import { MediaService } from '../services/mediaService';
import { AIService } from '../services/aiService';
import { StorageService } from '../services/storageService';
import { NotificationService } from '../services/notificationService';
import { ScreenshotAnalysis, isAppropriateScreenshot, isAppropriateCategory } from '../types';
import { StitchTheme } from '../theme/stitchTheme';
import { useTheme } from '../theme/ThemeContext';
import { getFriendlyAnalysisError, getInappropriateScreenshotError } from '../utils/errorUtils';

import { computeFastImageHash } from '../utils/crypto';

export default function AutoAnalyzeScreen() {
  const { colors, isDark } = useTheme();
  const [status, setStatus] = useState<string>('Detecting latest screenshot...');
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [isInappropriate, setIsInappropriate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const attemptsRef = useRef(0);

  const performAutoAnalysis = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    setErrorTitle(null);
    setIsInappropriate(false);
    setStatus('Detecting latest screenshot...');

    try {
      const settings = await StorageService.getSettings();

      // Retry up to 6 times (spaced by 700ms) to beat iOS thumbnail save delay
      let latest = await MediaService.getLatestScreenshot();
      while (!latest && attemptsRef.current < 6) {
        attemptsRef.current++;
        await new Promise((res) => setTimeout(res, 700));
        latest = await MediaService.getLatestScreenshot();
      }

      if (!latest) {
        setError('No recent screenshot found in your photo library.');
        setIsProcessing(false);
        return;
      }

      // 1. Fast Deduplication Check by Native Asset ID
      const existingById = await StorageService.findExistingScreenshot({
        id: latest.id,
        assetId: latest.id,
      });

      if (existingById) {
        setStatus('Screenshot already analyzed! Opening existing insights...');
        setTimeout(() => {
          router.replace({
            pathname: '/screenshot/[id]',
            params: { id: existingById.id },
          });
        }, 300);
        return;
      }

      // 2. Fast Deduplication Check by Content Fingerprint
      const base64Data = await AIService.getImageBase64(latest.uri);
      const imgHash = base64Data ? computeFastImageHash(base64Data) : undefined;

      if (imgHash) {
        const existingByHash = await StorageService.findExistingScreenshot({ imageHash: imgHash });
        if (existingByHash) {
          setStatus('Screenshot already analyzed! Opening existing insights...');
          setTimeout(() => {
            router.replace({
              pathname: '/screenshot/[id]',
              params: { id: existingByHash.id },
            });
          }, 300);
          return;
        }

        const isIgnored = await StorageService.isAlreadyAnalyzed({
          id: latest.id,
          assetId: latest.id,
          imageHash: imgHash,
        });

        if (isIgnored) {
          const errInfo = getInappropriateScreenshotError(
            'Personal or Non-Actionable',
            'This image was previously evaluated and identified as personal or non-actionable.',
            latest.uri
          );
          setError(errInfo.message);
          setErrorTitle(errInfo.title);
          setIsInappropriate(true);
          setIsProcessing(false);
          return;
        }
      }

      if (settings.smartCategorizationEnabled !== false) {
        setStatus('Categorization Engine is evaluating screenshot relevance...');
        const categorization = await AIService.classifyScreenshot(latest.uri, base64Data);

        if (!categorization.isWorthAnalyzing || !isAppropriateCategory(categorization.category)) {
          const errInfo = getInappropriateScreenshotError(
            categorization.category,
            categorization.reason,
            latest.uri
          );
          setError(errInfo.message);
          setErrorTitle(errInfo.title);
          setIsInappropriate(true);
          setIsProcessing(false);
          await StorageService.addIgnoredAssetId(latest.id);
          if (imgHash) {
            await StorageService.addIgnoredHash(imgHash);
          }
          return;
        }
      }

      setStatus('Analyzing visual components & layout...');

      const aiResult = await AIService.analyzeScreenshot(latest.uri, base64Data);

      const newId = latest.id || `shot-${Date.now()}`;
      const isWorth = aiResult.isWorthAnalyzing !== false && isAppropriateCategory(aiResult.category);
      const analysisItem: ScreenshotAnalysis = {
        id: newId,
        imageUri: latest.uri,
        capturedAt: Date.now(),
        isReviewed: false,
        isWorthAnalyzing: isWorth,
        assetId: latest.id,
        imageHash: imgHash || aiResult.imageHash,
        ...aiResult,
      };

      if (!isAppropriateScreenshot(analysisItem)) {
        const errInfo = getInappropriateScreenshotError(
          analysisItem.category,
          analysisItem.summary,
          latest.uri
        );
        setError(errInfo.message);
        setErrorTitle(errInfo.title);
        setIsInappropriate(true);
        setIsProcessing(false);
        await StorageService.addIgnoredAssetId(latest.id);
        if (imgHash) {
          await StorageService.addIgnoredHash(imgHash);
        }
        return;
      }

      await StorageService.saveScreenshot(analysisItem);

      if (settings.enableNotifications) {
        await NotificationService.notifyScreenshotAnalyzed(analysisItem);
      }

      setStatus('Analysis complete! Redirecting...');
      setTimeout(() => {
        router.replace({
          pathname: '/screenshot/[id]',
          params: { id: newId },
        });
      }, 400);
    } catch (err: unknown) {
      console.error('Auto analyze failed', err);
      const friendly = getFriendlyAnalysisError(err);
      setError(friendly.message);
      setErrorTitle(friendly.title);
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performAutoAnalysis();
    }, 100);

    return () => clearTimeout(timer);
  }, [performAutoAnalysis]);

  return (
    <View style={styles.root}>
      {/* Alpine Mountain Scenic Wallpaper */}
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
          'rgba(0, 0, 0, 0.45)',
          'rgba(0, 0, 0, 0.65)',
          'rgba(0, 0, 0, 0.88)',
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header Back Button */}
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.05)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : colors.border,
              },
            ]}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <ArrowLeft size={18} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.centerCardWrapper}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark
                    ? 'rgba(29, 32, 38, 0.85)'
                    : colors.card,
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isInappropriate
                      ? 'rgba(245, 158, 11, 0.15)'
                      : error
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(99, 102, 241, 0.15)',
                    borderColor: isInappropriate
                      ? 'rgba(245, 158, 11, 0.35)'
                      : error
                        ? 'rgba(239, 68, 68, 0.3)'
                        : 'rgba(99, 102, 241, 0.3)',
                  },
                ]}
              >
                {isInappropriate ? (
                  <ShieldAlert size={32} color="#F59E0B" />
                ) : error ? (
                  <AlertCircle size={32} color={colors.danger} />
                ) : (
                  <Sparkles size={32} color={colors.primary} />
                )}
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {error ? (errorTitle || (isInappropriate ? 'Screenshot Filtered' : 'Analysis Interrupted')) : 'Instant Auto-Capture'}
              </Text>

              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {error || status}
              </Text>

              {isProcessing && (
                <View style={styles.loaderRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.liveBadge, { color: colors.primary }]}>
                    Sol Processing
                  </Text>
                </View>
              )}

              {error && (
                <View style={styles.actionsRow}>
                  {!isInappropriate && (
                    <TouchableOpacity
                      style={[styles.btn, styles.retryBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        attemptsRef.current = 0;
                        performAutoAnalysis();
                      }}
                      activeOpacity={0.8}
                    >
                      <RefreshCw size={15} color="#FFFFFF" />
                      <Text style={styles.btnTextWhite}>Try Again</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.btn,
                      isInappropriate
                        ? [styles.retryBtn, { backgroundColor: colors.primary }]
                        : styles.homeBtn,
                      !isInappropriate && {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : colors.surfaceSubtle,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => router.replace('/(tabs)')}
                    activeOpacity={0.8}
                  >
                    {isInappropriate ? (
                      <ArrowLeft size={15} color="#FFFFFF" />
                    ) : (
                      <X size={15} color={colors.textPrimary} />
                    )}
                    <Text
                      style={[
                        isInappropriate ? styles.btnTextWhite : styles.btnText,
                        !isInappropriate && { color: colors.textPrimary },
                      ]}
                    >
                      {isInappropriate ? 'Return to Home' : 'Close'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  centerCardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  liveBadge: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionsRow: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
  },
  retryBtn: {},
  homeBtn: {
    borderWidth: 1,
  },
  btnTextWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
