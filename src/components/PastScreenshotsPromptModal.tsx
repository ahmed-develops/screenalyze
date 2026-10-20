import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  History,
  Sparkles,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import { RetrievedPhoto } from '../services/mediaService';
import { useTheme } from '../theme/ThemeContext';

export interface PastScreenshotsPromptModalProps {
  visible: boolean;
  pastScreenshots: RetrievedPhoto[];
  onAutoAnalyzeAll: () => void;
  onSelectManually: () => void;
  onDismiss: () => void;
}

function formatRelativeDate(timestamp: number): string {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = new Date();
  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const normalized = timestamp < 1e11 ? timestamp * 1000 : timestamp;

  if (normalized >= startOfTodayMs - ONE_DAY_MS) {
    return 'Yesterday';
  }
  const date = new Date(normalized);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const PastScreenshotsPromptModal: React.FC<PastScreenshotsPromptModalProps> = ({
  visible,
  pastScreenshots,
  onAutoAnalyzeAll,
  onSelectManually,
  onDismiss,
}) => {
  const { colors, isDark } = useTheme();
  const count = pastScreenshots.length;
  const previewList = pastScreenshots.slice(0, 4);
  const remainingCount = count > 4 ? count - 4 : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? 'rgba(23, 26, 33, 0.96)' : colors.card,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: 'rgba(99, 102, 241, 0.15)' },
                ]}
              >
                <History size={20} color={colors.primary} />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Past Screenshots
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {count} pending from previous days
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            You have {count} screenshot{count > 1 ? 's' : ''} captured on days when the app wasn&apos;t opened.
            How would you like to process them?
          </Text>

          {/* Mini Preview Thumbnails */}
          {previewList.length > 0 && (
            <View style={styles.previewContainer}>
              <View style={styles.previewRow}>
                {previewList.map((item, index) => (
                  <View key={item.id || index} style={styles.thumbnailWrapper}>
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.thumbnail}
                      contentFit="cover"
                    />
                    <View style={styles.thumbnailDateBadge}>
                      <Text style={styles.thumbnailDateText}>
                        {formatRelativeDate(item.creationTime)}
                      </Text>
                    </View>
                  </View>
                ))}
                {remainingCount > 0 && (
                  <View
                    style={[
                      styles.thumbnailWrapper,
                      styles.moreThumbnail,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.06)'
                          : 'rgba(0, 0, 0, 0.05)',
                        borderColor: isDark
                          ? 'rgba(255, 255, 255, 0.12)'
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.moreCountText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      +{remainingCount}
                    </Text>
                    <Text
                      style={[
                        styles.moreSubText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      more
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action Choice Buttons */}
          <View style={styles.actionsContainer}>
            {/* Auto-Analyze Option */}
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={onAutoAnalyzeAll}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryGradient}
              >
                <View style={styles.actionIconBox}>
                  <Sparkles size={18} color="#FFFFFF" />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.primaryActionTitle}>
                    Auto-Analyze All ({count})
                  </Text>
                  <Text style={styles.primaryActionSubtitle}>
                    Generate summaries automatically in background
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Manual Selection Option */}
            <TouchableOpacity
              style={[
                styles.secondaryActionBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : colors.surfaceSubtle,
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : colors.border,
                },
              ]}
              onPress={onSelectManually}
              activeOpacity={0.82}
            >
              <View
                style={[
                  styles.actionIconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              >
                <SlidersHorizontal size={18} color={colors.textPrimary} />
              </View>
              <View style={styles.actionTextCol}>
                <Text
                  style={[
                    styles.secondaryActionTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Select Manually
                </Text>
                <Text
                  style={[
                    styles.secondaryActionSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Review and choose specific screenshots to analyze
                </Text>
              </View>
            </TouchableOpacity>

            {/* Dismiss Option */}
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={[styles.dismissText, { color: colors.textMuted }]}>
                Not Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  previewContainer: {
    marginBottom: 18,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  thumbnailWrapper: {
    width: 68,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailDateBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  thumbnailDateText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  moreThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreCountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  moreSubText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  actionsContainer: {
    gap: 10,
  },
  primaryActionBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  actionTextCol: {
    flex: 1,
  },
  primaryActionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryActionSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  secondaryActionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  dismissBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
