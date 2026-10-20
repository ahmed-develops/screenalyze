import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Copy, Check, Share2, BookOpen, Sparkles, MessageSquare } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Colors } from '../theme/colors';
import { FormattedAIResponse } from './FormattedAIResponse';

interface TutorialViewerProps {
  title: string;
  content: string;
  type: string;
  nextFollowUps?: string[];
  onSelectFollowUp?: (question: string) => void;
  onAskFollowUp?: () => void;
}

export const TutorialViewer: React.FC<TutorialViewerProps> = ({
  title,
  content,
  type,
  nextFollowUps,
  onSelectFollowUp,
  onAskFollowUp,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (await Sharing.isAvailableAsync()) {
      try {
        await Sharing.shareAsync('', { dialogTitle: title });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  // Professional markdown and block renderer
  const renderFormattedContent = () => {
    return <FormattedAIResponse content={content} />;
  };

  const getBadgeIcon = () => {
    switch (type) {
      case 'tutorial':
        return <BookOpen size={16} color={Colors.primaryLight} />;
      case 'explanation':
        return <Sparkles size={16} color={Colors.accent} />;
      default:
        return <MessageSquare size={16} color={Colors.warning} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Action Header */}
      <View style={styles.topBar}>
        <View style={styles.typeBadge}>
          {getBadgeIcon()}
          <Text style={styles.typeBadgeText}>{type.toUpperCase()}</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={handleCopy}>
            {copied ? (
              <Check size={16} color={Colors.success} />
            ) : (
              <Copy size={16} color={Colors.textSecondary} />
            )}
            <Text style={[styles.iconBtnText, copied && { color: Colors.success }]}>
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={handleShare}>
            <Share2 size={16} color={Colors.textSecondary} />
            <Text style={styles.iconBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.mainTitle}>{title}</Text>

      {/* Rendered Body */}
      <View style={styles.body}>{renderFormattedContent()}</View>

      {/* Next Follow-Up Questions Suggested by LLM */}
      {nextFollowUps && nextFollowUps.length > 0 && onSelectFollowUp && (
        <View style={styles.nextFollowUpsContainer}>
          <Text style={styles.nextFollowUpsLabel}>QUESTIONS YOU MIGHT WONDER NEXT:</Text>
          <View style={styles.chipsRow}>
            {nextFollowUps.map((q, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.nextChip}
                activeOpacity={0.8}
                onPress={() => onSelectFollowUp(q)}
              >
                {/* <Sparkles size={13} color={Colors.accent} /> */}
                <Text style={styles.nextChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Follow-up banner */}
      {onAskFollowUp && (
        <TouchableOpacity style={styles.followUpBtn} activeOpacity={0.85} onPress={onAskFollowUp}>
          <MessageSquare size={16} color={Colors.primaryLight} />
          <Text style={styles.followUpText}>Ask custom question or generate another action</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    marginBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.badgeText,
    letterSpacing: 0.5,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBtnText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 14,
  },
  body: {
    gap: 4,
  },
  h1: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 14,
    marginBottom: 8,
  },
  h2: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accent,
    marginTop: 12,
    marginBottom: 6,
  },
  h3: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  h4: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
    opacity: 0.9,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 3,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryLight,
    marginTop: 8,
  },
  bulletText: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  codeBlockContainer: {
    backgroundColor: '#050811',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginVertical: 10,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceSubtle,
  },
  codeLangText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  codeCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  codeCopyText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  codeContent: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#A5B4FC',
    lineHeight: 18,
  },
  nextFollowUpsContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextFollowUpsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  chipsRow: {
    gap: 8,
  },
  nextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  nextChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 16,
  },
  followUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: 18,
  },
  followUpText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
});
