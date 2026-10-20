import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Check, Code2, Info, Sparkles, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/colors';

interface FormattedAIResponseProps {
  content: string;
}

// Decode common HTML entities that LLMs sometimes output
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Tokenizes inline text into bold, italic, code, links, and normal text
function parseInline(rawText: string, colors: ColorPalette): React.ReactNode[] {
  const decoded = decodeHtmlEntities(rawText);

  // Regex matches:
  // 1) Bold & Italic: ***text*** or ___text___
  // 2) Bold: **text** or __text__
  // 3) Inline code: `text`
  // 4) Italic: *text* (word boundary) or _text_
  // 5) Strikethrough: ~~text~~
  // 6) Markdown Link: [text](url)
  const pattern =
    /(\*\*\*(?:[\s\S]+?)\*\*\*|___(?:[\s\S]+?)___|\*\*(?:[\s\S]+?)\*\*|__(?:[\s\S]+?)__|`[^`]+`|\*(?!\s)(?:[^*]+?)(?<!\s)\*|_(?!\s)(?:[^_]+?)(?<!\s)_|~~(?:[\s\S]+?)~~|\[[^\]]+\]\([^)]+\))/g;

  const parts = decoded.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold + Italic: ***text*** or ___text___
    if (
      (part.startsWith('***') && part.endsWith('***') && part.length >= 6) ||
      (part.startsWith('___') && part.endsWith('___') && part.length >= 6)
    ) {
      const inner = part.slice(3, -3);
      return (
        <Text
          key={index}
          style={[
            styles.inlineBoldItalic,
            { color: colors.textPrimary },
          ]}
        >
          {inner.replace(/\\([*#_`~[\]()])/g, '$1')}
        </Text>
      );
    }

    // Bold: **text** or __text__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      const inner = part.slice(2, -2);
      return (
        <Text
          key={index}
          style={[
            styles.inlineBold,
            { color: colors.textPrimary },
          ]}
        >
          {inner.replace(/\\([*#_`~[\]()])/g, '$1')}
        </Text>
      );
    }

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <Text
          key={index}
          style={[
            styles.inlineCode,
            {
              backgroundColor: colors.badgeBg,
              color: colors.primaryLight,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {` ${inner} `}
        </Text>
      );
    }

    // Italic: *text* or _text_
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      const inner = part.slice(1, -1);
      return (
        <Text
          key={index}
          style={[
            styles.inlineItalic,
            { color: colors.textSecondary },
          ]}
        >
          {inner.replace(/\\([*#_`~[\]()])/g, '$1')}
        </Text>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <Text
          key={index}
          style={[
            styles.inlineStrikethrough,
            { color: colors.textMuted },
          ]}
        >
          {inner.replace(/\\([*#_`~[\]()])/g, '$1')}
        </Text>
      );
    }

    // Link: [title](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const linkTitle = linkMatch[1];
      return (
        <Text
          key={index}
          style={[
            styles.inlineLink,
            { color: colors.primaryLight },
          ]}
        >
          {linkTitle}
        </Text>
      );
    }

    // Plain text: strip any stray/unclosed ** or __ or ~~ so raw markup never leaks
    const cleanedText = part
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/~~/g, '')
      .replace(/\\([*#_`~[\]()])/g, '$1');

    return (
      <Text key={index} style={{ color: colors.textPrimary }}>
        {cleanedText}
      </Text>
    );
  });
}

// Standalone code block component with animated copy button
const CodeSnippetBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = (language.trim() || 'SNIPPET').toUpperCase();

  return (
    <View
      style={[
        styles.codeBlockContainer,
        {
          backgroundColor: isDark ? '#05070D' : '#F1F5F9',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.codeHeader,
          {
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
          },
        ]}
      >
        <View style={styles.codeLangGroup}>
          <Code2 size={12} color={colors.primaryLight} />
          <Text style={[styles.codeLangText, { color: colors.primaryLight }]}>{displayLang}</Text>
        </View>

        <TouchableOpacity style={styles.codeCopyBtn} onPress={handleCopy} activeOpacity={0.7}>
          {copied ? (
            <Check size={11} color={colors.success} />
          ) : (
            <Copy size={11} color={colors.textSecondary} />
          )}
          <Text
            style={[
              styles.codeCopyText,
              { color: copied ? colors.success : colors.textSecondary },
            ]}
          >
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text
          style={[
            styles.codeContent,
            { color: isDark ? '#A5B4FC' : '#312E81' },
          ]}
        >
          {code}
        </Text>
      </ScrollView>
    </View>
  );
};

// Markdown Table Renderer
const MarkdownTableBlock: React.FC<{ rows: string[][] }> = ({ rows }) => {
  const { colors } = useTheme();
  if (rows.length === 0) return null;

  const header = rows[0];
  const bodyRows = rows.slice(1);

  return (
    <View
      style={[
        styles.tableContainer,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header row */}
          <View
            style={[
              styles.tableHeaderRow,
              {
                backgroundColor: colors.surfaceSubtle,
                borderBottomColor: colors.border,
              },
            ]}
          >
            {header.map((cell, cIdx) => (
              <View key={cIdx} style={[styles.tableCell, { borderRightColor: colors.border }]}>
                <Text style={[styles.tableHeaderText, { color: colors.textPrimary }]}>
                  {parseInline(cell.trim(), colors)}
                </Text>
              </View>
            ))}
          </View>

          {/* Body rows */}
          {bodyRows.map((row, rIdx) => (
            <View
              key={rIdx}
              style={[
                styles.tableBodyRow,
                {
                  backgroundColor: rIdx % 2 === 1 ? colors.surfaceSubtle : 'transparent',
                  borderBottomColor: colors.border,
                },
              ]}
            >
              {row.map((cell, cIdx) => (
                <View key={cIdx} style={[styles.tableCell, { borderRightColor: colors.border }]}>
                  <Text style={[styles.tableCellText, { color: colors.textSecondary }]}>
                    {parseInline(cell.trim(), colors)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export const FormattedAIResponse: React.FC<FormattedAIResponseProps> = ({ content }) => {
  const { colors, isDark } = useTheme();

  if (!content || !content.trim()) {
    return null;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';

  let tableBuffer: string[][] = [];

  const flushTable = (key: string) => {
    if (tableBuffer.length > 0) {
      elements.push(<MarkdownTableBlock key={key} rows={[...tableBuffer]} />);
      tableBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    // 1. Code block delimiter (``` or ```typescript)
    if (trimmedLine.startsWith('```')) {
      flushTable(`table-${i}`);
      if (inCodeBlock) {
        // Close code block
        elements.push(
          <CodeSnippetBlock
            key={`codeblock-${i}`}
            code={codeBuffer.join('\n')}
            language={codeLang}
          />
        );
        codeBuffer = [];
        codeLang = '';
        inCodeBlock = false;
      } else {
        // Open code block
        inCodeBlock = true;
        codeLang = trimmedLine.replace(/^```/, '').trim();
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // 2. Table row detection (| col1 | col2 |)
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      // Check if separator line (|---|---|)
      const isDivider = /^\|(\s*:?-+:?\s*\|)+$/.test(trimmedLine);
      if (!isDivider) {
        const cells = trimmedLine
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        tableBuffer.push(cells);
      }
      continue;
    } else {
      flushTable(`table-${i}`);
    }

    // 3. Horizontal Rule (---, ***, ___)
    if (/^([-*_]\s*){3,}$/.test(trimmedLine)) {
      elements.push(
        <View
          key={`hr-${i}`}
          style={[styles.horizontalRule, { backgroundColor: colors.border }]}
        />
      );
      continue;
    }

    // 4. Headings (# to ######)
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingContent = headingMatch[2];

      if (level === 1) {
        elements.push(
          <View key={`h1-${i}`} style={styles.h1Container}>
            <Text style={[styles.h1Text, { color: colors.textPrimary }]}>
              {parseInline(headingContent, colors)}
            </Text>
          </View>
        );
      } else if (level === 2) {
        elements.push(
          <View key={`h2-${i}`} style={styles.h2Container}>
            <View style={[styles.headingBar, { backgroundColor: colors.accent }]} />
            <Text style={[styles.h2Text, { color: colors.accent }]}>
              {parseInline(headingContent, colors)}
            </Text>
          </View>
        );
      } else if (level === 3) {
        elements.push(
          <View key={`h3-${i}`} style={styles.h3Container}>
            <Text style={[styles.h3Text, { color: colors.textPrimary }]}>
              {parseInline(headingContent, colors)}
            </Text>
          </View>
        );
      } else {
        elements.push(
          <View key={`h4-${i}`} style={styles.h4Container}>
            <Text style={[styles.h4Text, { color: colors.primaryLight }]}>
              {parseInline(headingContent, colors)}
            </Text>
          </View>
        );
      }
      continue;
    }

    // 5. Standalone bold line acting as a section title: "**Title:**" or "**Title**"
    const standaloneBoldMatch = trimmedLine.match(/^\*\*([^*]+)\*\*:?$/);
    if (standaloneBoldMatch) {
      elements.push(
        <View key={`bold-title-${i}`} style={styles.boldTitleContainer}>
          <View style={[styles.boldTitleDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.boldTitleText, { color: colors.textPrimary }]}>
            {standaloneBoldMatch[1]}
          </Text>
        </View>
      );
      continue;
    }

    // 6. Blockquote or Note/Tip Callout (> text)
    if (trimmedLine.startsWith('>')) {
      const quoteText = trimmedLine.replace(/^>\s*/, '');
      const isNote = /^(?:\[!NOTE\]|\[!INFO\]|\*\*Note:\*\*|\*\*Info:\*\*)/i.test(quoteText);
      const isTip = /^(?:\[!TIP\]|\*\*Tip:\*\*|\*\*Hint:\*\*)/i.test(quoteText);
      const isWarn = /^(?:\[!WARNING\]|\[!CAUTION\]|\*\*Warning:\*\*|\*\*Caution:\*\*)/i.test(quoteText);

      const cleanedQuote = quoteText
        .replace(/^(?:\[!(?:NOTE|INFO|TIP|WARNING|CAUTION)\])\s*/i, '')
        .trim();

      elements.push(
        <View
          key={`quote-${i}`}
          style={[
            styles.blockquote,
            {
              borderLeftColor: isWarn
                ? colors.warning
                : isTip
                ? colors.success
                : colors.primary,
              backgroundColor: isWarn
                ? 'rgba(245, 158, 11, 0.08)'
                : isTip
                ? 'rgba(16, 185, 129, 0.08)'
                : isDark
                ? 'rgba(99, 102, 241, 0.08)'
                : 'rgba(79, 70, 229, 0.06)',
            },
          ]}
        >
          <View style={styles.calloutHeaderRow}>
            {isWarn ? (
              <AlertTriangle size={13} color={colors.warning} />
            ) : isTip ? (
              <Sparkles size={13} color={colors.success} />
            ) : isNote ? (
              <Info size={13} color={colors.primary} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={[styles.blockquoteText, { color: colors.textSecondary }]}>
                {parseInline(cleanedQuote, colors)}
              </Text>
            </View>
          </View>
        </View>
      );
      continue;
    }

    // 7. Numbered list item: "1. **Title**:" or "1. Item" or "1) Item" or "Step 1: Item"
    const numberedMatch = rawLine.match(/^(\s*)(?:Step\s+)?(\d+)[\.\):]\s+(.*)/i);
    if (numberedMatch) {
      const indentSpaces = numberedMatch[1].length;
      const numberStr = numberedMatch[2];
      const remainder = numberedMatch[3];
      const isSubNumber = indentSpaces >= 2;

      elements.push(
        <View
          key={`num-${i}`}
          style={[
            styles.numberedRow,
            isSubNumber && { marginLeft: 16 },
          ]}
        >
          <View
            style={[
              styles.numberBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(99, 102, 241, 0.22)'
                  : 'rgba(79, 70, 229, 0.12)',
              },
            ]}
          >
            <Text style={[styles.numberBadgeText, { color: colors.primary }]}>
              {numberStr}
            </Text>
          </View>
          <View style={styles.numberedTextCol}>
            <Text style={[styles.paragraphText, { color: colors.textPrimary }]}>
              {parseInline(remainder, colors)}
            </Text>
          </View>
        </View>
      );
      continue;
    }

    // 8. Bullet list item: "- Item", "* Item", "• Item", "▪ Item", "🔹 Item" (including indented sub-bullets)
    const bulletMatch = rawLine.match(/^(\s*)([-*•+▪▫◽◾🔹🔸]|–|—)\s+(.*)/);
    if (bulletMatch) {
      const indentSpaces = bulletMatch[1].length;
      const isSubBullet = indentSpaces >= 1;
      const remainder = bulletMatch[3];

      elements.push(
        <View
          key={`bullet-${i}`}
          style={[
            styles.bulletRow,
            isSubBullet && { marginLeft: Math.min(18 + (indentSpaces - 1) * 6, 36) },
          ]}
        >
          {isSubBullet ? (
            <View
              style={[
                styles.subBulletDot,
                { borderColor: colors.accent },
              ]}
            />
          ) : (
            <View
              style={[
                styles.bulletDot,
                { backgroundColor: colors.accent },
              ]}
            />
          )}
          <View style={styles.bulletTextCol}>
            <Text
              style={[
                styles.paragraphText,
                { color: isSubBullet ? colors.textSecondary : colors.textPrimary },
              ]}
            >
              {parseInline(remainder, colors)}
            </Text>
          </View>
        </View>
      );
      continue;
    }

    // 9. Normal paragraph text
    if (trimmedLine.length > 0) {
      elements.push(
        <View key={`para-${i}`} style={styles.paragraphContainer}>
          <Text style={[styles.paragraphText, { color: colors.textPrimary }]}>
            {parseInline(rawLine, colors)}
          </Text>
        </View>
      );
      continue;
    }

    // Empty line spacing
    elements.push(<View key={`spacer-${i}`} style={{ height: 6 }} />);
  }

  // Flush any trailing table
  flushTable('table-end');

  return <View style={styles.container}>{elements}</View>;
};

const styles = StyleSheet.create({
  container: {
    gap: 3,
  },
  paragraphContainer: {
    marginVertical: 2,
  },
  paragraphText: {
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  inlineBold: {
    fontWeight: '700',
  },
  inlineItalic: {
    fontStyle: 'italic',
  },
  inlineBoldItalic: {
    fontWeight: '700',
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    fontWeight: '600',
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inlineStrikethrough: {
    textDecorationLine: 'line-through',
  },
  inlineLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  h1Container: {
    marginTop: 14,
    marginBottom: 6,
  },
  h1Text: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  h2Container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 6,
  },
  headingBar: {
    width: 3.5,
    height: 16,
    borderRadius: 2,
  },
  h2Text: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  h3Container: {
    marginTop: 10,
    marginBottom: 4,
  },
  h3Text: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  h4Container: {
    marginTop: 8,
    marginBottom: 2,
  },
  h4Text: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  boldTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  boldTitleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  boldTitleText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  numberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  numberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  numberBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  numberedTextCol: {
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 3,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  subBulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1.2,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  bulletTextCol: {
    flex: 1,
  },
  blockquote: {
    borderLeftWidth: 3.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 6,
  },
  calloutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  blockquoteText: {
    fontSize: 13,
    lineHeight: 19,
  },
  horizontalRule: {
    height: 1,
    marginVertical: 12,
    opacity: 0.6,
  },
  codeBlockContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  codeLangGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  codeLangText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  codeCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeCopyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  codeContent: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
    borderRightWidth: 1,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tableCellText: {
    fontSize: 12,
  },
});
