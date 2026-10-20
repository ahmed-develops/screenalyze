import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Sparkles, X, Zap, AlertTriangle } from 'lucide-react-native';
import { ScreenshotAnalysis, isAppropriateScreenshot } from '../types';
import { Colors } from '../theme/colors';

export interface PendingScreenshot {
  uri: string;
  id: string;
  status?: string;
  totalCount?: number;
  currentIndex?: number;
}

export interface BannerError {
  title: string;
  message: string;
  isServerOffline?: boolean;
}

interface NotificationBannerProps {
  item: ScreenshotAnalysis | null;
  pendingItem?: PendingScreenshot | null;
  error?: BannerError | null;
  onPress?: () => void;
  onDismiss: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  item,
  pendingItem,
  error,
  onPress,
  onDismiss,
}) => {
  const [slideAnim] = useState(() => new Animated.Value(-140));
  const isAppropriate = isAppropriateScreenshot(item);
  const activeItem = isAppropriate ? item : null;
  const isError = Boolean(error);
  const isVisible = Boolean(activeItem || pendingItem || isError);

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 85,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -140,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  // Auto-dismiss error banner after 6 seconds so user isn't stuck with it
  useEffect(() => {
    if (isError) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isError, onDismiss]);

  if (!isVisible) return null;

  const isPending = Boolean(pendingItem && !activeItem && !isError);
  const isBatch = Boolean(pendingItem?.totalCount && pendingItem.totalCount > 1);
  const displayImageUri = activeItem?.imageUri || pendingItem?.uri;

  const badgeText = isError
    ? error?.isServerOffline
      ? 'SERVER OFFLINE'
      : 'ANALYSIS ERROR'
    : isPending
      ? isBatch
        ? `ANALYZING SCREENSHOTS (${pendingItem?.currentIndex || 1}/${pendingItem?.totalCount})...`
        : 'ANALYZING SCREENSHOT...'
      : 'SUMMARY READY';

  const titleText = isError
    ? error?.title || 'Server is off'
    : isPending
      ? isBatch
        ? `Analyzing ${pendingItem?.totalCount} screenshots...`
        : 'Your summary is almost ready...'
      : activeItem?.title || 'Screenshot Analysis';

  const promptText = isError
    ? error?.message || 'Unable to connect to backend server. Please verify it is running.'
    : isPending
      ? pendingItem?.status || (isBatch ? 'Generating visual summaries...' : 'Processing visual layout...')
      : 'Summary complete! Tap to view actions & code →';

  const handleCardPress = () => {
    if (isError) {
      onDismiss();
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity
        style={[
          styles.card,
          isPending && styles.cardPending,
          isError && styles.cardError,
        ]}
        activeOpacity={0.9}
        onPress={handleCardPress}
      >
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.pulseDot,
                isPending && styles.pulseDotPending,
                isError && styles.pulseDotError,
              ]}
            />
            <Text
              style={[
                styles.badgeText,
                isPending && styles.badgeTextPending,
                isError && styles.badgeTextError,
              ]}
            >
              {badgeText}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            <X size={15} color={isError ? '#F87171' : Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.contentRow}>
          {isError ? (
            <View style={[styles.thumbnail, styles.thumbnailError]}>
              <AlertTriangle size={20} color="#EF4444" />
            </View>
          ) : displayImageUri ? (
            <Image
              source={{ uri: displayImageUri }}
              style={styles.thumbnail}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Zap size={20} color={Colors.primaryLight} />
            </View>
          )}

          <View style={styles.textColumn}>
            <Text style={styles.title} numberOfLines={1}>
              {titleText}
            </Text>
            <Text
              style={[
                styles.promptQuestion,
                isPending && styles.promptPending,
                isError && styles.promptError,
              ]}
              numberOfLines={2}
            >
              {promptText}
            </Text>
          </View>

          <View
            style={[
              styles.actionPill,
              isPending && styles.actionPillPending,
              isError && styles.actionPillError,
            ]}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#0099FF" />
            ) : isError ? (
              <X size={15} color="#EF4444" />
            ) : (
              <Sparkles size={15} color={Colors.primaryLight} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    backgroundColor: 'rgba(23, 27, 36, 0.94)',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  cardPending: {
    borderColor: 'rgba(0, 153, 255, 0.5)',
  },
  cardError: {
    backgroundColor: 'rgba(32, 17, 21, 0.96)',
    borderColor: 'rgba(239, 68, 68, 0.55)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  pulseDotPending: {
    backgroundColor: '#0099FF',
  },
  pulseDotError: {
    backgroundColor: '#EF4444',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  badgeTextPending: {
    color: '#0099FF',
  },
  badgeTextError: {
    color: '#EF4444',
  },
  closeBtn: {
    padding: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailError: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  promptQuestion: {
    fontSize: 12,
    color: '#A5B4FC',
    marginTop: 2,
    fontWeight: '500',
  },
  promptPending: {
    color: 'rgba(255, 255, 255, 0.65)',
  },
  promptError: {
    color: 'rgba(254, 202, 202, 0.9)',
  },
  actionPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillPending: {
    backgroundColor: 'rgba(0, 153, 255, 0.15)',
  },
  actionPillError: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
  },
});
