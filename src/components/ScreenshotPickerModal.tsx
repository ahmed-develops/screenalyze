import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Image as ImageIcon,
  Lock,
  Check,
  Sparkles,
} from 'lucide-react-native';
import { MediaService, RetrievedPhoto } from '../services/mediaService';
import { useTheme } from '../theme/ThemeContext';

export interface ScreenshotPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectScreenshot: (photo: RetrievedPhoto) => void | Promise<void>;
  onSelectMultipleScreenshots?: (photos: RetrievedPhoto[]) => void | Promise<void>;
  analyzedIds?: Set<string>;
}

function formatScreenshotDate(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const GRID_GAP = 10;
const ITEM_WIDTH = Math.floor((SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_GAP * 2) / 3);
const ITEM_HEIGHT = Math.floor(ITEM_WIDTH * 1.55);

export const ScreenshotPickerModal: React.FC<ScreenshotPickerModalProps> = ({
  visible,
  onClose,
  onSelectScreenshot,
  onSelectMultipleScreenshots,
  analyzedIds,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [screenshots, setScreenshots] = useState<RetrievedPhoto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isResolving, setIsResolving] = useState<boolean>(false);

  const [spinAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (isRefreshing) {
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
  }, [isRefreshing, spinAnim]);

  const spin = useMemo(
    () =>
      spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    [spinAnim]
  );

  const loadScreenshots = useCallback(async () => {
    try {
      const permitted = await MediaService.ensurePermissions();
      setHasPermission(permitted);
      if (!permitted) {
        setIsLoading(false);
        return;
      }

      const items = await MediaService.getAllScreenshots(75);
      setScreenshots(items);
    } catch (e) {
      console.warn('Failed to fetch screenshots for picker', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadScreenshots();
  }, [loadScreenshots]);

  const handleRetryPermission = useCallback(() => {
    setIsLoading(true);
    void loadScreenshots();
  }, [loadScreenshots]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setIsResolving(false);
    onClose();
  }, [onClose]);

  const toggleSelect = useCallback((item: RetrievedPhoto) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }, []);

  const isAllSelected = selectedIds.size === screenshots.length && screenshots.length > 0;

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(screenshots.map((s) => s.id)));
    }
  }, [isAllSelected, screenshots]);

  const handleConfirmSelection = useCallback(async () => {
    if (selectedIds.size === 0 || isResolving) return;
    setIsResolving(true);

    try {
      const selectedList = screenshots.filter((s) => selectedIds.has(s.id));
      const resolvedPhotos: RetrievedPhoto[] = [];

      for (const photo of selectedList) {
        const resolved = await MediaService.resolveAssetLocalUri(photo);
        resolvedPhotos.push(resolved);
      }

      handleClose();

      if (resolvedPhotos.length === 1) {
        await onSelectScreenshot(resolvedPhotos[0]);
      } else if (onSelectMultipleScreenshots) {
        await onSelectMultipleScreenshots(resolvedPhotos);
      } else {
        await onSelectScreenshot(resolvedPhotos[0]);
      }
    } catch (err) {
      console.error('Error confirming screenshot selection', err);
      handleClose();
    } finally {
      setIsResolving(false);
    }
  }, [
    selectedIds,
    isResolving,
    screenshots,
    handleClose,
    onSelectScreenshot,
    onSelectMultipleScreenshots,
  ]);

  const renderItem = ({ item }: { item: RetrievedPhoto }) => {
    const isAnalyzed = analyzedIds ? analyzedIds.has(item.id) : false;
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.thumbnailCard,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.surfaceSubtle,
            borderColor: isSelected
              ? colors.primary
              : isDark
              ? 'rgba(255, 255, 255, 0.1)'
              : colors.border,
            borderWidth: isSelected ? 2.5 : 1,
          },
        ]}
        activeOpacity={0.8}
        onPress={() => toggleSelect(item)}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.thumbnailImage}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
        />

        {/* Selection Checkbox Badge */}
        <View
          style={[
            styles.checkBadge,
            isSelected
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : {
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  borderColor: 'rgba(255, 255, 255, 0.45)',
                },
          ]}
        >
          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
        </View>

        {/* Bottom subtle gradient scrim for timestamp */}
        <View style={styles.thumbnailScrim}>
          <Text style={styles.thumbnailTimestamp} numberOfLines={1}>
            {formatScreenshotDate(item.creationTime)}
          </Text>
        </View>

        {/* Analyzed indicator badge */}
        {isAnalyzed && (
          <View style={styles.analyzedBadge}>
            <CheckCircle2 size={10} color="#10B981" />
            <Text style={styles.analyzedBadgeText}>Analyzed</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onShow={loadScreenshots}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView
          edges={['top', 'bottom']}
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? '#11151e' : colors.card,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {/* Top handle bar */}
          <View style={styles.topHandleContainer}>
            <View
              style={[
                styles.topHandleBar,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' },
              ]}
            />
          </View>

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: 'rgba(0, 153, 255, 0.12)' }]}>
                <ImageIcon size={18} color="#0099ff" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  Pick Screenshots
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  Tap to select multiple screenshots
                </Text>
              </View>
            </View>

            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={[
                  styles.iconActionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceSubtle,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border,
                  },
                ]}
                onPress={handleRefresh}
                activeOpacity={0.7}
                disabled={isRefreshing || isLoading}
              >
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <RefreshCw
                    size={16}
                    color={colors.textPrimary}
                  />
                </Animated.View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.iconActionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceSubtle,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border,
                  },
                ]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <X size={17} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Privacy Security Banner */}
          <View
            style={[
              styles.privacyBanner,
              {
                backgroundColor: isDark ? 'rgba(0, 153, 255, 0.08)' : 'rgba(0, 153, 255, 0.06)',
                borderColor: isDark ? 'rgba(0, 153, 255, 0.2)' : 'rgba(0, 153, 255, 0.15)',
              },
            ]}
          >
            <View style={styles.privacyBannerHeader}>
              <ShieldCheck size={14} color="#0099ff" />
              <Text style={styles.privacyBannerTitle}>Gallery Privacy Protected</Text>
            </View>
            <Text style={[styles.privacyBannerDesc, { color: colors.textSecondary }]}>
              Access is strictly restricted to your Screenshots album. Personal camera roll photos and videos are never exposed.
            </Text>
          </View>

          {/* Subheader / Counter & Selection Bar */}
          <View style={styles.counterRow}>
            <Text style={[styles.counterText, { color: colors.textSecondary }]}>
              {isLoading
                ? 'Scanning Screenshots album...'
                : `${screenshots.length} screenshot${screenshots.length === 1 ? '' : 's'} found`}
            </Text>

            {!isLoading && screenshots.length > 0 && (
              <View style={styles.counterRightActions}>
                {selectedIds.size > 0 && (
                  <View style={styles.selectedPillBadge}>
                    <Text style={[styles.selectedPillBadgeText, { color: colors.primary }]}>
                      {selectedIds.size} selected
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.selectAllPill,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceSubtle,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border,
                    },
                  ]}
                  onPress={toggleSelectAll}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.selectAllPillText, { color: colors.primary }]}>
                    {isAllSelected ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Main Content */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#0099ff" />
              <Text style={[styles.centerLoadingText, { color: colors.textSecondary }]}>
                Loading screenshots...
              </Text>
            </View>
          ) : hasPermission === false ? (
            <View style={styles.centerContainer}>
              <View style={styles.warningIconCircle}>
                <Lock size={30} color="#EF4444" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Photo Access Required
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Screenalyze needs permission to read screenshots from your Screenshots album.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleRetryPermission}
                activeOpacity={0.85}
              >
                <Text style={styles.actionButtonText}>Grant Photo Permission</Text>
              </TouchableOpacity>
            </View>
          ) : screenshots.length === 0 ? (
            <View style={styles.centerContainer}>
              <View style={styles.emptyIconCircle}>
                <ImageIcon size={34} color="#0099ff" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Screenshots Found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Only screenshots taken on this device appear here. Take a screenshot or check back anytime.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleRefresh}
                activeOpacity={0.85}
              >
                <RefreshCw size={15} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.actionButtonText}>Check Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={screenshots}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              numColumns={3}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={[
                styles.listContent,
                selectedIds.size > 0 && { paddingBottom: 90 },
              ]}
              showsVerticalScrollIndicator={false}
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              windowSize={5}
            />
          )}

          {/* Bottom Floating Action Bar when screenshots are selected */}
          {selectedIds.size > 0 && (
            <View
              style={[
                styles.floatingActionBar,
                {
                  backgroundColor: isDark ? 'rgba(17, 21, 30, 0.96)' : colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border,
                },
              ]}
            >
              <View style={styles.floatingActionTextCol}>
                <Text style={[styles.floatingActionTitle, { color: colors.textPrimary }]}>
                  {selectedIds.size} Screenshot{selectedIds.size === 1 ? '' : 's'} Selected
                </Text>
                <Text style={[styles.floatingActionSub, { color: colors.textMuted }]}>
                  Tap to process with AI analysis
                </Text>
              </View>

              <TouchableOpacity
                style={styles.floatingSubmitBtn}
                onPress={handleConfirmSelection}
                disabled={isResolving}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.floatingSubmitGradient}
                >
                  {isResolving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Sparkles size={16} color="#FFFFFF" />
                      <Text style={styles.floatingSubmitText}>
                        {selectedIds.size === 1 ? 'Analyze' : `Analyze (${selectedIds.size})`}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '92%',
    minHeight: '65%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 8,
  },
  topHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  topHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  privacyBanner: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  privacyBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  privacyBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0099ff',
    letterSpacing: 0.1,
  },
  privacyBannerDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  counterRow: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  counterRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  selectedPillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  selectAllPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectAllPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 24,
  },
  columnWrapper: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  thumbnailCard: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  thumbnailScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  thumbnailTimestamp: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  analyzedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.92)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    zIndex: 4,
  },
  analyzedBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
  floatingActionBar: {
    position: 'absolute',
    bottom: 16,
    left: HORIZONTAL_PADDING,
    right: HORIZONTAL_PADDING,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  floatingActionTextCol: {
    flex: 1,
    marginRight: 12,
  },
  floatingActionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  floatingActionSub: {
    fontSize: 11,
    marginTop: 1,
  },
  floatingSubmitBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  floatingSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  floatingSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  centerLoadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '500',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 153, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  warningIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0099ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
