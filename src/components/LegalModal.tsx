import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { X, ShieldCheck, FileText, CheckCircle, Lock, Award, Heart } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

export type LegalDocType = 'privacy' | 'terms' | 'licenses';

interface LegalModalProps {
  visible: boolean;
  type: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ visible, type, onClose }) => {
  const { colors, isDark } = useTheme();
  const isPrivacy = type === 'privacy';
  const isTerms = type === 'terms';

  const title = isPrivacy
    ? 'Privacy Policy'
    : isTerms
      ? 'Terms of Service'
      : 'Open Source Licenses';

  const subtitle = isPrivacy
    ? 'Local-first architecture & zero-retention vision policy'
    : isTerms
      ? 'Usage guidelines, software licensing & AI disclosures'
      : 'Third-party libraries & software dependencies';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isPrivacy
                      ? 'rgba(16, 185, 129, 0.15)'
                      : isTerms
                        ? colors.badgeBg
                        : 'rgba(6, 182, 212, 0.15)',
                  },
                ]}
              >
                {isPrivacy ? (
                  <ShieldCheck size={20} color={colors.success} />
                ) : isTerms ? (
                  <FileText size={20} color={colors.primary} />
                ) : (
                  <Award size={20} color={colors.accent} />
                )}
              </View>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
              activeOpacity={0.7}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Policy / Terms Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isPrivacy && (
              <>
                <View
                  style={[
                    styles.highlightBanner,
                    {
                      backgroundColor: isDark
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(5, 150, 105, 0.08)',
                      borderColor: isDark
                        ? 'rgba(16, 185, 129, 0.25)'
                        : 'rgba(5, 150, 105, 0.25)',
                    },
                  ]}
                >
                  <Lock size={18} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.highlightTitle, { color: colors.textPrimary }]}>
                      Zero-Training AI Guarantee
                    </Text>
                    <Text style={[styles.highlightText, { color: colors.textSecondary }]}>
                      Your private screenshots and extracted text are processed ephemerally. They
                      are never used to train public machine learning models.
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionNumber, { color: colors.primary }]}>
                    1. Overview & Data Philosophy
                  </Text>
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    Screenalyze is engineered with a strict local-first privacy standard. We recognize
                    that screenshots often contain sensitive personal data, company credentials,
                    codebases, or financial transactions. Your trust is our core foundation.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionNumber, { color: colors.primary }]}>
                    2. On-Device & Vision Processing
                  </Text>
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    When you capture or import a screenshot:
                  </Text>
                  <View style={styles.bulletItem}>
                    <CheckCircle size={14} color={colors.accent} style={styles.bulletIcon} />
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                      Visual frames and OCR text are parsed locally on your device where possible.
                    </Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <CheckCircle size={14} color={colors.accent} style={styles.bulletIcon} />
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                      Multimodal queries dispatched to AI model use TLS 1.3 encryption with
                      ephemeral tokens and strict zero-data-retention headers.
                    </Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <CheckCircle size={14} color={colors.accent} style={styles.bulletIcon} />
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                      No personal images are ever retained on Screenalyze servers.
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionNumber, { color: colors.primary }]}>
                    3. Local Sandboxed Storage
                  </Text>
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    Generated tutorials, extracted code snippets, and metadata are saved strictly in
                    your device&apos;s sandboxed storage. If iCloud or Google Drive sync is enabled, your
                    data is encrypted end-to-end with your private Apple/Google account key.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionNumber, { color: colors.primary }]}>
                    4. Your Rights (GDPR & CCPA)
                  </Text>
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    You maintain complete ownership of your data at all times. You can export a full
                    JSON archive of your captures or permanently purge all records through the
                    Settings panel with one click.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionNumber, { color: colors.primary }]}>
                    5. Contact & Data Officer
                  </Text>
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    For any privacy inquiries or audit requests, contact our compliance team at{' '}
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      privacy@screenalyze.ai
                    </Text>
                    .
                  </Text>
                </View>
              </>
            )}

            {isTerms && (
              <>
                <View
                  style={[
                    styles.highlightBanner,
                    {
                      backgroundColor: colors.badgeBg,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <FileText size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.highlightTitle, { color: colors.textPrimary }]}>
                      Fair & Transparent Terms
                    </Text>
                    <Text style={[styles.highlightText, { color: colors.textSecondary }]}>
                      Clear agreements regarding software usage, AI generated code, and licensing.
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionNumber, { color: colors.primary }]}>
                    1. Acceptance of Terms
                  </Text>
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    By downloading, installing, or accessing Screenalyze, you agree to be bound by
                    these Terms of Service. If you disagree with any portion, please discontinue
                    use of the software.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionNumber, { color: colors.primary }]}>
                    2. Intellectual Property & Ownership
                  </Text>
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    You retain 100% intellectual property rights over any screenshots, wireframes,
                    and original media you process through Screenalyze. Screenalyze claims zero
                    ownership or commercial claims to your materials.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionNumber, { color: colors.primary }]}>
                    3. AI Generated Code & Content Disclaimer
                  </Text>
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    Tutorials, React Native components, and architecture diagrams generated by the
                    AI engine are provided on an &quot;AS-IS&quot; basis. Users should test and verify code
                    prior to production deployment.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionNumber, { color: colors.primary }]}>
                    4. Acceptable Use
                  </Text>
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    You agree not to use Screenalyze to capture or distribute non-consensual
                    surveillance imagery, malware payloads, or violate third-party copyright laws.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionNumber, { color: colors.primary }]}>
                    5. Pro Subscription & Cancellation
                  </Text>
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    Pro subscriptions renew automatically unless cancelled at least 24 hours prior to
                    the end of the active billing cycle through your App Store or Play Store account.
                  </Text>
                </View>
              </>
            )}

            {!isPrivacy && !isTerms && (
              <>
                <View
                  style={[
                    styles.highlightBanner,
                    {
                      backgroundColor: 'rgba(6, 182, 212, 0.08)',
                      borderColor: 'rgba(6, 182, 212, 0.25)',
                    },
                  ]}
                >
                  <Heart size={18} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.highlightTitle, { color: colors.textPrimary }]}>
                      Open Source Community
                    </Text>
                    <Text style={[styles.highlightText, { color: colors.textSecondary }]}>
                      Screenalyze is built with love on the React Native and Expo open source ecosystem.
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionNumber, { color: colors.primary }]}>Core Libraries</Text>
                  <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                    • <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Expo SDK (v57)</Text> - MIT License{'\n'}
                    • <Text style={{ fontWeight: '700', color: colors.textPrimary }}>React Native (v0.86)</Text> - MIT License{'\n'}
                    • <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Lucide Icons</Text> - ISC License{'\n'}
                    • <Text style={{ fontWeight: '700', color: colors.textPrimary }}>AsyncStorage</Text> - MIT License{'\n'}
                    • <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Expo Linear Gradient & Blur</Text> - MIT License
                  </Text>
                </View>
              </>
            )}

            <View style={[styles.footerNote, { borderTopColor: colors.border }]}>
              <Text style={[styles.footerNoteText, { color: colors.textMuted }]}>
                Last revised: October 2026 • Screenalyze Technologies Inc.
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Button */}
          <View style={[styles.footerBar, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>I Understand & Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    height: '85%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    maxWidth: 240,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    paddingHorizontal: 22,
  },
  scrollContent: {
    paddingVertical: 20,
    gap: 18,
  },
  highlightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  highlightText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  section: {
    gap: 8,
  },
  sectionNumber: {
    fontSize: 14,
    fontWeight: '800',
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  bulletIcon: {
    marginTop: 3,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  footerNote: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 11,
  },
  footerBar: {
    paddingHorizontal: 22,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  doneBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
