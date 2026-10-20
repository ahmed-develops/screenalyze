import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Sparkles, Check, Zap, Shield, Cpu, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface PlanDetailsModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRO_FEATURES = [
  {
    icon: Sparkles,
    title: 'Unlimited Multimodal Vision',
    desc: 'Run unlimited visual audits on any resolution mobile screenshot.',
  },
  {
    icon: Cpu,
    title: 'Instant Code & Spec Extraction',
    desc: 'Extract production-ready React Native, Tailwind tokens, and system wireframes.',
  },
  {
    icon: Zap,
    title: 'Sub-Second AI Latency',
    desc: 'Dedicated enterprise inference pipeline with prioritized processing queues.',
  },
  {
    icon: Shield,
    title: 'Zero-Retention Privacy Guarantee',
    desc: 'Local-first OCR with ephemeral cloud queries. Zero model training.',
  },
];

export const PlanDetailsModal: React.FC<PlanDetailsModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();

  const handleManageSubscription = () => {
    Alert.alert(
      'Manage Subscription',
      'Your Pro subscription is active via Apple App Store. Next renewal date is March 15, 2027.',
      [{ text: 'OK' }]
    );
  };

  const handleRestore = () => {
    Alert.alert('Purchases Restored', 'Your Pro membership has been verified.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.16)',
            },
          ]}
        >
          <LinearGradient
            colors={[
              isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(79, 70, 229, 0.08)',
              isDark ? 'rgba(6, 182, 212, 0.08)' : 'rgba(2, 132, 199, 0.04)',
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.badgeRow}>
              <LinearGradient
                colors={['#6366F1', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tierPill}
              >
                {/* <Sparkles size={12} color="#FFFFFF" /> */}
                <Text style={styles.tierPillText}>PRO</Text>
              </LinearGradient>
              <Text style={[styles.activeLabel, { color: colors.success }]}>Active Member</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
              activeOpacity={0.7}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Pricing Banner */}
            <View
              style={[
                styles.pricingCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.priceAmount, { color: colors.textPrimary }]}>$19</Text>
              <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
                / month • Billed Annually
              </Text>
              <Text style={[styles.priceNote, { color: colors.textMuted }]}>
                Next billing date: March 15, 2027
              </Text>
            </View>

            {/* Features List */}
            <Text style={[styles.featuresHeader, { color: colors.textSecondary }]}>
              Included in your Pro Plan:
            </Text>
            <View style={styles.featuresList}>
              {PRO_FEATURES.map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.featureItem,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.featureIconWrap, { backgroundColor: colors.badgeBg }]}>
                      <IconComponent size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                        {feat.title}
                      </Text>
                      <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                        {feat.desc}
                      </Text>
                    </View>
                    <Check size={16} color={colors.success} style={styles.featureCheck} />
                  </View>
                );
              })}
            </View>

            {/* Quota card */}
            <View
              style={[
                styles.quotaCard,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.quotaHeader}>
                <Text style={[styles.quotaTitle, { color: colors.textSecondary }]}>
                  Monthly Vision Quota
                </Text>
                <Text style={[styles.quotaPercent, { color: colors.accent }]}>92% Remaining</Text>
              </View>
              <View
                style={[
                  styles.progressBarBg,
                  { backgroundColor: isDark ? colors.surfaceBorder : '#CBD5E1' },
                ]}
              >
                <View style={[styles.progressBarFill, { width: '8%', backgroundColor: colors.accent }]} />
              </View>
              <Text style={[styles.quotaMeta, { color: colors.textMuted }]}>
                142 of Unlimited analyses used this cycle
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footerBar, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.manageBtn, { backgroundColor: colors.primary }]}
              onPress={handleManageSubscription}
              activeOpacity={0.85}
            >
              <Text style={styles.manageBtnText}>Manage in App Store</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handleRestore}
              activeOpacity={0.7}
            >
              <RefreshCw size={13} color={colors.textMuted} />
              <Text style={[styles.restoreBtnText, { color: colors.textMuted }]}>
                Restore Purchases
              </Text>
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
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    overflow: 'hidden',
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
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
  pricingCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  priceAmount: {
    fontSize: 34,
    fontWeight: '900',
  },
  pricePeriod: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: '600',
  },
  priceNote: {
    fontSize: 12,
    marginTop: 6,
  },
  featuresHeader: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  featureCheck: {
    marginLeft: 4,
  },
  quotaCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quotaTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  quotaPercent: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  quotaMeta: {
    fontSize: 11,
  },
  footerBar: {
    paddingHorizontal: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 8,
    alignItems: 'center',
  },
  manageBtn: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
