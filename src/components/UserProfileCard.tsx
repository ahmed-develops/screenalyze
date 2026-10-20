import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  ShieldCheck,
} from 'lucide-react-native';
import { UserProfile } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface UserProfileCardProps {
  profile: UserProfile;
  onChangeAvatar: () => void;
  onEditProfile: () => void;
  onManagePlan: () => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  profile,
  onChangeAvatar,
  onEditProfile,
  onManagePlan,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? 'rgba(29, 32, 38, 0.75)' : colors.card,
          borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.16)',
          shadowOpacity: isDark ? 0.25 : 0.06,
        },
      ]}
    >
      <LinearGradient
        colors={[
          isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.08)',
          isDark ? 'rgba(6, 182, 212, 0.05)' : 'rgba(2, 132, 199, 0.03)',
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top Profile Header */}
      <View style={styles.headerRow}>
        {/* Avatar with Camera badge */}
        <TouchableOpacity
          onPress={onChangeAvatar}
          activeOpacity={0.8}
          style={styles.avatarWrapper}
          accessibilityLabel="Change profile picture"
        >
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarBorderGradient}
          >
            <Image
              source={{ uri: profile.avatarUri }}
              style={[styles.avatarImage, { backgroundColor: colors.surfaceSubtle }]}
              contentFit="cover"
              transition={200}
            />
          </LinearGradient>
          <View
            style={[
              styles.cameraBadge,
              {
                backgroundColor: colors.primaryDark,
                borderColor: colors.background,
              },
            ]}
          >
            <Camera size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* User Details */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
              {profile.name}
            </Text>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={14} color={colors.accent} />
            </View>
          </View>

          {/* <Text style={[styles.userRole, { color: colors.textSecondary }]} numberOfLines={1}>
            {profile.role} • {profile.company}
          </Text> */}

          <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
            {profile.email}
          </Text>

          {/* Plan Pill */}
          <TouchableOpacity
            style={styles.planPill}
            // onPress={onManagePlan}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366F1', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.planPillGradient}
            >
              {/* <Sparkles size={11} color="#FFFFFF" /> */}
              <Text style={styles.planPillText}>{profile.planName.toUpperCase()}</Text>
              {/* <ChevronRight size={11} color="#FFFFFF" /> */}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Metrics Row */}
      {/* <View
        style={[
          styles.metricsRow,
          {
            backgroundColor: isDark ? 'rgba(17, 24, 39, 0.75)' : colors.surfaceSubtle,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.metricItem}>
          <View style={[styles.metricIconWrap, { backgroundColor: colors.badgeBg }]}>
            <Layers size={14} color={colors.primaryLight} />
          </View>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {profile.totalCaptures}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Captures</Text>
        </View>

        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

        <View style={styles.metricItem}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
            <BookOpen size={14} color={colors.accent} />
          </View>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {profile.totalTutorials}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Tutorials</Text>
        </View>

        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

        <View style={styles.metricItem}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Zap size={14} color={colors.success} />
          </View>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {profile.accuracyRate}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>OCR Match</Text>
        </View>
      </View> */}

      {/* Action Buttons */}
      {/* <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.editProfileButton,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
            },
          ]}
          onPress={onEditProfile}
          activeOpacity={0.8}
        >
          <Edit3 size={15} color={colors.textPrimary} />
          <Text style={[styles.editProfileText, { color: colors.textPrimary }]}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.planButton,
            {
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.08)',
              borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(79, 70, 229, 0.20)',
            },
          ]}
          onPress={onManagePlan}
          activeOpacity={0.8}
        >
          <Sparkles size={15} color={colors.primary} />
          <Text style={[styles.planButtonText, { color: colors.primary }]}>Plan Perks</Text>
        </TouchableOpacity>
      </View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarBorderGradient: {
    width: 74,
    height: 74,
    borderRadius: 37,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  verifiedBadge: {
    padding: 2,
  },
  userRole: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  planPill: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  planPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  planPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 18,
    borderWidth: 1,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  metricDivider: {
    width: 1,
    height: 28,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  editProfileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '700',
  },
  planButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  planButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
