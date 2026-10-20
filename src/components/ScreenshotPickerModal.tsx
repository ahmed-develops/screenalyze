import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  X,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Image as ImageIcon,
  Lock,
} from 'lucide-react-native';
import { MediaService, RetrievedPhoto } from '../services/mediaService';
import { useTheme } from '../theme/ThemeContext';

export interface ScreenshotPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectScreenshot: (photo: RetrievedPhoto) => void | Promise<void>;
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
  analyzedIds,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [screenshots, setScreenshots] = useState<RetrievedPhoto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

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
    setSelectedPhotoId(null);
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    async (photo: RetrievedPhoto) => {
      try {
        setSelectedPhotoId(photo.id);
        const resolved = await MediaService.resolveAssetLocalUri(photo);
        await onSelectScreenshot(resolved);
        handleClose();
      } catch (err) {
        console.error('Error selecting screenshot', err);
      } finally {
        setSelectedPhotoId(null);
      }
    },
    [onSelectScreenshot, handleClose]
  );

  const renderItem = ({ item }: { item: RetrievedPhoto }) => {
    const isAnalyzed = analyzedIds ? analyzedIds.has(item.id) : false;
    const isSelecting = selectedPhotoId === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.thumbnailCard,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.surfaceSubtle,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border,
          },
        ]}
        activeOpacity={0.8}
        onPress={() => handleSelect(item)}
        disabled={selectedPhotoId !== null}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.thumbnailImage}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
        />

        {/* Bottom subtle gradient scrim for timestamp */}
        <View style={styles.thumbnailScrim}>
          <Text style={styles.thumbnailTimestamp} numberOfLines={1}>
            {formatScreenshotDate(item.creationTime)}
          </Text>
        </View>

        {/* Analyzed indicator badge */}
        {isAnalyzed && (
          <View style={styles.analyzedBadge}>
            <CheckCircle2 size={11} color="#10B981" />
            <Text style={styles.analyzedBadgeText}>Analyzed</Text>
          </View>
        )}

        {/* Selection spinner */}
        {isSelecting && (
          <View style={styles.selectingOverlay}>
            <ActivityIndicator size="small" color="#0099ff" />
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
              paddingBottom: Math.max(insets.bottom, 16),
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
                  Pick A Screenshot
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  Device Screenshots Album Only
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
                <RefreshCw
                  size={16}
                  color={colors.textPrimary}
                  style={isRefreshing ? styles.spinning : undefined}
                />
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
              Access is strictly restricted to your Screenshots album. Personal camera roll photos, selfies, and videos are never exposed or loaded.
            </Text>
          </View>

          {/* Subheader / Counter */}
          <View style={styles.counterRow}>
            <Text style={[styles.counterText, { color: colors.textSecondary }]}>
              {isLoading
                ? 'Scanning Screenshots album...'
                : `${screenshots.length} screenshot${screenshots.length === 1 ? '' : 's'} found`}
            </Text>
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
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              windowSize={5}
            />
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
    maxHeight: '90%',
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
  spinning: {
    transform: [{ rotate: '45deg' }],
  },
  privacyBanner: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  privacyBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
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
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
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
    borderWidth: 1,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
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
    top: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  analyzedBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  selectingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
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
