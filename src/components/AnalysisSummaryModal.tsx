import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle2,
  Filter,
  AlertCircle,
  BookmarkCheck,
  ChevronRight,
  X,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { BatchAnalysisSummary, BatchAnalysisItemResult, ScreenshotAnalysis } from '../types';

export interface AnalysisSummaryModalProps {
  visible: boolean;
  summary: BatchAnalysisSummary | null;
  onClose: () => void;
  onSelectScreenshot?: (analysis: ScreenshotAnalysis) => void;
}

type FilterTab = 'all' | 'analyzed' | 'skipped';

function formatItemDate(timestamp?: number): string {
  if (!timestamp) return '';
  const ms = timestamp < 1e11 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
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

export const AnalysisSummaryModal: React.FC<AnalysisSummaryModalProps> = ({
  visible,
  summary,
  onClose,
  onSelectScreenshot,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const items = useMemo(() => summary?.items || [], [summary?.items]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'analyzed') {
      return items.filter((i) => i.status === 'analyzed' || i.status === 'already_analyzed');
    }
    if (activeTab === 'skipped') {
      return items.filter((i) => i.status === 'skipped' || i.status === 'failed');
    }
    return items;
  }, [items, activeTab]);

  if (!summary) return null;

  const firstAnalyzedItem = items.find((i) => i.analysis)?.analysis;

  const handleCardPress = (item: BatchAnalysisItemResult) => {
    if (item.analysis && onSelectScreenshot) {
      onClose();
      onSelectScreenshot(item.analysis);
    }
  };

  const renderItem = ({ item }: { item: BatchAnalysisItemResult }) => {
    const isAnalyzed = item.status === 'analyzed';
    const isAlready = item.status === 'already_analyzed';
    const isSkipped = item.status === 'skipped';
    const isFailed = item.status === 'failed';

    const hasAnalysis = Boolean(item.analysis);

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : colors.card,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : colors.border,
          },
        ]}
        activeOpacity={hasAnalysis ? 0.75 : 1}
        onPress={() => handleCardPress(item)}
        disabled={!hasAnalysis}
      >
        {/* Left Thumbnail */}
        <View style={styles.thumbnailWrapper}>
          <Image
            source={{ uri: item.uri }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
          />
          {isAnalyzed && (
            <View style={styles.thumbnailBadge}>
              <CheckCircle2 size={12} color="#10B981" />
            </View>
          )}
        </View>

        {/* Right Details */}
        <View style={styles.itemInfo}>
          {/* Header Row: Badge & Date */}
          <View style={styles.badgeRow}>
            {isAnalyzed && (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(16, 185, 129, 0.14)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                <CheckCircle2 size={11} color="#10B981" />
                <Text style={[styles.statusPillText, { color: '#10B981' }]}>
                  Analyzed{item.category ? ` • ${item.category}` : ''}
                </Text>
              </View>
            )}

            {isAlready && (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(0, 153, 255, 0.12)', borderColor: 'rgba(0, 153, 255, 0.3)' }]}>
                <BookmarkCheck size={11} color="#0099ff" />
                <Text style={[styles.statusPillText, { color: '#0099ff' }]}>
                  In Library
                </Text>
              </View>
            )}

            {isSkipped && (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                <Filter size={11} color="#F59E0B" />
                <Text style={[styles.statusPillText, { color: '#F59E0B' }]}>
                  Skipped{item.category ? ` • ${item.category}` : ''}
                </Text>
              </View>
            )}

            {isFailed && (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                <AlertCircle size={11} color="#EF4444" />
                <Text style={[styles.statusPillText, { color: '#EF4444' }]}>
                  Failed
                </Text>
              </View>
            )}

            {item.timestamp && (
              <Text style={[styles.itemDateText, { color: colors.textMuted }]}>
                {formatItemDate(item.timestamp)}
              </Text>
            )}
          </View>

          {/* Title / Description */}
          <Text
            style={[styles.itemTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {item.title || (isAnalyzed ? 'Screenshot Breakdown' : 'Non-Actionable Media')}
          </Text>

          {/* Reason Box */}
          <View
            style={[
              styles.reasonBox,
              {
                backgroundColor: isDark
                  ? isAnalyzed
                    ? 'rgba(16, 185, 129, 0.06)'
                    : 'rgba(255, 255, 255, 0.03)'
                  : isAnalyzed
                  ? 'rgba(16, 185, 129, 0.05)'
                  : colors.surfaceSubtle,
                borderColor: isDark
                  ? isAnalyzed
                    ? 'rgba(16, 185, 129, 0.18)'
                    : 'rgba(255, 255, 255, 0.08)'
                  : isAnalyzed
                  ? 'rgba(16, 185, 129, 0.2)'
                  : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.reasonText,
                {
                  color: isAnalyzed
                    ? isDark ? '#6EE7B7' : '#059669'
                    : colors.textSecondary,
                },
              ]}
              numberOfLines={2}
            >
              {item.reason ||
                (isAnalyzed
                  ? 'Analyzed with Sol vision engine (technical content detected).'
                  : 'Skipped by Luna Gatekeeper (personal photo, meme, or non-actionable).')}
            </Text>
          </View>

          {/* Tap to View Link */}
          {hasAnalysis && (
            <View style={styles.viewLinkRow}>
              <Text style={[styles.viewLinkText, { color: colors.primary }]}>
                View Breakdown & Questions
              </Text>
              <ChevronRight size={13} color={colors.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
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
          {/* Top Sheet Handle */}
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
              <View style={[styles.headerIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.14)' }]}>
                <Sparkles size={18} color="#6366F1" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  Analysis Summary
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {summary.analyzedCount} of {summary.total} screenshot{summary.total === 1 ? '' : 's'} analyzed
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.iconCloseBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceSubtle,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={17} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsContainer}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : colors.surfaceSubtle,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                },
              ]}
            >
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                {summary.total}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Total
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  borderColor: 'rgba(16, 185, 129, 0.25)',
                },
              ]}
            >
              <Text style={[styles.statNumber, { color: '#10B981' }]}>
                {summary.analyzedCount}
              </Text>
              <Text style={[styles.statLabel, { color: '#10B981' }]}>
                Analyzed
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  borderColor: 'rgba(245, 158, 11, 0.25)',
                },
              ]}
            >
              <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
                {summary.skippedCount}
              </Text>
              <Text style={[styles.statLabel, { color: '#F59E0B' }]}>
                Skipped
              </Text>
            </View>
          </View>

          {/* Segmented Filter Pills */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === 'all' && [
                  styles.filterPillActive,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : colors.primary },
                ],
              ]}
              onPress={() => setActiveTab('all')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: activeTab === 'all' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                All ({summary.total})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === 'analyzed' && [
                  styles.filterPillActive,
                  { backgroundColor: '#10B981' },
                ],
              ]}
              onPress={() => setActiveTab('analyzed')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: activeTab === 'analyzed' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Analyzed ({summary.analyzedCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === 'skipped' && [
                  styles.filterPillActive,
                  { backgroundColor: '#F59E0B' },
                ],
              ]}
              onPress={() => setActiveTab('skipped')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: activeTab === 'skipped' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Skipped ({summary.skippedCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Screenshot List */}
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Layers size={28} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No screenshots in this category.
                </Text>
              </View>
            }
          />

          {/* Footer Actions */}
          <View
            style={[
              styles.footerContainer,
              {
                borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border,
              },
            ]}
          >
            {firstAnalyzedItem && onSelectScreenshot && (
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceSubtle,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border,
                  },
                ]}
                onPress={() => {
                  onClose();
                  onSelectScreenshot(firstAnalyzedItem);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
                  View First Breakdown
                </Text>
                <ArrowRight size={15} color={colors.textPrimary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.doneBtnGradient}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    height: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  topHandleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  iconCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterPillActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  thumbnailWrapper: {
    width: 68,
    height: 94,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 8,
    padding: 2,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  itemDateText: {
    fontSize: 10.5,
  },
  itemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 5,
  },
  reasonBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 11,
    lineHeight: 15,
  },
  viewLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  viewLinkText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  doneBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  doneBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
