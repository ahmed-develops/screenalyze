import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import {
  X,
  Zap,
  Smartphone,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface BackTapGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export function BackTapGuideModal({ visible, onClose }: BackTapGuideModalProps) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async () => {
    await Clipboard.setStringAsync('screenalyze://analyze');
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleTestNow = () => {
    onClose();
    setTimeout(() => {
      router.push('/analyze');
    }, 200);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
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
                <Zap size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Instant Auto-Capture
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  iOS Back Tap & Shortcuts Setup
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.closeBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* iOS Privacy Explanation Banner */}
            <View
              style={[
                styles.alertBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(245, 158, 11, 0.08)',
                  borderColor: 'rgba(245, 158, 11, 0.25)',
                },
              ]}
            >
              <ShieldAlert size={18} color={colors.warning} style={styles.alertIcon} />
              <View style={styles.alertTextWrap}>
                <Text style={[styles.alertTitle, { color: colors.warning }]}>
                  Why iOS blocks background snooping
                </Text>
                <Text style={[styles.alertBody, { color: colors.textSecondary }]}>
                  Apple security policies strictly prohibit third-party apps from running silent background listeners while suspended. Using Apple Shortcuts + Back Tap bypasses this limitation with 100% official Apple automation!
                </Text>
              </View>
            </View>

            {/* Mode Switcher Tabs */}
            <View style={styles.optionsWrap}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Choose Your Preferred iOS Trigger:
              </Text>

              {/* Method 1: Personal Automation on Screenshot */}
              <View
                style={[
                  styles.methodCard,
                  {
                    backgroundColor: isDark
                      ? 'rgba(0, 153, 255, 0.08)'
                      : 'rgba(0, 153, 255, 0.05)',
                    borderColor: 'rgba(0, 153, 255, 0.25)',
                  },
                ]}
              >
                <View style={styles.methodHeader}>
                  <View style={[styles.methodBadge, { backgroundColor: '#0099FF' }]}>
                    <Text style={styles.methodBadgeText}>METHOD 1 (RECOMMENDED)</Text>
                  </View>
                  <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>
                    Auto-Run Whenever You Take a Screenshot
                  </Text>
                </View>

                <Text style={[styles.methodDesc, { color: colors.textSecondary }]}>
                  Runs automatically every time you press Volume + Power or take a normal screenshot:
                </Text>

                <View style={styles.innerStepList}>
                  <Text style={[styles.innerStepText, { color: colors.textSecondary }]}>
                    1. Open <Text style={styles.bold}>Shortcuts</Text> app & tap the <Text style={styles.bold}>Automation</Text> tab at bottom.
                  </Text>
                  <Text style={[styles.innerStepText, { color: colors.textSecondary }]}>
                    2. Tap <Text style={styles.bold}>+</Text> and select <Text style={styles.bold}>Screenshot</Text>.
                  </Text>
                  <Text style={[styles.innerStepText, { color: colors.textSecondary }]}>
                    3. Select <Text style={styles.bold}>Run Immediately</Text> (without asking).
                  </Text>
                  <Text style={[styles.innerStepText, { color: colors.textSecondary }]}>
                    4. Add action: <Text style={styles.bold}>Open URLs</Text> with the link below:
                  </Text>
                </View>

                {/* Copy URL Pill */}
                <TouchableOpacity
                  style={[
                    styles.copyPill,
                    {
                      backgroundColor: isDark
                        ? 'rgba(0, 0, 0, 0.45)'
                        : 'rgba(0, 0, 0, 0.04)',
                      borderColor: copied
                        ? colors.success
                        : isDark
                        ? 'rgba(255, 255, 255, 0.15)'
                        : colors.border,
                    },
                  ]}
                  onPress={handleCopyUrl}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.urlText,
                      { color: copied ? colors.success : '#0099FF' },
                    ]}
                  >
                    screenalyze://analyze
                  </Text>
                  <View style={styles.copyIconWrap}>
                    {copied ? (
                      <Check size={14} color={colors.success} />
                    ) : (
                      <Copy size={14} color={colors.textSecondary} />
                    )}
                    <Text
                      style={[
                        styles.copyLabel,
                        { color: copied ? colors.success : colors.textSecondary },
                      ]}
                    >
                      {copied ? 'Copied!' : 'Copy Link'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Method 2: Double Tap Back of Phone */}
              <View
                style={[
                  styles.methodCard,
                  {
                    backgroundColor: isDark
                      ? 'rgba(99, 102, 241, 0.08)'
                      : 'rgba(79, 70, 229, 0.05)',
                    borderColor: 'rgba(99, 102, 241, 0.25)',
                    marginTop: 14,
                  },
                ]}
              >
                <View style={styles.methodHeader}>
                  <View style={[styles.methodBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.methodBadgeText}>METHOD 2</Text>
                  </View>
                  <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>
                    Double Tap Back of Phone (Back Tap)
                  </Text>
                </View>

                <View style={styles.innerStepList}>
                  <Text style={[styles.innerStepText, { color: colors.textSecondary }]}>
                    1. In Shortcuts app, create a shortcut with <Text style={styles.bold}>Take Screenshot</Text> → <Text style={styles.bold}>Open URLs</Text> (<Text style={styles.mono}>screenalyze://analyze</Text>).
                  </Text>
                  <Text style={[styles.innerStepText, { color: colors.textSecondary }]}>
                    2. Go to iPhone <Text style={styles.bold}>Settings &gt; Accessibility &gt; Touch &gt; Back Tap &gt; Double Tap</Text> and choose your shortcut!
                  </Text>
                </View>
              </View>
            </View>

            {/* In-App Experience Guarantee */}
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: isDark
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(16, 185, 129, 0.06)',
                  borderColor: 'rgba(16, 185, 129, 0.25)',
                  marginTop: 14,
                },
              ]}
            >
              <Smartphone size={18} color="#10B981" />
              <Text style={[styles.resultText, { color: colors.textPrimary }]}>
                Whenever you enter Screenalyze after taking a screenshot, it instantly shows <Text style={styles.bold}>{'"Your summary is almost ready..."'}</Text> and displays the full AI breakdown immediately!
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.testBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleTestNow}
              activeOpacity={0.8}
            >
              <ExternalLink size={15} color={colors.textPrimary} />
              <Text style={[styles.testBtnText, { color: colors.textPrimary }]}>
                Test Auto-Capture Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Got It</Text>
              <ArrowRight size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    maxHeight: 440,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  alertBox: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  alertIcon: {
    marginTop: 2,
  },
  alertTextWrap: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  alertBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  stepCard: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepNum: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  optionsWrap: {
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  methodCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  methodHeader: {
    marginBottom: 8,
  },
  methodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  methodBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  methodDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  innerStepList: {
    gap: 6,
    marginBottom: 8,
  },
  innerStepText: {
    fontSize: 12,
    lineHeight: 18,
  },
  mono: {
    fontFamily: 'Courier',
    fontWeight: '700',
    color: '#0099FF',
  },
  bold: {
    fontWeight: '700',
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  urlText: {
    fontFamily: 'Courier',
    fontSize: 13,
    fontWeight: '600',
  },
  copyIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  resultText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  doneBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
