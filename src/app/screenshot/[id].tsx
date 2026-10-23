import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Sparkles,
  Share2,
  Trash2,
  Clock,
  CheckCircle2,
  Maximize2,
  X,
  HelpCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Plus,
  BookOpen,
  RefreshCw,
  ExternalLink,
  Globe,
  Zap,
} from 'lucide-react-native';
import { StorageService } from '../../services/storageService';
import { AIService } from '../../services/aiService';
import { ApiClient } from '../../services/apiClient';
import { ScreenshotAnalysis, GeneratedArtifact } from '../../types';
import { Colors } from '../../theme/colors';
import { getFriendlyAnalysisError } from '../../utils/errorUtils';
import { FormattedAIResponse } from '../../components/FormattedAIResponse';
import { ActionPickerModal } from '../../components/ActionPickerModal';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';


interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  title?: string;
  type?: string;
  timestamp: number;
  nextFollowUps?: string[];
  isInitialAnalysis?: boolean;
}

export default function ScreenshotDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, autoAction } = useLocalSearchParams<{ id: string; autoAction?: string }>();
  const [screenshot, setScreenshot] = useState<ScreenshotAnalysis | null>(() => {
    return id ? StorageService.getScreenshotById(id) : null;
  });
  const [loading, setLoading] = useState(() => Boolean(id && !StorageService.getScreenshotById(id)));
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [fullImageVisible, setFullImageVisible] = useState(false);
  const [executingPrompt, setExecutingPrompt] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const hasHandledAutoAction = useRef(false);

  const scrollToBottom = useCallback((delay = 100) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, delay);
  }, []);

  const handleExecute = useCallback(
    async (targetScreenshot: ScreenshotAnalysis, promptText: string) => {
      const cleanPrompt = promptText.trim();
      if (!cleanPrompt || executingPrompt !== null) return;
      setExecutingPrompt(cleanPrompt);
      setInputText('');
      scrollToBottom(50);

      try {
        const res = await AIService.executeAction(
          targetScreenshot,
          cleanPrompt
        );

        const now = Date.now();
        const newArtifact: GeneratedArtifact = {
          id: `gen-${now}`,
          type: cleanPrompt.toLowerCase().includes('tutorial')
            ? 'tutorial'
            : cleanPrompt.toLowerCase().includes('explain')
              ? 'explanation'
              : 'question_answer',
          title: res.title,
          prompt: cleanPrompt,
          content: res.content,
          timestamp: now,
          nextFollowUps: res.nextFollowUps,
        };

        const updated = await StorageService.updateScreenshot(targetScreenshot.id, (prev) => ({
          ...prev,
          isReviewed: true,
          followUpQuestions: [
            ...res.nextFollowUps,
            ...(prev.followUpQuestions || []).filter((q) => q !== cleanPrompt),
          ],
          generatedContent: [...(prev.generatedContent || []), newArtifact],
        }));

        if (updated) {
          setScreenshot(updated);
        }
        scrollToBottom(150);
      } catch (err) {
        console.error('Failed executing action', err);
        const friendly = getFriendlyAnalysisError(err);
        Alert.alert(friendly.title, friendly.message);
      } finally {
        setExecutingPrompt(null);
      }
    },
    [executingPrompt, scrollToBottom]
  );

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    StorageService.getScreenshots().then(async (items) => {
      if (!isMounted) return;
      const found = items.find((s) => s.id === id) || null;
      if (found) {
        if (!found.isReviewed) {
          const updatedReviewed = await StorageService.updateScreenshot(found.id, (prev) => ({
            ...prev,
            isReviewed: true,
          }));
          if (isMounted && updatedReviewed) {
            setScreenshot(updatedReviewed);
          } else {
            setScreenshot(found);
          }
        } else {
          setScreenshot(found);
        }
      } else {
        setScreenshot(null);
      }
      setLoading(false);

      if (found && autoAction && !hasHandledAutoAction.current) {
        hasHandledAutoAction.current = true;
        if (autoAction === 'SHARE_TUTORIAL') {
          setTimeout(() => {
            const shareText = `📌 ${found.title}\n\n${found.summary}\n\nKey Concepts:\n${found.keyPoints.map((p) => `• ${p}`).join('\n')}\n\nAnalyzed with Screenalyze`;
            Sharing.isAvailableAsync().then((avail) => {
              if (avail) {
                Sharing.shareAsync(found.imageUri, { dialogTitle: found.title }).catch(() => {
                  Clipboard.setStringAsync(shareText);
                });
              } else {
                Clipboard.setStringAsync(shareText);
              }
            });
          }, 300);
          return;
        }

        if (autoAction === 'CUSTOM_ACTION') {
          setActionModalVisible(true);
          return;
        }

        const promptText =
          autoAction === 'EXPLAIN_TUTORIAL'
            ? found.contextualActions?.[1]?.label || `Explain key concepts of ${found.title}`
            : found.contextualActions?.[0]?.label || `Create a step-by-step tutorial for ${found.title}`;

        handleExecute(found, promptText);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [autoAction, handleExecute, id]);

  const handleDelete = () => {
    Alert.alert('Delete Screenshot', 'Remove this screenshot and all generated chat messages?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            await StorageService.deleteScreenshot(id);
            router.back();
          }
        },
      },
    ]);
  };

  const handleReanalyze = useCallback(() => {
    if (!screenshot || isReanalyzing) return;

    Alert.alert(
      'Re-analyze Screenshot?',
      'This will run a new analysis and overwrite the existing insights and action suggestions for this screenshot. Would you like to proceed?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Re-analyze & Overwrite',
          style: 'destructive',
          onPress: async () => {
            setIsReanalyzing(true);
            try {
              const freshResult = await AIService.analyzeScreenshot(
                screenshot.imageUri,
                undefined,
                undefined,
                true // forceReanalyze = true to overwrite cache
              );

              const updated = await StorageService.updateScreenshot(screenshot.id, (prev) => ({
                ...prev,
                title: freshResult.title,
                category: freshResult.category,
                summary: freshResult.summary,
                keyPoints: freshResult.keyPoints,
                contextualActions: freshResult.contextualActions,
                followUpQuestions: freshResult.followUpQuestions,
                imageHash: freshResult.imageHash || prev.imageHash,
                alreadyAnalyzed: false,
              }));

              if (updated) {
                setScreenshot(updated);
              }
              Alert.alert(
                'Analysis Overwritten',
                'This screenshot has been refreshed with new insights.'
              );
            } catch (err) {
              console.error('Failed to re-analyze screenshot', err);
              const friendly = getFriendlyAnalysisError(err);
              Alert.alert(friendly.title, friendly.message);
            } finally {
              setIsReanalyzing(false);
            }
          },
        },
      ]
    );
  }, [screenshot, isReanalyzing]);

  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardUrl, setForwardUrl] = useState<string | null>(null);

  const handleShareOverall = () => {
    setForwardModalVisible(true);
  };

  const handleNativeShare = async () => {
    if (!screenshot) return;
    const shareText = `📌 ${screenshot.title}\n\n${screenshot.summary}\n\nKey Concepts:\n${screenshot.keyPoints.map((p) => `• ${p}`).join('\n')}\n\nAnalyzed with Screenalyze`;

    if (await Sharing.isAvailableAsync()) {
      try {
        await Sharing.shareAsync(screenshot.imageUri, {
          dialogTitle: screenshot.title,
        });
      } catch (e) {
        console.warn('Share cancelled or failed', e);
        await Clipboard.setStringAsync(shareText);
      }
    } else {
      await Clipboard.setStringAsync(shareText);
    }
  };

  const handleForwardToWeb = async (openImmediately: boolean = true) => {
    if (!screenshot || isForwarding) return;
    setIsForwarding(true);

    try {
      const base64 = await AIService.getImageBase64(screenshot.imageUri);

      const res = await ApiClient.forwardScreenshotSession({
        screenshotId: screenshot.id,
        title: screenshot.title,
        category: screenshot.category,
        summary: screenshot.summary,
        keyPoints: screenshot.keyPoints,
        contextualActions: screenshot.contextualActions,
        followUpQuestions: screenshot.followUpQuestions,
        generatedContent: screenshot.generatedContent,
        imageBase64: base64,
        imageUrl: screenshot.imageUri,
        initialPrompt: screenshot.summary,
      });

      setForwardUrl(res.dashboardUrl);
      await Clipboard.setStringAsync(res.dashboardUrl);

      if (openImmediately) {
        await Linking.openURL(res.dashboardUrl);
        setForwardModalVisible(false);
      } else {
        Alert.alert(
          'Web Session Copied!',
          'Live session URL copied to clipboard. You can paste it into your desktop browser.'
        );
      }
    } catch (err: unknown) {
      console.error('Failed forwarding screenshot to web', err);
      const friendly = getFriendlyAnalysisError(err);
      Alert.alert(friendly.title, friendly.message);
    } finally {
      setIsForwarding(false);
    }
  };


  const handleCopyText = async (text: string, messageId: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Convert screenshot analysis & generatedContent into conversational chat messages
  const buildChatMessages = (): ChatMessage[] => {
    if (!screenshot) return [];

    const messages: ChatMessage[] = [];

    // Message 0: Initial AI analysis of screenshot
    messages.push({
      id: `initial-${screenshot.id}`,
      sender: 'assistant',
      text: screenshot.summary,
      title: screenshot.title,
      type: 'initial_analysis',
      timestamp: screenshot.capturedAt,
      nextFollowUps: screenshot.followUpQuestions,
      isInitialAnalysis: true,
    });

    // Multi-turn Q&A from generatedContent
    (screenshot.generatedContent || []).forEach((item, index) => {
      const userText = item.prompt || item.customPrompt || item.title;
      // User message
      messages.push({
        id: `user-${item.id || index}`,
        sender: 'user',
        text: userText,
        timestamp: item.timestamp,
      });

      // Assistant response message
      messages.push({
        id: `assistant-${item.id || index}`,
        sender: 'assistant',
        text: item.content,
        title: item.title,
        type: item.type,
        timestamp: item.timestamp + 1,
        nextFollowUps: item.nextFollowUps,
      });
    });

    return messages;
  };

  // Render professional markdown formatting for AI responses
  const renderFormattedAIContent = (content: string) => {
    return <FormattedAIResponse content={content} />;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryLight} />
      </View>
    );
  }

  if (!screenshot) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Screenshot not found.</Text>
      </View>
    );
  }

  const chatMessages = buildChatMessages();

  // Aggregate available quick suggestions
  const quickQuestions = screenshot.followUpQuestions || [];
  const contextualActions = screenshot.contextualActions || [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_right' }} />

      {/* Top Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={22} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          {/* <View style={styles.aiAvatarSmall}>
            <Sparkles size={14} color="#ffffff" />
          </View> */}
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitleText} numberOfLines={1}>
              {screenshot.title}
            </Text>
            {/* <View style={styles.headerStatusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerSubtitleText}>GPT-4o Vision Assistant</Text>
            </View> */}
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerActionCircle}
            onPress={handleReanalyze}
            disabled={isReanalyzing}
            activeOpacity={0.7}
            accessibilityLabel="Re-analyze Screenshot"
          >
            {isReanalyzing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <RefreshCw size={15} color="#ffffff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionCircle}
            onPress={() => setFullImageVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="View Full Image"
          >
            <Maximize2 size={16} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionCircle}
            onPress={handleShareOverall}
            activeOpacity={0.7}
            accessibilityLabel="Share Screenshot"
          >
            <Share2 size={16} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionCircle, styles.deleteActionCircle]}
            onPress={handleDelete}
            activeOpacity={0.7}
            accessibilityLabel="Delete"
          >
            <Trash2 size={16} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {/* Chat Scroll View */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScroll}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: 24 },
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToBottom(50)}
        >
          {/* Chat Messages Stream */}
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';

            if (isUser) {
              return (
                <View key={msg.id} style={styles.userMessageRow}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userMessageText}>{msg.text}</Text>
                    <Text style={styles.messageTimeText}>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              );
            }

            // Assistant Message
            return (
              <View key={msg.id} style={styles.assistantMessageRow}>
                {/* <View style={styles.aiAvatar}>
                  <Sparkles size={16} color="#ffffff" />
                </View> */}

                <View style={styles.assistantBubble}>
                  {/* Initial Analysis Welcome Card */}
                  {msg.isInitialAnalysis ? (
                    <View style={styles.initialAnalysisCard}>
                      <TouchableOpacity
                        style={styles.imagePreviewWrapper}
                        activeOpacity={0.9}
                        onPress={() => setFullImageVisible(true)}
                      >
                        <Image
                          source={{ uri: screenshot.imageUri }}
                          style={styles.screenshotImage}
                          contentFit="cover"
                        />
                        <View style={styles.imageZoomBadge}>
                          <Maximize2 size={12} color="#ffffff" />
                          <Text style={styles.imageZoomBadgeText}>Tap to enlarge</Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.initialMetaRow}>
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryPillText}>
                            {screenshot.category.toUpperCase().replace('-', ' ')}
                          </Text>
                        </View>
                        <View style={styles.timeTag}>
                          <Clock size={11} color={Colors.textMuted} />
                          <Text style={styles.timeTagText}>
                            {new Date(screenshot.capturedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.initialTitle}>{screenshot.title}</Text>
                      <View style={{ marginVertical: 4 }}>
                        <FormattedAIResponse content={screenshot.summary} />
                      </View>

                      {/* Key identified concepts */}
                      {screenshot.keyPoints && screenshot.keyPoints.length > 0 && (
                        <View style={styles.keyConceptsBox}>
                          <Text style={styles.keyConceptsHeader}>Key Identified Concepts:</Text>
                          {screenshot.keyPoints.map((point, idx) => (
                            <View key={idx} style={styles.keyConceptRow}>
                              <CheckCircle2 size={13} color={Colors.accent} style={{ marginTop: 2 }} />
                              <Text style={styles.keyConceptText}>
                                {point.replace(/\*\*/g, '').replace(/__/g, '')}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Forward to Web Dashboard & MCP Studio Banner */}
                      <TouchableOpacity
                        style={styles.forwardBanner}
                        activeOpacity={0.85}
                        onPress={() => handleForwardToWeb(true)}
                        disabled={isForwarding}
                      >
                        <LinearGradient
                          colors={['rgba(0, 240, 255, 0.14)', 'rgba(139, 92, 246, 0.14)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.forwardBannerGradient}
                        >
                          <View style={styles.forwardBannerLeft}>
                            <View style={styles.forwardBannerIcon}>
                              <Globe size={18} color="#00F0FF" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={styles.forwardTitleRow}>
                                <Text style={styles.forwardBannerTitle}>Forward to Web Dashboard</Text>
                                <View style={styles.mcpPill}>
                                  <Text style={styles.mcpPillText}>MCP STUDIO</Text>
                                </View>
                              </View>
                              <Text style={styles.forwardBannerSubtitle}>
                                Open live session in browser to trigger automated workflows & connect MCP tools
                              </Text>
                            </View>
                          </View>
                          {isForwarding ? (
                            <ActivityIndicator size="small" color="#00F0FF" />
                          ) : (
                            <ExternalLink size={16} color="#00F0FF" />
                          )}
                        </LinearGradient>
                      </TouchableOpacity>

                      {/* Interactive Options Directly in Welcome Message */}
                      <View style={styles.initialQuickActionsSection}>

                        <Text style={styles.quickActionsLabel}>QUICK ACTIONS & QUESTIONS:</Text>
                        <View style={styles.quickActionsList}>
                          {contextualActions.map((action, aIdx) => (
                            <TouchableOpacity
                              key={action.id || aIdx}
                              style={styles.quickActionCard}
                              activeOpacity={0.8}
                              disabled={executingPrompt !== null}
                              onPress={() => handleExecute(screenshot, action.label)}
                            >
                              {/* <View style={styles.quickActionIcon}>
                                <Sparkles size={14} color={Colors.accent} />
                              </View> */}
                              <Text style={styles.quickActionText}>{action.label}</Text>
                            </TouchableOpacity>
                          ))}

                          {quickQuestions.slice(0, 3).map((q, qIdx) => (
                            <TouchableOpacity
                              key={qIdx}
                              style={styles.quickQuestionCard}
                              activeOpacity={0.8}
                              disabled={executingPrompt !== null}
                              onPress={() => handleExecute(screenshot, q)}
                            >
                              <View style={styles.quickQuestionIcon}>
                                <HelpCircle size={14} color={Colors.primaryLight} />
                              </View>
                              <Text style={styles.quickQuestionText}>{q}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                  ) : (
                    // Regular AI Response Bubble
                    <View style={styles.regularResponseCard}>
                      {msg.title && (
                        <View style={styles.responseHeaderRow}>
                          <View style={styles.responseBadge}>
                            <BookOpen size={12} color={Colors.primaryLight} />
                            <Text style={styles.responseBadgeText}>
                              {(msg.type || 'ANSWER').toUpperCase()}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.copyBtn}
                            onPress={() => handleCopyText(msg.text, msg.id)}
                            activeOpacity={0.7}
                          >
                            {copiedId === msg.id ? (
                              <Check size={13} color={Colors.success} />
                            ) : (
                              <Copy size={13} color={Colors.textSecondary} />
                            )}
                            <Text
                              style={[
                                styles.copyBtnText,
                                copiedId === msg.id && { color: Colors.success },
                              ]}
                            >
                              {copiedId === msg.id ? 'Copied' : 'Copy'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {msg.title && <Text style={styles.responseTitle}>{msg.title}</Text>}

                      <View style={styles.responseBody}>{renderFormattedAIContent(msg.text)}</View>

                      {/* Next suggested follow-ups below this answer */}
                      {msg.nextFollowUps && msg.nextFollowUps.length > 0 && (
                        <View style={styles.followUpSection}>
                          <Text style={styles.followUpSectionTitle}>EXPLORE NEXT:</Text>
                          <View style={styles.followUpChipsCol}>
                            {msg.nextFollowUps.map((nextQ, nIdx) => (
                              <TouchableOpacity
                                key={nIdx}
                                style={styles.followUpChip}
                                activeOpacity={0.8}
                                disabled={executingPrompt !== null}
                                onPress={() => handleExecute(screenshot, nextQ)}
                              >
                                <Sparkles size={12} color={Colors.accent} />
                                <Text
                                  style={styles.followUpChipText}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                >
                                  {nextQ}
                                </Text>
                                <ChevronRight size={13} color="rgba(6, 182, 212, 0.7)" />
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* AI Thinking / Generating Indicator */}
          {executingPrompt !== null && (
            <View style={styles.assistantMessageRow}>
              <View style={styles.aiAvatar}>
                <Sparkles size={16} color="#ffffff" />
              </View>
              <View style={styles.thinkingBubble}>
                <ActivityIndicator size="small" color={Colors.accent} />
                <View style={styles.thinkingTextCol}>
                  <Text style={styles.thinkingTitle}>Thinking...</Text>
                  <Text
                    style={styles.thinkingSubtitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Analyzing visual context & writing answer
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Options Carousel Bar (Docked above input) */}
        {quickQuestions.length > 0 && executingPrompt === null && (
          <View style={styles.quickBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickBarContent}
            >
              {quickQuestions.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickBarChip}
                  activeOpacity={0.8}
                  onPress={() => handleExecute(screenshot, q)}
                >
                  <HelpCircle size={13} color={Colors.accent} />
                  <Text
                    style={styles.quickBarChipText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Pinned Bottom Chat Input Bar */}
        <View style={[styles.inputBarWrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TouchableOpacity
            style={styles.optionsActionBtn}
            activeOpacity={0.8}
            onPress={() => setActionModalVisible(true)}
            accessibilityLabel="Action Options Menu"
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.textInputBox}>
            <TextInput
              style={styles.chatTextInput}
              placeholder="Ask a question or request a tutorial..."
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={() => {
                if (inputText.trim()) {
                  handleExecute(screenshot, inputText.trim());
                }
              }}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || executingPrompt !== null) && styles.sendBtnDisabled,
            ]}
            disabled={!inputText.trim() || executingPrompt !== null}
            activeOpacity={0.8}
            onPress={() => handleExecute(screenshot, inputText.trim())}
          >
            {executingPrompt === inputText.trim() ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={16} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Action Picker Prompt Modal */}
      <ActionPickerModal
        visible={actionModalVisible}
        screenshot={screenshot}
        onClose={() => setActionModalVisible(false)}
        onActionComplete={(updated) => {
          setScreenshot(updated);
          setActionModalVisible(false);
          scrollToBottom(150);
        }}
      />

      {/* Forward to Web Dashboard & MCP Studio Modal */}

      <Modal
        visible={forwardModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setForwardModalVisible(false)}
      >
        <View style={styles.forwardModalOverlay}>
          <View style={styles.forwardModalContent}>
            {/* Modal Header */}
            <View style={styles.forwardModalHeader}>
              <View style={styles.forwardHeaderLeft}>
                <View style={styles.forwardIconBadge}>
                  <Zap size={18} color="#00F0FF" />
                </View>
                <View>
                  <Text style={styles.forwardModalTitle}>Forwarding Workflow</Text>
                  <Text style={styles.forwardModalSubtitle}>
                    Web Dashboard & MCP Integrations Hub
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setForwardModalVisible(false)}
                style={styles.forwardModalClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Explanatory Notice */}
            <View style={styles.forwardNoticeBox}>
              <Text style={styles.forwardNoticeText}>
                Forwarding starts this screenshot and its analysis prompt in a connected Web Dashboard session. You can execute prompts, run automated workflows (GitHub PRs, Terraform, Slack digests), and connect MCP servers.
              </Text>
            </View>

            {/* Action 1: Launch in Browser */}
            <TouchableOpacity
              style={styles.forwardPrimaryAction}
              activeOpacity={0.85}
              disabled={isForwarding}
              onPress={() => handleForwardToWeb(true)}
            >
              <LinearGradient
                colors={['#00F0FF', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.forwardPrimaryGradient}
              >
                <Globe size={18} color="#000" />
                <Text style={styles.forwardPrimaryText}>
                  {isForwarding ? 'Forwarding Session...' : 'Open in Web Browser'}
                </Text>
                {isForwarding ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <ExternalLink size={16} color="#000" />
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Action 2: Copy Live Session Link */}
            <TouchableOpacity
              style={styles.forwardSecondaryAction}
              activeOpacity={0.8}
              disabled={isForwarding}
              onPress={() => handleForwardToWeb(false)}
            >
              <Copy size={16} color={Colors.accent} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.forwardSecondaryTitle}>Copy Desktop Web Link</Text>
                <Text style={styles.forwardSecondarySub}>
                  Paste URL in your Mac / PC desktop browser
                </Text>
              </View>
            </TouchableOpacity>

            {/* Action 3: Native System Share */}
            <TouchableOpacity
              style={styles.forwardSecondaryAction}
              activeOpacity={0.8}
              onPress={() => {
                setForwardModalVisible(false);
                handleNativeShare();
              }}
            >
              <Share2 size={16} color={Colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.forwardSecondaryTitle}>Standard System Share</Text>
                <Text style={styles.forwardSecondarySub}>
                  Send image & summary via AirDrop, Messages, etc.
                </Text>
              </View>
            </TouchableOpacity>

            {forwardUrl && (
              <View style={styles.forwardUrlPreviewBox}>
                <Text style={styles.forwardUrlLabel}>ACTIVE SESSION LINK:</Text>
                <Text style={styles.forwardUrlText} numberOfLines={1}>{forwardUrl}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>


      {/* Full Image Zoom Modal */}

      <Modal
        visible={fullImageVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullImageVisible(false)}
      >
        <View style={styles.fullImageOverlay}>
          <TouchableOpacity
            style={styles.fullImageClose}
            onPress={() => setFullImageVisible(false)}
            accessibilityLabel="Close full image"
          >
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          <Image
            source={{ uri: screenshot.imageUri }}
            style={styles.fullImage}
            contentFit="contain"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0D14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  chatHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(10, 13, 20, 0.95)',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    gap: 10,
  },
  aiAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  headerSubtitleText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionCircle: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
  },
  userMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  userMessageText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
    fontWeight: '500',
  },
  messageTimeText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  assistantMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  assistantBubble: {
    flex: 1,
  },
  initialAnalysisCard: {
    backgroundColor: 'rgba(22, 27, 39, 0.90)',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  imagePreviewWrapper: {
    position: 'relative',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#090D16',
    marginBottom: 12,
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  imageZoomBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  imageZoomBadgeText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  initialMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.badgeText,
    letterSpacing: 0.5,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeTagText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  initialTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: 8,
  },
  initialSummaryText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 19,
    opacity: 0.92,
    marginBottom: 12,
  },
  keyConceptsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  keyConceptsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  keyConceptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginVertical: 2,
  },
  keyConceptText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    flex: 1,
  },
  initialQuickActionsSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  quickActionsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  quickActionsList: {
    gap: 7,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.24)',
  },
  quickActionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  quickQuestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(99, 102, 241, 0.10)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.20)',
  },
  quickQuestionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickQuestionText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  regularResponseCard: {
    backgroundColor: 'rgba(22, 27, 39, 0.90)',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  responseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  responseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  responseBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.badgeText,
    letterSpacing: 0.6,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: 10,
  },
  responseBody: {
    gap: 3,
  },
  mdH1: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 10,
    marginBottom: 4,
  },
  mdH2: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
    marginTop: 8,
    marginBottom: 3,
  },
  mdH3: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 6,
    marginBottom: 2,
  },
  paragraph: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 19,
    opacity: 0.92,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginVertical: 2,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
    marginTop: 7,
  },
  bulletText: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  codeBlockContainer: {
    backgroundColor: '#05070D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    padding: 10,
    marginVertical: 8,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  codeLangText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  codeCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  codeCopyText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  codeContent: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#A5B4FC',
    lineHeight: 16,
  },
  followUpSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  followUpSectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  followUpChipsCol: {
    gap: 6,
  },
  followUpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.10)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  followUpChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    flexShrink: 1,
    lineHeight: 16,
  },
  thinkingBubble: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(22, 27, 39, 0.90)',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
  },
  thinkingTextCol: {
    flex: 1,
    flexShrink: 1,
  },
  thinkingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  thinkingSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
    flexShrink: 1,
  },
  quickBarContainer: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(10, 13, 20, 0.85)',
  },
  quickBarContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickBarChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    maxWidth: 280,
  },
  quickBarChipText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
    flexShrink: 1,
  },
  inputBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#10141F',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  optionsActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    height: 40,
    justifyContent: 'center',
  },
  chatTextInput: {
    color: '#ffffff',
    fontSize: 13,
    padding: 0,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
  fullImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '94%',
    height: '84%',
  },
  forwardBanner: {
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.35)',
  },
  forwardBannerGradient: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forwardBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  forwardBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  forwardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  forwardBannerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  mcpPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  mcpPillText: {
    color: '#C4B5FD',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  forwardBannerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },
  forwardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  forwardModalContent: {
    backgroundColor: '#0E1322',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 24,
    paddingBottom: 38,
  },
  forwardModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  forwardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  forwardIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forwardModalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  forwardModalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  forwardModalClose: {
    padding: 6,
  },
  forwardNoticeBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  forwardNoticeText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },
  forwardPrimaryAction: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  forwardPrimaryGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  forwardPrimaryText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  forwardSecondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  forwardSecondaryTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  forwardSecondarySub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  forwardUrlPreviewBox: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  forwardUrlLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  forwardUrlText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});


