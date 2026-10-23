import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  History,
  Sparkles,
  X,
  Check,
} from 'lucide-react-native';
import { RetrievedPhoto } from '../services/mediaService';
import { StorageService } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';

export interface PastScreenshotsPromptModalProps {
  visible: boolean;
  pastScreenshots: RetrievedPhoto[];
  onAutoAnalyzeAll?: () => void;
  onAnalyzeSelected?: (selected: RetrievedPhoto[]) => void;
  onSelectManually?: () => void;
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
  onAnalyzeSelected,
  onDismiss,
}) => {
  const { colors, isDark } = useTheme();

  // Track deselected IDs (by default empty, so all past screenshots are pre-selected)
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(() => new Set());
  const [dontRemindAgain, setDontRemindAgain] = useState(false);

  const count = pastScreenshots.length;
  const selectedPhotos = pastScreenshots.filter((s) => !deselectedIds.has(s.id));
  const selectedCount = selectedPhotos.length;
  const isAllSelected = deselectedIds.size === 0 && count > 0;

  const toggleSelect = useCallback((id: string) => {
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (deselectedIds.size === 0) {
      setDeselectedIds(new Set(pastScreenshots.map((s) => s.id)));
    } else {
      setDeselectedIds(new Set());
    }
  }, [deselectedIds.size, pastScreenshots]);

  const handleAnalyze = useCallback(async () => {
    if (dontRemindAgain) {
      await StorageService.saveSettings({ promptPastScreenshotsEnabled: false });
    }

    if (onAnalyzeSelected) {
      onAnalyzeSelected(selectedPhotos);
    } else if (onAutoAnalyzeAll) {
      onAutoAnalyzeAll();
    }
  }, [dontRemindAgain, selectedPhotos, onAnalyzeSelected, onAutoAnalyzeAll]);

  const handleDismiss = useCallback(async () => {
    if (dontRemindAgain) {
      await StorageService.saveSettings({ promptPastScreenshotsEnabled: false });
    }
    onDismiss();
  }, [dontRemindAgain, onDismiss]);


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? 'rgba(23, 26, 33, 0.98)' : colors.card,
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
                  {count} unanalyzed from previous days
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Select screenshots captured when the app wasn&apos;t open to analyze them now:
          </Text>

          {/* Selection Control Bar */}
          <View style={styles.selectionBar}>
            <Text style={[styles.selectionCountText, { color: colors.textPrimary }]}>
              Selected: <Text style={{ color: colors.primary, fontWeight: '700' }}>{selectedCount}</Text> of {count}
            </Text>
            <TouchableOpacity
              style={[
                styles.selectAllBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceSubtle,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border,
                },
              ]}
              onPress={toggleSelectAll}
              activeOpacity={0.7}
            >
              <Text style={[styles.selectAllText, { color: colors.primary }]}>
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Multi-Select Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailsScrollContent}
            style={styles.thumbnailsScroll}
          >
            {pastScreenshots.map((item) => {
              const isSelected = !deselectedIds.has(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.thumbnailCard,
                    {
                      borderColor: isSelected
                        ? colors.primary
                        : isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => toggleSelect(item.id)}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.thumbnailImg}
                    contentFit="cover"
                  />

                  {/* Selection Checkbox Badge */}
                  <View
                    style={[
                      styles.checkCircle,
                      isSelected
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : {
                            backgroundColor: 'rgba(0, 0, 0, 0.55)',
                            borderColor: 'rgba(255, 255, 255, 0.4)',
                          },
                    ]}
                  >
                    {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </View>

                  {/* Date Badge */}
                  <View style={styles.thumbnailDateBadge}>
                    <Text style={styles.thumbnailDateText}>
                      {formatRelativeDate(item.creationTime)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* "Don't Remind Me Again" Checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            activeOpacity={0.7}
            onPress={() => setDontRemindAgain((prev) => !prev)}
          >
            <View
              style={[
                styles.checkboxBox,
                dontRemindAgain
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(0, 0, 0, 0.04)',
                      borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.25)'
                        : colors.border,
                    },
              ]}
            >
              {dontRemindAgain && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
            </View>
            <View style={styles.checkboxLabelCol}>
              <Text style={[styles.checkboxLabel, { color: colors.textPrimary }]}>
                Don&apos;t remind me again
              </Text>
              <Text style={[styles.checkboxHint, { color: colors.textMuted }]}>
                You can turn this back on in Settings anytime
              </Text>
            </View>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                selectedCount === 0 && { opacity: 0.45 },
              ]}
              onPress={handleAnalyze}
              disabled={selectedCount === 0}
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
                    {selectedCount === count
                      ? `Analyze All (${count})`
                      : `Analyze Selected (${selectedCount})`}
                  </Text>
                  <Text style={styles.primaryActionSubtitle}>
                    {selectedCount === 0
                      ? 'Select at least 1 screenshot'
                      : `Process ${selectedCount} screenshot${selectedCount === 1 ? '' : 's'} with AI`}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Dismiss Option */}
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={handleDismiss}
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
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
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
    marginBottom: 10,
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
    lineHeight: 18,
    marginBottom: 12,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectionCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectAllText: {
    fontSize: 11,
    fontWeight: '700',
  },
  thumbnailsScroll: {
    marginBottom: 14,
  },
  thumbnailsScrollContent: {
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  thumbnailCard: {
    width: 82,
    height: 112,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  checkCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabelCol: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  checkboxHint: {
    fontSize: 11,
    marginTop: 1,
  },
  actionsContainer: {
    gap: 8,
  },
  primaryActionBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
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
  dismissBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
