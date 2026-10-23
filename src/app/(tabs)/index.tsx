import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Search,
  SlidersHorizontal,
  ChevronRight,
  MoreHorizontal,
  ArrowRight,
  Camera,
  Image as ImageIcon,
  Eye,
  Palette,
  X,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  Code2,
  Sparkles,
} from 'lucide-react-native';
import { useScreenshotDetector } from '../../hooks/useScreenshotDetector';
import type { RetrievedPhoto } from '../../services/mediaService';
import { StorageService } from '../../services/storageService';
import { ApiClient } from '../../services/apiClient';
import { ActionPickerModal } from '../../components/ActionPickerModal';
import { ScreenshotPickerModal } from '../../components/ScreenshotPickerModal';
import { AnalysisSummaryModal } from '../../components/AnalysisSummaryModal';
import { computeFastImageHash } from '../../utils/crypto';
import { NotificationBanner } from '../../components/NotificationBanner';
import { BackTapGuideModal } from '../../components/BackTapGuideModal';
import { PastScreenshotsPromptModal } from '../../components/PastScreenshotsPromptModal';
import {
  ScreenshotAnalysis,
  UserProfile,
  isAppropriateScreenshot,
  BatchAnalysisSummary,
} from '../../types';
import { getInappropriateScreenshotError } from '../../utils/errorUtils';
import { StitchTheme } from '../../theme/stitchTheme';
import { useTheme } from '../../theme/ThemeContext';

function getGreeting(name?: string): string {
  const firstName = name?.trim() ? name.trim().split(' ')[0] : '';
  const suffix = firstName ? `, ${firstName}` : '';
  const hour = new Date().getHours();
  if (hour < 12) return `Good Morning${suffix}`;
  if (hour < 18) return `Good Afternoon${suffix}`;
  return `Good Evening${suffix}`;
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / (60 * 1000));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function getCategoryDotColor(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('figma')) return StitchTheme.colors.secondary;
  if (lower.includes('ios') || lower.includes('mobile')) return StitchTheme.colors.primary;
  if (lower.includes('system') || lower.includes('wireframe')) return StitchTheme.colors.tertiary;
  return StitchTheme.colors.secondary;
}

/*
function getCardAiBadge(item: ScreenshotAnalysis): { label: string; color: string } {
  const lowerCat = item.category.toLowerCase();
  const lowerTitle = item.title.toLowerCase();
  if (lowerTitle.includes('dashboard') || lowerCat.includes('figma')) {
    return { label: '96% UI Match', color: StitchTheme.colors.secondary };
  }
  if (lowerTitle.includes('checkout') || lowerCat.includes('ios')) {
    return { label: 'Text OCR Synced', color: StitchTheme.colors.tertiary };
  }
  if (lowerTitle.includes('profile') || lowerCat.includes('system')) {
    return { label: 'Tokens Extracted', color: StitchTheme.colors.secondary };
  }
  return { label: 'GPT-4o Vision', color: StitchTheme.colors.primary };
}
*/

function getSubDetailText(item: ScreenshotAnalysis): string {
  // if (item.keyPoints && item.keyPoints.length > 0) {
  //   return `${item.keyPoints.length} components found`;
  // }
  return item.category || 'Screen Capture';
}

export default function HomeSummaryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = Math.min(Math.round(screenWidth * 0.78), 300);

  const [modalItem, setModalItem] = useState<ScreenshotAnalysis | null>(null);
  const [bannerItem, setBannerItem] = useState<ScreenshotAnalysis | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [isBackTapModalVisible, setIsBackTapModalVisible] = useState(false);
  const [isScreenshotPickerVisible, setIsScreenshotPickerVisible] = useState(false);
  const [isPastPromptVisible, setIsPastPromptVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchAnalysisSummary | null>(null);
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);

  const {
    isAnalyzing,
    pendingItem,
    errorMessage,
    setErrorMessage,
    bannerError,
    dismissBannerError,
    resetOfflineState,
    pendingPastScreenshots,
    analyzePastScreenshots,
    dismissPastScreenshotsPrompt,
    recentScreenshots,
    refreshHistory,
    processScreenshotUri,
    triggerScreenshotCheck,
    lastBatchSummary,
  } = useScreenshotDetector({
    onScreenshotDetected: () => {
      setBannerItem(null);
    },
    onScreenshotAnalyzed: (item, isManualPick) => {
      if (isAppropriateScreenshot(item)) {
        setBannerItem(item);
        if (isManualPick) {
          setModalItem(item);
        }
      }
    },
    onPastScreenshotsPending: () => {
      setIsPastPromptVisible(true);
    },
    onBatchAnalysisCompleted: (summary) => {
      setBatchSummary(summary);
      setIsSummaryModalVisible(true);
    },
    onAnalysisError: (error, isManualPick) => {
      if (error.isInappropriate && isManualPick) {
        Alert.alert(
          error.title || 'Screenshot Filtered',
          error.message,
          [{ text: 'Got It', style: 'default' }]
        );
      }
    },
  });

  const checkApiKey = useCallback(async () => {
    try {
      const health = await ApiClient.checkHealth();
      setHasApiKey(health.openai_configured);
    } catch {
      const settings = await StorageService.getSettings();
      const envKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const activeKey = settings.openaiApiKey?.trim() || envKey?.trim() || '';
      setHasApiKey(Boolean(activeKey));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkApiKey();
      refreshHistory();
      StorageService.getUserProfile().then((p) => setUserProfile(p)).catch(() => { });
    }, [checkApiKey, refreshHistory])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      resetOfflineState();
      await checkApiKey();
      await triggerScreenshotCheck();
      await refreshHistory();
    } catch (err) {
      console.warn('Failed refreshing screenshots', err);
    } finally {
      setRefreshing(false);
    }
  };

  const [spinAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (refreshing) {
      spinAnim.setValue(0);
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 850,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => {
        loop.stop();
      };
    } else {
      spinAnim.setValue(0);
    }
  }, [refreshing, spinAnim]);

  const spin = useMemo(
    () =>
      spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    [spinAnim]
  );

  const analyzedIds = useMemo(
    () => new Set(recentScreenshots.map((s) => s.id)),
    [recentScreenshots]
  );

  const handlePickFromLibrary = useCallback(() => {
    setIsScreenshotPickerVisible(true);
  }, []);

  const handleAutoAnalyzePastScreenshots = useCallback(async () => {
    setIsPastPromptVisible(false);
    await analyzePastScreenshots();
  }, [analyzePastScreenshots]);

  const handleAnalyzeSelectedPastScreenshots = useCallback(
    async (selected: RetrievedPhoto[]) => {
      setIsPastPromptVisible(false);
      await analyzePastScreenshots(selected);
    },
    [analyzePastScreenshots]
  );

  const handleSelectPastScreenshotsManually = useCallback(() => {
    setIsPastPromptVisible(false);
    setIsScreenshotPickerVisible(true);
  }, []);

  const handleDismissPastPrompt = useCallback(() => {
    setIsPastPromptVisible(false);
    dismissPastScreenshotsPrompt();
  }, [dismissPastScreenshotsPrompt]);


  const handleScreenshotSelected = useCallback(
    async (picked: RetrievedPhoto) => {
      try {
        // 1. Fast check by native asset ID
        const existingById = await StorageService.findExistingScreenshot({
          id: picked.id,
          assetId: picked.id,
        });

        if (existingById) {
          Alert.alert(
            'Screenshot Already Analyzed',
            'This screenshot is already in your library. Opening your existing visual breakdown.',
            [
              {
                text: 'View Insights',
                onPress: () => {
                  router.push({
                    pathname: '/screenshot/[id]',
                    params: { id: existingById.id },
                  });
                },
              },
            ]
          );
          return;
        }

        // 2. Fast check by content fingerprint if preloaded base64 exists
        if (picked.base64) {
          const imgHash = computeFastImageHash(picked.base64);
          const existingByHash = await StorageService.findExistingScreenshot({ imageHash: imgHash });
          if (existingByHash) {
            Alert.alert(
              'Screenshot Already Analyzed',
              'This screenshot is already in your library. Opening your existing visual breakdown.',
              [
                {
                  text: 'View Insights',
                  onPress: () => {
                    router.push({
                      pathname: '/screenshot/[id]',
                      params: { id: existingByHash.id },
                    });
                  },
                },
              ]
            );
            return;
          }

          const isIgnored = await StorageService.isAlreadyAnalyzed({
            id: picked.id,
            assetId: picked.id,
            imageHash: imgHash,
          });

          if (isIgnored) {
            const errInfo = getInappropriateScreenshotError(
              'Personal or Non-Actionable',
              'This screenshot was previously filtered out because it does not contain actionable technical content or code.',
              picked.uri
            );
            Alert.alert(errInfo.title, errInfo.message);
            return;
          }
        }

        resetOfflineState();
        const analyzed = await processScreenshotUri(picked.uri, picked.id, picked.base64, {
          isManualPick: true,
        });
        if (analyzed && isAppropriateScreenshot(analyzed)) {
          setModalItem(analyzed);
        }
      } catch (e) {
        console.error('Failed processing selected screenshot', e);
      }
    },
    [processScreenshotUri, resetOfflineState]
  );

  const handleMultipleScreenshotsSelected = useCallback(
    async (pickedList: RetrievedPhoto[]) => {
      if (!pickedList || pickedList.length === 0) return;
      if (pickedList.length === 1) {
        await handleScreenshotSelected(pickedList[0]);
      } else {
        // Run batch analysis on the multiple selected screenshots
        await analyzePastScreenshots(pickedList);
      }
    },
    [handleScreenshotSelected, analyzePastScreenshots]
  );

  const handleActionComplete = (updated: ScreenshotAnalysis) => {

    setModalItem(null);
    setBannerItem(null);
    refreshHistory();
    router.push({
      pathname: '/screenshot/[id]',
      params: { id: updated.id },
    });
  };

  const handleQuickWorkflow = useCallback(
    (actionType: string) => {
      const target = recentScreenshots[0];
      if (!target) {
        handlePickFromLibrary();
        return;
      }

      if (actionType === 'tutorial') {
        router.push({
          pathname: '/screenshot/[id]',
          params: { id: target.id, autoAction: 'EXPLAIN_TUTORIAL' },
        });
      } else if (actionType === 'code') {
        router.push({
          pathname: '/screenshot/[id]',
          params: {
            id: target.id,
            autoPrompt: 'Convert this UI screenshot into clean React Native components with StyleSheet',
          },
        });
      } else if (actionType === 'tokens') {
        router.push({
          pathname: '/screenshot/[id]',
          params: {
            id: target.id,
            autoPrompt: 'Extract design tokens: color palette hex codes, font hierarchy, spacing, and border radii',
          },
        });
      } else if (actionType === 'audit') {
        router.push({
          pathname: '/screenshot/[id]',
          params: {
            id: target.id,
            autoPrompt: 'Perform UX & Accessibility audit: color contrast, touch target sizes, and usability recommendations',
          },
        });
      }
    },
    [recentScreenshots, handlePickFromLibrary]
  );

  // Distinct category chips
  const categories = useMemo(() => {
    const set = new Set<string>();
    recentScreenshots.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ['All', ...Array.from(set)];
  }, [recentScreenshots]);

  // Filtered screenshots
  const filteredScreenshots = useMemo(() => {
    return recentScreenshots.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const inTitle = item.title.toLowerCase().includes(q);
      const inCat = item.category.toLowerCase().includes(q);
      const inSummary = item.summary.toLowerCase().includes(q);
      const inKeyPoints = item.keyPoints?.some((kp) => kp.toLowerCase().includes(q)) ?? false;

      return inTitle || inCat || inSummary || inKeyPoints;
    });
  }, [recentScreenshots, selectedCategory, searchQuery]);

  const newTodayCount = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return recentScreenshots.filter((s) => s.capturedAt >= startOfDay.getTime()).length || 3;
  }, [recentScreenshots]);

  const uiFlowsCount = useMemo(() => {
    return (
      recentScreenshots.filter(
        (s) =>
          s.category.toLowerCase().includes('flow') ||
          s.category.toLowerCase().includes('mockup') ||
          s.category.toLowerCase().includes('system')
      ).length || 2
    );
  }, [recentScreenshots]);

  return (
    <View style={styles.root}>
      {/* Clean Alpine Mountain Scenic Wallpaper from Login */}
      <Image
        source={{ uri: StitchTheme.backdropUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
        cachePolicy="memory-disk"
        pointerEvents="none"
      />

      {/* Dark Scrim Gradient Overlay matching Login */}
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

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* In-app Notification Alert Banner (shows pending, completed & error states) */}
        <NotificationBanner
          item={isAppropriateScreenshot(bannerItem) ? bannerItem : null}
          pendingItem={pendingItem}
          error={bannerError}
          onPress={() => {
            if (bannerItem && isAppropriateScreenshot(bannerItem)) {
              setModalItem(bannerItem);
              setBannerItem(null);
            } else if (bannerError) {
              if (bannerError.isInappropriate) {
                Alert.alert(
                  bannerError.title,
                  `${bannerError.message}\n\nTip: Screenalyze specializes in code snippets, UI designs, system architectures, error logs, and technical tutorials. Non-technical photos are automatically skipped to keep your workspace clean.`,
                  [{ text: 'Dismiss', onPress: () => dismissBannerError() }]
                );
              } else {
                dismissBannerError();
              }
            }
          }}
          onDismiss={() => {
            setBannerItem(null);
            dismissBannerError();
          }}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Integrated Transparent Top Bar (Profile & Reload) */}
          <View style={styles.headerBar}>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('/(tabs)/settings')}
              activeOpacity={0.7}
              accessibilityLabel="Account and Settings"
            >
              <User size={18} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={onRefresh}
              activeOpacity={0.7}
              disabled={refreshing}
              accessibilityLabel="Refresh screenshots"
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RefreshCw size={17} color="#ffffff" />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Greeting & Status Hero Island */}
          <View style={styles.heroSection}>
            <Text style={styles.heroGreeting}>{getGreeting(userProfile?.name)}</Text>
            <Text style={styles.heroSubtitle}>
              You have {recentScreenshots.length} captures today.
            </Text>

            {/* Quick Stat Badges Scroll Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statBadgesRow}
            >
              <View style={styles.statBadge}>
                <View style={styles.statBadgeCountPill}>
                  <Text style={styles.statBadgeCountText}>{newTodayCount}</Text>
                </View>
                <Text style={styles.statBadgeLabel}>New Today</Text>
              </View>

              <View style={styles.statBadge}>
                <Eye size={15} color={StitchTheme.colors.secondary} />
                <Text style={styles.statBadgeLabel}>
                  {recentScreenshots.length} Analyzed
                </Text>
              </View>

              <View style={styles.statBadge}>
                <Palette size={15} color={StitchTheme.colors.tertiary} />
                <Text style={styles.statBadgeLabel}>{uiFlowsCount} UI Flows</Text>
              </View>

              {(batchSummary || lastBatchSummary) && (
                <TouchableOpacity
                  style={[
                    styles.statBadge,
                    {
                      backgroundColor: 'rgba(99, 102, 241, 0.16)',
                      borderColor: 'rgba(99, 102, 241, 0.35)',
                    },
                  ]}
                  onPress={() => {
                    setBatchSummary(batchSummary || lastBatchSummary);
                    setIsSummaryModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Sparkles size={14} color="#818CF8" />
                  <Text style={[styles.statBadgeLabel, { color: '#C7D2FE', fontWeight: '700' }]}>
                    Summary ({(batchSummary || lastBatchSummary)?.analyzedCount}/{(batchSummary || lastBatchSummary)?.total})
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Interactive Frosted Search Island */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Search size={18} color={StitchTheme.colors.onSurfaceVariant} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search captures, text, tags, or flows..."
                placeholderTextColor="rgba(191, 199, 213, 0.55)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.searchClearBtn}
                  accessibilityLabel="Clear search"
                >
                  <X size={15} color={StitchTheme.colors.outline} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  showFilters && styles.filterBtnActive,
                ]}
                onPress={() => setShowFilters(!showFilters)}
                activeOpacity={0.8}
                accessibilityLabel="Toggle category filters"
              >
                <SlidersHorizontal
                  size={15}
                  color={showFilters ? '#ffffff' : StitchTheme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>

            {/* Collapsible Category Chips */}
            {showFilters && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsRow}
              >
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.filterChip,
                        isSelected && styles.filterChipSelected,
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isSelected && styles.filterChipTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Live Analysis Engine Status Strip */}
          {/* <View style={styles.engineStrip}>
          <View style={styles.engineStripLeft}>
            <Activity size={16} color={StitchTheme.colors.secondary} />
            <Text style={styles.engineStripStatus}>
              Analysis Engine Status: {isListening ? 'Active' : 'Standby'}
            </Text>
          </View>
          <Text style={styles.engineStripAccuracy}>99.8% Accuracy</Text>
        </View> */}

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={handlePickFromLibrary}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#0099ff', '#0077cc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                {isAnalyzing ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                ) : (
                  <ImageIcon size={17} color="#ffffff" />
                )}
                <Text style={styles.primaryActionBtnText}>
                  {isAnalyzing ? 'Analyzing in background...' : 'Pick A Screenshot'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={handleScanLatest}
              activeOpacity={0.8}
              disabled={isAnalyzing}
            >
              <Camera size={17} color={StitchTheme.colors.secondary} />
              <Text style={styles.secondaryActionBtnText}>Scan Camera Roll</Text>
            </TouchableOpacity> */}
          </View>

          {/* Daily Evening Review Status Pill */}
          {/* <TouchableOpacity
            style={styles.backTapTipPill}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.8}
            accessibilityLabel="View daily evening nudge settings"
          >
            <View style={styles.backTapTipLeft}>
              <Moon size={13} color={StitchTheme.colors.secondary} />
              <Text style={styles.backTapTipText}>
                Daily Review Active: Heads up nudge tonight
              </Text>
            </View>
            <ChevronRight size={13} color="rgba(255, 255, 255, 0.45)" />
          </TouchableOpacity> */}

          {/* Active Analysis Progress Indicator */}
          {/* {isAnalyzing && (
            <View style={styles.analyzingCard}>
              <ActivityIndicator size="small" color={StitchTheme.colors.secondary} />
              <Text style={styles.analyzingText}>
                {analysisStatus || 'GPT-4o is analyzing screenshot pixels & generating insights...'}
              </Text>
            </View>
          )} */}

          {/* Missing Backend / Key Alert */}
          {!hasApiKey && (
            <View style={styles.apiKeyAlert}>
              <AlertTriangle size={18} color={StitchTheme.colors.tertiary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.apiKeyAlertTitle}>Backend Connection Notice</Text>
                <Text style={styles.apiKeyAlertDesc}>
                  Ensure FastAPI server is running (npm run backend:dev) with OPENAI_API_KEY configured.
                </Text>
              </View>
            </View>
          )}

          {/* Error message card */}
          {errorMessage && (
            <View style={styles.errorCard}>
              <AlertTriangle size={18} color={StitchTheme.colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>
                  {bannerError?.title || 'Analysis Issue'}
                </Text>
                <Text style={styles.errorDesc}>{errorMessage}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setErrorMessage(null);
                  dismissBannerError();
                  resetOfflineState();
                  void onRefresh();
                }}
                style={styles.errorRetryBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.errorRetryText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setErrorMessage(null);
                  dismissBannerError();
                  resetOfflineState();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.errorCloseBtn}
              >
                <X size={15} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            </View>
          )}

          {/* Recent Projects Section Header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Recent</Text>
              <View style={styles.sectionCountPill}>
                <Text style={styles.sectionCountText}>
                  {filteredScreenshots.length}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => router.push('/(tabs)/history')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color={StitchTheme.colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* Horizontal Project Carousel */}
          {filteredScreenshots.length === 0 ? (
            <View style={styles.emptyCard}>
              <Camera size={36} color={StitchTheme.colors.outline} />
              <Text style={styles.emptyTitle}>No captures found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or pick a screenshot to analyze.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalProjectsRow}
              style={styles.horizontalProjectsScroll}
              decelerationRate="fast"
              snapToInterval={cardWidth + 14}
              snapToAlignment="start"
            >
              {filteredScreenshots.map((item) => {
                // const aiBadge = getCardAiBadge(item);
                const dotColor = getCategoryDotColor(item.category);
                const relativeTime = formatRelativeTime(item.capturedAt);
                const subDetail = getSubDetailText(item);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.horizontalCard,
                      {
                        width: cardWidth,
                        backgroundColor: isDark ? 'rgba(29, 32, 38, 0.72)' : colors.card,
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                      },
                    ]}
                    activeOpacity={0.92}
                    onPress={() => {
                      router.push({
                        pathname: '/screenshot/[id]',
                        params: { id: item.id },
                      });
                    }}
                  >
                    {/* Screenshot Preview Image Frame */}
                    <View style={styles.cardImageWrapper}>
                      <Image
                        source={{ uri: item.imageUri }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={300}
                      />

                      {/* Scrim Gradient Overlay for Text Readability */}
                      <LinearGradient
                        colors={['transparent', 'rgba(16, 19, 25, 0.45)', 'rgba(16, 19, 25, 0.92)']}
                        locations={[0, 0.5, 1]}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />

                      {/* Top-Left Category Badge */}
                      <View style={styles.cardCategoryBadge}>
                        <View style={[styles.cardCategoryDot, { backgroundColor: dotColor }]} />
                        <Text style={styles.cardCategoryText}>{item.category || 'Screenshot'}</Text>
                      </View>

                      {/* Top-Right Quick Action Button */}
                      <TouchableOpacity
                        style={styles.cardMoreBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          setModalItem(item);
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel="Screenshot actions"
                      >
                        <MoreHorizontal size={16} color={StitchTheme.colors.onSurfaceVariant} />
                      </TouchableOpacity>

                      {/* Bottom Meta Overlay Bar */}
                      {/* <View style={styles.cardImageBottomRow}>
                        <View style={styles.cardMetaPill}>
                          <Text style={styles.cardMetaPillText}>{relativeTime}</Text>
                        </View>
                        <View
                          style={[
                            styles.cardAiPill,
                            { borderColor: `${aiBadge.color}40` },
                          ]}
                        >
                          <Text style={[styles.cardAiPillText, { color: aiBadge.color }]}>
                            {aiBadge.label}
                          </Text>
                        </View>
                      </View> */}
                    </View>

                    {/* Card Info Footer */}
                    <View style={styles.cardFooter}>
                      <View style={styles.cardFooterInfo}>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View style={styles.cardSubRow}>
                          <Text style={styles.cardSubTime}>{relativeTime}</Text>
                          <Text style={styles.cardSubDot}>•</Text>
                          <Text style={styles.cardSubDetail} numberOfLines={1}>
                            {subDetail}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardArrowBtn}>
                        <ArrowRight size={16} color="#ffffff" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Quick AI Studio Workflows (Filling freed-up vertical space) */}
          <View style={styles.workflowsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                {/* <Sparkles size={16} color={StitchTheme.colors.secondary} /> */}
                <Text style={styles.sectionTitle}>Tools</Text>
              </View>
              {/* <Text style={styles.workflowsSubLabel}>Instant Workflows</Text> */}
            </View>

            <View style={styles.workflowsGrid}>
              <TouchableOpacity
                style={[
                  styles.workflowCard,
                  {
                    backgroundColor: isDark ? 'rgba(29, 32, 38, 0.65)' : colors.card,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => handleQuickWorkflow('tutorial')}
              >
                <View style={[styles.workflowIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                  <BookOpen size={18} color={StitchTheme.colors.secondary} />
                </View>
                <Text style={[styles.workflowTitle, { color: colors.textPrimary }]}>
                  Tutorial
                </Text>
                <Text style={[styles.workflowDesc, { color: colors.textSecondary }]}>
                  Step-by-step masterclass
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.workflowCard,
                  {
                    backgroundColor: isDark ? 'rgba(29, 32, 38, 0.65)' : colors.card,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => handleQuickWorkflow('code')}
              >
                <View style={[styles.workflowIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Code2 size={18} color={StitchTheme.colors.primary} />
                </View>
                <Text style={[styles.workflowTitle, { color: colors.textPrimary }]}>
                  Code Gen
                </Text>
                <Text style={[styles.workflowDesc, { color: colors.textSecondary }]}>
                  React Native & TS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.workflowCard,
                  {
                    backgroundColor: isDark ? 'rgba(29, 32, 38, 0.65)' : colors.card,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => handleQuickWorkflow('tokens')}
              >
                <View style={[styles.workflowIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Palette size={18} color={StitchTheme.colors.tertiary} />
                </View>
                <Text style={[styles.workflowTitle, { color: colors.textPrimary }]}>
                  Tokens Audit
                </Text>
                <Text style={[styles.workflowDesc, { color: colors.textSecondary }]}>
                  Palettes & typography
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.workflowCard,
                  {
                    backgroundColor: isDark ? 'rgba(29, 32, 38, 0.65)' : colors.card,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => handleQuickWorkflow('audit')}
              >
                <View style={[styles.workflowIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Eye size={18} color="#10B981" />
                </View>
                <Text style={[styles.workflowTitle, { color: colors.textPrimary }]}>
                  UX Heuristics
                </Text>
                <Text style={[styles.workflowDesc, { color: colors.textSecondary }]}>
                  Accessibility & contrast
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Action Picker Prompt Modal */}
        <ActionPickerModal
          visible={modalItem !== null && isAppropriateScreenshot(modalItem)}
          screenshot={modalItem}
          onClose={() => setModalItem(null)}
          onActionComplete={handleActionComplete}
        />

        {/* Back Tap & Shortcuts Setup Guide */}
        <BackTapGuideModal
          visible={isBackTapModalVisible}
          onClose={() => setIsBackTapModalVisible(false)}
        />

        {/* Dedicated Screenshots-Only Gallery Picker Modal */}
        <ScreenshotPickerModal
          visible={isScreenshotPickerVisible}
          onClose={() => setIsScreenshotPickerVisible(false)}
          onSelectScreenshot={handleScreenshotSelected}
          onSelectMultipleScreenshots={handleMultipleScreenshotsSelected}
          analyzedIds={analyzedIds}
        />


        {/* Past Unanalyzed Screenshots Prompt Modal */}
        <PastScreenshotsPromptModal
          visible={isPastPromptVisible && pendingPastScreenshots.length > 0}
          pastScreenshots={pendingPastScreenshots}
          onAnalyzeSelected={handleAnalyzeSelectedPastScreenshots}
          onAutoAnalyzeAll={handleAutoAnalyzePastScreenshots}
          onSelectManually={handleSelectPastScreenshotsManually}
          onDismiss={handleDismissPastPrompt}
        />

        {/* Analysis Summary Breakdown Modal */}
        <AnalysisSummaryModal
          visible={isSummaryModalVisible && Boolean(batchSummary || lastBatchSummary)}
          summary={batchSummary || lastBatchSummary}
          onClose={() => {
            setIsSummaryModalVisible(false);
            setBatchSummary(null);
          }}
          onSelectScreenshot={(analysis) => {
            setIsSummaryModalVisible(false);
            setBatchSummary(null);
            setModalItem(analysis);
          }}
        />

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    marginBottom: 12,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  heroSection: {
    marginBottom: 18,
  },
  heroGreeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: StitchTheme.colors.onSurfaceVariant,
    marginBottom: 12,
  },
  statBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: 'rgba(29, 32, 38, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statBadgeCountPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: StitchTheme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  statBadgeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  searchSection: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 9999,
    backgroundColor: 'rgba(25, 28, 34, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    height: '100%',
  },
  searchClearBtn: {
    padding: 6,
    marginRight: 4,
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(50, 53, 60, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: StitchTheme.colors.primaryContainer,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: 'rgba(29, 32, 38, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterChipSelected: {
    backgroundColor: 'rgba(0, 153, 255, 0.22)',
    borderColor: StitchTheme.colors.primaryContainer,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: StitchTheme.colors.onSurfaceVariant,
  },
  filterChipTextSelected: {
    color: StitchTheme.colors.secondary,
    fontWeight: '600',
  },
  engineStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: 'rgba(25, 28, 34, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 14,
  },
  engineStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engineStripStatus: {
    fontSize: 12,
    color: StitchTheme.colors.onSurfaceVariant,
  },
  engineStripAccuracy: {
    fontSize: 12,
    fontWeight: '600',
    color: StitchTheme.colors.primary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: StitchTheme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    backgroundColor: 'rgba(29, 32, 38, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: StitchTheme.colors.secondary,
  },
  backTapTipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(29, 32, 38, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  backTapTipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  backTapTipText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  analyzingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 153, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 153, 255, 0.30)',
    marginBottom: 14,
  },
  analyzingText: {
    flex: 1,
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  apiKeyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 185, 85, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 185, 85, 0.35)',
    marginBottom: 14,
  },
  apiKeyAlertTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: StitchTheme.colors.tertiary,
  },
  apiKeyAlertDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 180, 171, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.30)',
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: StitchTheme.colors.error,
  },
  errorDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  errorRetryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  errorRetryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  errorCloseBtn: {
    padding: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  sectionCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: StitchTheme.colors.surfaceContainerHighest,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: StitchTheme.colors.secondary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: StitchTheme.colors.secondary,
  },
  horizontalProjectsScroll: {
    marginHorizontal: -16,
    marginBottom: 24,
  },
  horizontalProjectsRow: {
    paddingHorizontal: 16,
    gap: 14,
  },
  horizontalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
  card: {
    borderRadius: 20,
    backgroundColor: 'rgba(29, 32, 38, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 10,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
  cardImageWrapper: {
    position: 'relative',
    width: '100%',
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0b0e14',
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 9999,
    backgroundColor: 'rgba(11, 14, 20, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  cardCategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardMoreBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(25, 28, 34, 0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageBottomRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMetaPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(39, 42, 49, 0.75)',
  },
  cardMetaPillText: {
    fontSize: 11,
    color: StitchTheme.colors.onSurfaceVariant,
  },
  cardAiPill: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 9999,
    backgroundColor: 'rgba(16, 19, 25, 0.85)',
    borderWidth: 1,
  },
  cardAiPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 2,
  },
  cardFooterInfo: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  cardSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardSubTime: {
    fontSize: 12,
    color: StitchTheme.colors.onSurfaceVariant,
  },
  cardSubDot: {
    fontSize: 11,
    color: StitchTheme.colors.outline,
  },
  cardSubDetail: {
    fontSize: 12,
    color: StitchTheme.colors.secondary,
    flexShrink: 1,
  },
  cardArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(39, 42, 49, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowsSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  workflowsSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: StitchTheme.colors.secondary,
  },
  workflowsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  workflowCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  workflowIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  workflowTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  workflowDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(25, 28, 34, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: StitchTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
});
