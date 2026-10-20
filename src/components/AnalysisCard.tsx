import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import {
  Clock,
  ChevronRight,
  BellRing,
} from 'lucide-react-native';
import { ScreenshotAnalysis } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface AnalysisCardProps {
  item: ScreenshotAnalysis;
  onPress: () => void;
  onOpenActions: () => void;
  onSelectQuestion?: (question: string) => void;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({
  item,
  onPress,
  onOpenActions,
  onSelectQuestion,
}) => {
  const { colors, isDark } = useTheme();

  const formattedDate = new Date(item.capturedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // const tutorialCount = item.generatedContent?.length || 0;
  const isUnreviewed = !item.isReviewed;
  // const followUps = item.followUpQuestions || [];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(29, 32, 38, 0.72)' : colors.card,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
          shadowOpacity: isDark ? 0.2 : 0.05,
        },
        isUnreviewed && styles.unreviewedCard,
      ]}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {/* Header info */}
        <View style={styles.cardTop}>
          <View style={styles.badgeRow}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.badgeBg }]}>
              <Text style={[styles.categoryBadgeText, { color: colors.badgeText }]}>
                {item.category.toUpperCase().replace('-', ' ')}
              </Text>
            </View>

            {isUnreviewed && (
              <View style={styles.unreviewedBadge}>
                <BellRing size={11} color={colors.warning} />
                <Text style={styles.unreviewedBadgeText}>NEW / UNREVIEWED</Text>
              </View>
            )}
          </View>

          <View style={styles.timeRow}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={[styles.timeText, { color: colors.textMuted }]}>{formattedDate}</Text>
          </View>
        </View>

        {/* Thumbnail & Description */}
        <View style={styles.mainRow}>
          <Image
            source={{ uri: item.imageUri }}
            style={[styles.thumbnail, { backgroundColor: colors.surfaceSubtle }]}
            contentFit="cover"
            transition={200}
          />

          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.summary.replace(/\*\*/g, '').replace(/__/g, '')}
            </Text>
          </View>
        </View>

        {/* Suggested interactive question preview */}
        {/* {followUps.length > 0 && (
          <View
            style={[
              styles.questionsPreview,
              { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border },
            ]}
          >
            <View style={styles.questionHeader}>
              <HelpCircle size={12} color={colors.accent} />
              <Text style={[styles.questionHeaderText, { color: colors.accent }]}>
                Ask Vision Engine:
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.questionChip,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.surfaceSubtle,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                },
              ]}
              onPress={() => onSelectQuestion && onSelectQuestion(followUps[0])}
            >
              <Text
                style={[styles.questionChipText, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                &ldquo;{followUps[0]}&rdquo;
              </Text>
              <ChevronRight size={13} color={colors.primaryLight} />
            </TouchableOpacity>
          </View>
        )} */}
      </TouchableOpacity>

      {/* Action footer */}
      <View
        style={[
          styles.actionStrip,
          {
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.surfaceSubtle,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.cardBorder,
            },
          ]}
          activeOpacity={0.75}
          onPress={onOpenActions}
        >
          {/* <Sparkles size={14} color={colors.accent} /> */}
          <Text
            style={[styles.actionBtnText, { color: colors.primary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.contextualActions && item.contextualActions.length > 0
              ? item.contextualActions[0].label
              : 'Choose Action'}
          </Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>

        {/* {tutorialCount > 0 && (
          <View style={styles.tutorialBadge}>
            <Text style={[styles.tutorialBadgeText, { color: colors.success }]}>
              {tutorialCount} {tutorialCount === 1 ? 'doc' : 'docs'}
            </Text>
          </View>
        )} */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  unreviewedCard: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.03)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  unreviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  unreviewedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnail: {
    width: 76,
    height: 76,
    borderRadius: 12,
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
  },
  questionsPreview: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  questionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  questionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  questionChipText: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
    marginRight: 6,
  },
  actionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 0,
  },
  actionBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 0,
  },
  tutorialBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tutorialBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
