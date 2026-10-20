import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Share2,
  Send,
  X,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  ArrowRight,
  BookOpen,
} from 'lucide-react-native';
import {
  ScreenshotAnalysis,
  ContextualAction,
  GeneratedArtifact,
  isAppropriateScreenshot,
} from '../types';
import { Colors } from '../theme/colors';
import { AIService } from '../services/aiService';
import { StorageService } from '../services/storageService';
import { getFriendlyAnalysisError } from '../utils/errorUtils';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';

interface ActionPickerModalProps {
  visible: boolean;
  screenshot: ScreenshotAnalysis | null;
  onClose: () => void;
  onActionComplete: (updated: ScreenshotAnalysis, actionTitle: string) => void;
}

export const ActionPickerModal: React.FC<ActionPickerModalProps> = ({
  visible,
  screenshot,
  onClose,
  onActionComplete,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [loadingPrompt, setLoadingPrompt] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const handleExecutePrompt = useCallback(
    async (promptText: string, customTitle?: string) => {
      if (!screenshot || !promptText.trim()) return;
      setLoadingPrompt(promptText);

      try {
        const result = await AIService.executeAction(
          screenshot,
          promptText
        );

        const now = Date.now();
        const newArtifact: GeneratedArtifact = {
          id: `gen-${now}`,
          type: promptText.toLowerCase().includes('tutorial')
            ? 'tutorial'
            : promptText.toLowerCase().includes('explain')
              ? 'explanation'
              : 'question_answer',
          title: customTitle || result.title,
          prompt: promptText,
          content: result.content,
          timestamp: now,
          nextFollowUps: result.nextFollowUps,
        };

        const updated = await StorageService.updateScreenshot(screenshot.id, (prev) => ({
          ...prev,
          isReviewed: true,
          followUpQuestions: [
            ...result.nextFollowUps,
            ...(prev.followUpQuestions || []).filter((q) => q !== promptText),
          ],
          generatedContent: [...(prev.generatedContent || []), newArtifact],
        }));

        setLoadingPrompt(null);
        setCustomInput('');
        if (updated) {
          onActionComplete(updated, result.title);
        }
      } catch (err) {
        console.error('Failed to execute action:', err);
        setLoadingPrompt(null);
        const friendly = getFriendlyAnalysisError(err);
        Alert.alert(friendly.title, friendly.message);
      }
    },
    [screenshot, onActionComplete]
  );

  const handleShare = useCallback(async () => {
    if (!screenshot) return;
    const shareText = `📌 ${screenshot.title}\n\n${screenshot.summary}\n\nKey Concepts:\n${screenshot.keyPoints
      .map((p) => `• ${p}`)
      .join('\n')}\n\nAnalyzed with Screenalyze`;

    if (await Sharing.isAvailableAsync()) {
      try {
        await Sharing.shareAsync(screenshot.imageUri, { dialogTitle: screenshot.title });
      } catch {
        await Clipboard.setStringAsync(shareText);
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2000);
      }
    } else {
      await Clipboard.setStringAsync(shareText);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    }
  }, [screenshot]);

  if (!screenshot || !visible || !isAppropriateScreenshot(screenshot)) return null;

  const contextualActions: ContextualAction[] =
    screenshot.contextualActions && screenshot.contextualActions.length > 0
      ? screenshot.contextualActions
      : [
        {
          id: 'fallback-1',
          label: `Create a step-by-step tutorial for ${screenshot.title}`,
          badge: 'Step-by-Step Tutorial',
          type: 'tutorial',
        },
        {
          id: 'fallback-2',
          label: `Explain key concepts and architecture trade-offs`,
          badge: 'Deep Dive Explanation',
          type: 'explanation',
        },
      ];

  const followUpQuestions: string[] = screenshot.followUpQuestions || [];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* <View style={styles.sparkleIconContainer}>
                <Sparkles size={20} color={Colors.primaryLight} />
              </View> */}
              <View>
                <Text style={styles.headerTitle}>Summary</Text>
                {/* <Text style={styles.headerSubtitle}>Generated specifically for this screenshot</Text> */}
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Screenshot Summary Preview */}
            <View style={styles.summaryCard}>
              <View style={styles.previewRow}>
                <Image
                  source={{ uri: screenshot.imageUri }}
                  style={styles.thumbnail}
                  contentFit="cover"
                />
                <View style={styles.titleColumn}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {screenshot.category.toUpperCase().replace('-', ' ')}
                    </Text>
                  </View>
                  <Text style={styles.screenshotTitle} numberOfLines={2}>
                    {screenshot.title}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />
              <Text style={styles.summaryQuote}>{`"${screenshot.summary}"`}</Text>

              {/* Key Highlights */}
              <View style={styles.keyPointsContainer}>
                {screenshot.keyPoints.slice(0, 3).map((pt, i) => (
                  <View key={i} style={styles.keyPointItem}>
                    <CheckCircle2 size={13} color={Colors.accent} style={{ marginTop: 2 }} />
                    <Text style={styles.keyPointText}>{pt}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Section 1: Contextual Actions (Tailored by LLM) */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionLabelRow}>
                <BookOpen size={16} color={Colors.primaryLight} />
                <Text style={styles.sectionLabel}>TAILORED ACTIONS FOR THIS PHOTO</Text>
              </View>

              {contextualActions.map((action, idx) => {
                const isLoading = loadingPrompt === action.label;
                return (
                  <TouchableOpacity
                    key={action.id || idx}
                    style={[styles.actionCard, isLoading && styles.actionCardLoading]}
                    activeOpacity={0.8}
                    disabled={loadingPrompt !== null}
                    onPress={() => handleExecutePrompt(action.label, action.label)}
                  >
                    <View style={styles.actionDetails}>
                      <View style={styles.actionBadgeRow}>
                        <View style={styles.actionBadge}>
                          <Text style={styles.actionBadgeText}>{action.badge}</Text>
                        </View>
                      </View>
                      <Text style={styles.actionTitle}>{action.label}</Text>
                    </View>

                    {isLoading ? (
                      <ActivityIndicator color={Colors.primaryLight} size="small" />
                    ) : (
                      <ChevronRight size={18} color={Colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Section 2: Contextual Follow-Up Questions (Derived from Photo by LLM) */}
            {followUpQuestions.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionLabelRow}>
                  <HelpCircle size={16} color={Colors.accent} />
                  <Text style={styles.sectionLabel}>CONTEXTUAL FOLLOW-UP QUESTIONS</Text>
                </View>

                {followUpQuestions.map((q, idx) => {
                  const isLoading = loadingPrompt === q;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.questionCard, isLoading && styles.actionCardLoading]}
                      activeOpacity={0.8}
                      disabled={loadingPrompt !== null}
                      onPress={() => handleExecutePrompt(q, q)}
                    >
                      <View style={styles.questionIconBox}>
                        <HelpCircle size={16} color={Colors.accent} />
                      </View>
                      <Text style={styles.questionCardText}>{q}</Text>

                      {isLoading ? (
                        <ActivityIndicator color={Colors.accent} size="small" />
                      ) : (
                        <ArrowRight size={16} color={Colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Section 3: Custom Question Input (Type yourself) */}
            <View style={styles.customSection}>
              <Text style={styles.customSectionTitle}>Ask your own question about this screenshot:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.customInput}
                  placeholder="e.g. How does this compare to Kafka? What are failure modes?"
                  placeholderTextColor={Colors.textMuted}
                  value={customInput}
                  onChangeText={setCustomInput}
                  multiline={false}
                  onSubmitEditing={() => {
                    if (customInput.trim()) {
                      handleExecutePrompt(customInput.trim());
                    }
                  }}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (!customInput.trim() || loadingPrompt !== null) && styles.sendBtnDisabled,
                  ]}
                  disabled={!customInput.trim() || loadingPrompt !== null}
                  onPress={() => handleExecutePrompt(customInput.trim())}
                >
                  {loadingPrompt === customInput.trim() ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Share button */}
            <TouchableOpacity style={styles.shareRowBtn} activeOpacity={0.8} onPress={handleShare}>
              <Share2 size={16} color={Colors.textSecondary} />
              <Text style={styles.shareRowText}>Share screenshot summary & notes</Text>
            </TouchableOpacity>

            {copiedNotification && (
              <View style={styles.copiedBanner}>
                <CheckCircle2 size={15} color={Colors.success} />
                <Text style={styles.copiedBannerText}>Summary copied to clipboard!</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sparkleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 18,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  thumbnail: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSubtle,
  },
  titleColumn: {
    flex: 1,
    gap: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryLight,
    letterSpacing: 0.5,
  },
  screenshotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  summaryQuote: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 8,
  },
  keyPointsContainer: {
    gap: 4,
  },
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  keyPointText: {
    fontSize: 12,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 16,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  actionCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionCardLoading: {
    borderColor: Colors.primaryLight,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  actionDetails: {
    flex: 1,
  },
  actionBadgeRow: {
    marginBottom: 4,
  },
  actionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accent,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  questionCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  questionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionCardText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
    lineHeight: 18,
  },
  customSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  customSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  shareRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 20,
  },
  shareRowText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  copiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  copiedBannerText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
});
