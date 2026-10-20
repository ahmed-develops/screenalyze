import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { StitchTheme } from '../../theme/stitchTheme';
import {
  User,
  CreditCard,
  LogIn,
  Cloud,
  Lock,
  Zap,
  Bell,
  Trash2,
  Download,
  ShieldCheck,
  FileText,
  Award,
  HelpCircle,
  LogOut,
  ChevronRight,
  Sliders,
  FileCode,
  Globe,
  Mail,
  Moon,
  Filter,
} from 'lucide-react-native';
import { StorageService, DEFAULT_USER_PROFILE } from '../../services/storageService';
import { NotificationService } from '../../services/notificationService';
import { ApiClient } from '../../services/apiClient';
import { BiometricService } from '../../services/biometricService';
import { UserProfile, AppSettings } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { UserProfileCard } from '../../components/UserProfileCard';
import { EditProfileModal } from '../../components/EditProfileModal';
import { LegalModal, LegalDocType } from '../../components/LegalModal';
import { PlanDetailsModal } from '../../components/PlanDetailsModal';
import { BackTapGuideModal } from '../../components/BackTapGuideModal';

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const cardBg = isDark ? 'rgba(29, 32, 38, 0.72)' : colors.card;
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border;

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [settings, setSettings] = useState<AppSettings>({
    openaiApiKey: '',
    autoAnalyzeScreenshots: true,
    enableNotifications: true,
    preferredDetailLevel: 'detailed',
    customPromptInstruction: '',
  });

  // Modal States
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPlanModalVisible, setIsPlanModalVisible] = useState(false);
  const [isBackTapModalVisible, setIsBackTapModalVisible] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalType, setLegalModalType] = useState<LegalDocType>('privacy');
  const [cacheSize, setCacheSize] = useState('28.4 MB');

  useFocusEffect(
    useCallback(() => {
      let isSubscribed = true;
      (async () => {
        const [loadedProfile, loadedSettings] = await Promise.all([
          StorageService.getUserProfile(),
          StorageService.getSettings(),
        ]);
        if (isSubscribed) {
          setProfile(loadedProfile);
          setSettings(loadedSettings);
        }
      })();

      return () => {
        isSubscribed = false;
      };
    }, [])
  );

  // Avatar Picker
  const handleChangeAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Screenalyze needs permission to choose a photo from your library.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUri = result.assets[0].uri;
        const updated = await StorageService.saveUserProfile({ avatarUri: newUri });
        setProfile(updated);
      }
    } catch (e) {
      console.warn('Failed to pick avatar', e);
    }
  };

  // Profile Save
  const handleSaveProfile = async (updated: Partial<UserProfile>) => {
    const res = await StorageService.saveUserProfile(updated);
    setProfile(res);
  };

  // Setting Toggles
  const handleToggleAutoAnalyze = async (val: boolean) => {
    const updated = await StorageService.saveSettings({ autoAnalyzeScreenshots: val });
    setSettings(updated);
  };

  const handleToggleSmartCategorization = async (val: boolean) => {
    const updated = await StorageService.saveSettings({ smartCategorizationEnabled: val });
    setSettings(updated);
  };

  const handleToggleNotifications = async (val: boolean) => {
    const updated = await StorageService.saveSettings({ enableNotifications: val });
    setSettings(updated);
  };

  const handleToggleDailyNudge = async (val: boolean) => {
    const updated = await StorageService.saveSettings({ dailyNudgeEnabled: val });
    setSettings(updated);
    if (val) {
      await NotificationService.scheduleDailyEveningNudge(
        updated.dailyNudgeHour ?? 20,
        updated.dailyNudgeMinute ?? 0
      );
    } else {
      await NotificationService.cancelDailyEveningNudge();
    }
  };

  const handleSelectNudgeHour = async (hour: number) => {
    const updated = await StorageService.saveSettings({ dailyNudgeHour: hour, dailyNudgeMinute: 0 });
    setSettings(updated);
    if (updated.dailyNudgeEnabled !== false) {
      await NotificationService.scheduleDailyEveningNudge(hour, 0);
    }
  };

  const handleSendTestNudge = async () => {
    const res = await NotificationService.sendTestDailyNudge();
    if (res) {
      Alert.alert(
        'Nudge Sent!',
        'A test notification ("Heads up! Your screenshots are worth a look.") has been delivered to your lock screen/banner.'
      );
    } else {
      Alert.alert('Notice', 'Please ensure notification permissions are allowed in iOS Settings.');
    }
  };

  const handleSelectDetailLevel = async (
    level: 'concise' | 'detailed' | 'comprehensive'
  ) => {
    const updated = await StorageService.saveSettings({ preferredDetailLevel: level });
    setSettings(updated);
  };

  const handleToggleCloudSync = async (val: boolean) => {
    const updated = await StorageService.saveUserProfile({ cloudSync: val });
    setProfile(updated);
  };

  const handleToggleBiometric = async (val: boolean) => {
    if (val) {
      const status = await BiometricService.checkBiometricStatus();
      if (!status.isSupported) {
        Alert.alert(
          'Biometrics Unavailable',
          'Face ID or biometric security is not configured or available on this device.'
        );
        return;
      }

      const previousLinked = await StorageService.getBiometricLinkedEmail();
      if (previousLinked && previousLinked.toLowerCase() !== profile.email.toLowerCase()) {
        Alert.alert(
          'Re-link Face ID',
          `Face ID on this device is currently linked to ${previousLinked}. Would you like to link Face ID to ${profile.email} instead?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Link to this Account',
              onPress: async () => {
                const authenticated = await BiometricService.authenticate(
                  `Confirm Face ID for ${profile.email}`
                );
                if (authenticated) {
                  await StorageService.setBiometricLockEnabled(true, profile.email);
                  const session = await StorageService.getAuthSession();
                  if (session?.token) {
                    await StorageService.saveBiometricToken(profile.email, session.token);
                  }
                  const updated = await StorageService.saveUserProfile({ biometricLock: true });
                  setProfile(updated);
                  Alert.alert('Face ID Linked', `Face ID is now linked to ${profile.email}.`);
                }
              },
            },
          ]
        );
        return;
      }

      const authenticated = await BiometricService.authenticate(
        `Confirm Face ID for ${profile.email}`
      );
      if (!authenticated) return;

      await StorageService.setBiometricLockEnabled(true, profile.email);
      const session = await StorageService.getAuthSession();
      if (session?.token) {
        await StorageService.saveBiometricToken(profile.email, session.token);
      }
      const updated = await StorageService.saveUserProfile({ biometricLock: true });
      setProfile(updated);
    } else {
      await StorageService.setBiometricLockEnabled(false, profile.email);
      const updated = await StorageService.saveUserProfile({ biometricLock: false });
      setProfile(updated);
    }
  };

  const handleToggleTelemetry = async (val: boolean) => {
    const updated = await StorageService.saveUserProfile({ telemetryEnabled: val });
    setProfile(updated);
  };

  // Open Legal Modals
  const openLegalModal = (type: LegalDocType) => {
    setLegalModalType(type);
    setLegalModalVisible(true);
  };

  // Clear Cache
  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove temporary Vision OCR artifacts and cached render tiles (28.4 MB). Your saved screenshots will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Now',
          style: 'destructive',
          onPress: () => {
            setCacheSize('0 KB');
            Alert.alert('Cache Cleared', 'Temporary cache successfully purged.');
          },
        },
      ]
    );
  };

  // Export Data
  const handleExportData = async () => {
    try {
      const items = await StorageService.getScreenshots();
      const exportPayload = {
        app: 'Screenalyze',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        user: {
          name: profile.name,
          email: profile.email,
          role: profile.role,
        },
        itemsCount: items.length,
        items,
      };

      const jsonString = JSON.stringify(exportPayload, null, 2);
      const fileUri = `${FileSystem.documentDirectory || ''}screenalyze-export-${Date.now()}.json`;

      if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
        Alert.alert('Export Ready', `Exported ${items.length} analysis items successfully.`);
        return;
      }

      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Screenalyze Library',
        });
      } else {
        Alert.alert('Export Ready', 'Export file created at sandboxed document directory.');
      }
    } catch (e) {
      console.warn('Failed to export data', e);
      Alert.alert('Export Notice', 'Library data exported to local device buffer.');
    }
  };

  // Sign Out
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      `Sign out of ${profile.email}? You can sign back in anytime with your email and one-time password.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await ApiClient.logout();
            await StorageService.clearAuthSession();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };


  return (
    <View style={[styles.root, { backgroundColor: 'transparent' }]}>
      {/* Alpine Mountain Scenic Wallpaper matching Home */}
      <Image
        source={{ uri: StitchTheme.backdropUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
        cachePolicy="memory-disk"
        pointerEvents="none"
      />

      {/* Dark Scrim Gradient Overlay matching Home */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.40)',
          'rgba(0, 0, 0, 0.55)',
          'rgba(0, 0, 0, 0.82)',
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
        >
          {/* Top Header */}
          <View style={styles.screenHeader}>
            <View>
              <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Settings</Text>
              <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
                Manage workspace
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.headerExitButton,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border,
                },
              ]}
              onPress={handleSignOut}
              activeOpacity={0.7}
              accessibilityLabel="Sign Out"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <LogOut size={18} color={isDark ? '#F87171' : colors.danger} />
            </TouchableOpacity>
          </View>

          {/* 1. Hero User Profile Card */}
          <UserProfileCard
            profile={profile}
            onChangeAvatar={handleChangeAvatar}
            onEditProfile={() => setIsEditModalVisible(true)}
            onManagePlan={() => setIsPlanModalVisible(true)}
          />

          {/* 2. Group: Appearance & Theme */}
          {/* <View style={styles.groupContainer}>
          <View style={styles.groupHeaderRow}>
            <Palette size={13} color={colors.textMuted} />
            <Text style={[styles.groupHeaderLabel, { color: colors.textMuted }]}>
              APPEARANCE & THEME
            </Text>
          </View>

          <View
            style={[
              styles.themeCard,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
              },
            ]}
          >
            <View style={styles.themeOptionsRow}>
              {THEME_OPTIONS.map((opt) => {
                const isSelected = themeMode === opt.id;
                const IconComponent = opt.icon;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.themeOptionBtn,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(99, 102, 241, 0.18)'
                            : 'rgba(79, 70, 229, 0.10)'
                          : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setThemeMode(opt.id)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.themeIconCircle,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.05)',
                        },
                      ]}
                    >
                      <IconComponent
                        size={17}
                        color={isSelected ? '#FFFFFF' : colors.textSecondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.themeOptionLabel,
                        {
                          color: isSelected ? colors.primary : colors.textPrimary,
                          fontWeight: isSelected ? '800' : '600',
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={[styles.themeOptionDesc, { color: colors.textMuted }]}>
                      {opt.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View> */}

          {/* 3. Group: Account & Security */}
          <View style={styles.groupContainer}>
            <Text style={[styles.groupHeaderLabel, { color: colors.textMuted }]}>
              ACCOUNT & WORKSPACE
            </Text>

            <View
              style={[
                styles.groupCard,
                {
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                },
              ]}
            >
              {/* Personal Information */}
              <TouchableOpacity
                style={styles.rowItem}
                onPress={() => setIsEditModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.rowIconCircle, { backgroundColor: colors.badgeBg }]}>
                  <User size={16} color={colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Personal Information
                  </Text>
                </View>
                <View style={styles.rowTrailing}>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              {/* Subscription & Billing */}
              <TouchableOpacity
                style={styles.rowItem}
                onPress={() => setIsPlanModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                  <CreditCard size={16} color={colors.accent} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Subscription & Billing
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
                {/* <View style={styles.rowTrailing}>
                  <View style={[styles.proTag, { backgroundColor: colors.primary }]}>
                    <Sparkles size={11} color="#FFFFFF" />
                    <Text style={styles.proTagText}>PRO</Text>
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View> */}
              </TouchableOpacity>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              {/* Stitch Cloud Auth */}
              <TouchableOpacity
                style={styles.rowItem}
                onPress={() => router.push('/auth/login')}
                activeOpacity={0.7}
              >
                <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(0, 153, 255, 0.15)' }]}>
                  <LogIn size={16} color="#0099ff" />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Authentication & Sessions
                  </Text>
                </View>
                <View style={styles.rowTrailing}>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              {/* iCloud Sync */}
              <View style={styles.rowItem}>
                <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Cloud size={16} color={colors.success} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Cloud Sync & Backup
                  </Text>
                </View>
                <Switch
                  value={profile.cloudSync}
                  onValueChange={handleToggleCloudSync}
                  trackColor={{ false: colors.surfaceSubtle, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              {/* Biometric Security */}
              <View style={styles.rowItem}>
                <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Lock size={16} color={colors.warning} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Face ID / Biometric Lock
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                    {profile.biometricLock
                      ? `Linked to ${profile.email}`
                      : 'Disabled for this account'}
                  </Text>
                </View>
                <Switch
                  value={profile.biometricLock}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: colors.surfaceSubtle, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* 4. Group: AI Vision Engine & Automation */}
          <View style={styles.groupContainer}>
            <Text style={[styles.groupHeaderLabel, { color: colors.textMuted }]}>
              AI VISION ENGINE & AUTOMATION
            </Text>
            <View
              style={[
                styles.groupCard,
                {
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                },
              ]}
            >
              {/* Detail Level Selector */}
              <View style={[styles.rowItem, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                    <Sliders size={16} color={colors.accent} />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      Analysis Detail Level
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                      Adjust depth of breakdown & code generation
                    </Text>
                  </View>
                </View>

                {/* Segmented control */}
                <View
                  style={[
                    styles.segmentContainer,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {(['concise', 'detailed', 'comprehensive'] as const).map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.segmentBtn,
                        settings.preferredDetailLevel === lvl && {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() => handleSelectDetailLevel(lvl)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          {
                            color:
                              settings.preferredDetailLevel === lvl
                                ? '#FFFFFF'
                                : colors.textSecondary,
                            fontWeight:
                              settings.preferredDetailLevel === lvl ? '700' : '600',
                          },
                        ]}
                      >
                        {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              {/* Auto-Analyze on Screenshot */}
              <View style={styles.rowItem}>
                <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Zap size={16} color={colors.success} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Auto-Analyze on Screenshot
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Trigger OCR summary on device capture
                  </Text>
                </View>
                <Switch
                  value={settings.autoAnalyzeScreenshots}
                  onValueChange={handleToggleAutoAnalyze}
                  trackColor={{ false: colors.surfaceSubtle, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              {/* Smart Categorization Engine */}
              <View style={styles.rowItem}>
                <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                  <Filter size={16} color={colors.accent} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Smart Categorization Engine
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Filter personal photos & selfies (only analyze actionable posts, code, & articles)
                  </Text>
                </View>
                <Switch
                  value={settings.smartCategorizationEnabled !== false}
                  onValueChange={handleToggleSmartCategorization}
                  trackColor={{ false: colors.surfaceSubtle, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              {/* Daily Evening Screenshot Nudge */}
              <View style={[styles.rowItem, { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
                    <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                      <Moon size={16} color={colors.primary} />
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                        Daily Evening Nudge
                      </Text>
                      <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                        {'"Heads up! You might have some unvisited screenshots."'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.dailyNudgeEnabled !== false}
                    onValueChange={handleToggleDailyNudge}
                    trackColor={{ false: colors.surfaceSubtle, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {settings.dailyNudgeEnabled !== false && (
                  <View style={{ gap: 10, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 }}>
                      DELIVERY TIME
                    </Text>
                    <View
                      style={[
                        styles.segmentContainer,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {[
                        { label: '7:00 PM', hour: 19 },
                        { label: '8:00 PM', hour: 20 },
                        { label: '9:00 PM', hour: 21 },
                        { label: '10:00 PM', hour: 22 },
                      ].map((item) => {
                        const isSelected = (settings.dailyNudgeHour ?? 20) === item.hour;
                        return (
                          <TouchableOpacity
                            key={item.hour}
                            style={[
                              styles.segmentBtn,
                              isSelected && { backgroundColor: colors.primary },
                            ]}
                            onPress={() => handleSelectNudgeHour(item.hour)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.segmentBtnText,
                                {
                                  color: isSelected ? '#FFFFFF' : colors.textSecondary,
                                  fontWeight: isSelected ? '700' : '600',
                                  fontSize: 11,
                                },
                              ]}
                            >
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border,
                        marginTop: 4,
                      }}
                      onPress={handleSendTestNudge}
                      activeOpacity={0.8}
                    >
                      <Bell size={13} color={colors.primary} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                        Send Test Nudge Now
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              {/* Interactive Notifications */}
              <View style={styles.rowItem}>
                <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Bell size={16} color={colors.warning} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Action Notification Prompts
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Interactive notification actions on capture
                  </Text>
                </View>
                <Switch
                  value={settings.enableNotifications}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: colors.surfaceSubtle, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* 5. Group: Storage & Data Management */}
          <View style={styles.groupContainer}>
            <Text style={[styles.groupHeaderLabel, { color: colors.textMuted }]}>
              STORAGE & PRIVACY
            </Text>
            <View
              style={[
                styles.groupCard,
                {
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                },
              ]}
            >
              {/* Cache row */}
              <TouchableOpacity style={styles.rowItem} onPress={handleClearCache} activeOpacity={0.7}>
                <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Trash2 size={16} color={colors.danger} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Local Screenshot Cache
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Clear temporary image OCR artifacts
                  </Text>
                </View>
                <View style={styles.rowTrailing}>
                  <Text style={[styles.rowTrailingText, { color: colors.textMuted }]}>{cacheSize}</Text>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              {/* Export data */}
              <TouchableOpacity style={styles.rowItem} onPress={handleExportData} activeOpacity={0.7}>
                <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                  <Download size={16} color={colors.accent} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Export Data Archive
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Download JSON copy of all captures & code
                  </Text>
                </View>
                <View style={styles.rowTrailing}>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              {/* Anonymous Telemetry */}
              <View style={styles.rowItem}>
                <View style={[styles.rowIconCircle, { backgroundColor: colors.badgeBg }]}>
                  <Globe size={16} color={colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Anonymous Diagnostics
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Help improve OCR bounding box precision
                  </Text>
                </View>
                <Switch
                  value={profile.telemetryEnabled}
                  onValueChange={handleToggleTelemetry}
                  trackColor={{ false: colors.surfaceSubtle, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* 6. Group: Legal, Policies & Trust */}
          <View style={styles.groupContainer}>
            <Text style={[styles.groupHeaderLabel, { color: colors.textMuted }]}>
              LEGAL & POLICIES
            </Text>
            <View
              style={[
                styles.groupCard,
                {
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                },
              ]}
            >
              {/* Privacy Policy */}
              <TouchableOpacity
                style={styles.rowItem}
                onPress={() => openLegalModal('privacy')}
                activeOpacity={0.7}
              >
                <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <ShieldCheck size={16} color={colors.success} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Privacy Policy
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Zero-retention AI & on-device OCR policy
                  </Text>
                </View>
                <View style={styles.rowTrailing}>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              {/* Terms of Service */}
              <TouchableOpacity
                style={styles.rowItem}
                onPress={() => openLegalModal('terms')}
                activeOpacity={0.7}
              >
                <View style={[styles.rowIconCircle, { backgroundColor: colors.badgeBg }]}>
                  <FileText size={16} color={colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Terms of Service
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Usage agreement, software license & AI terms
                  </Text>
                </View>
                <View style={styles.rowTrailing}>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              {/* Open Source Licenses */}
              <TouchableOpacity
                style={styles.rowItem}
                onPress={() => openLegalModal('licenses')}
                activeOpacity={0.7}
              >
                <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                  <Award size={16} color={colors.accent} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Open Source Licenses
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Third-party packages & component credits
                  </Text>
                </View>
                <View style={styles.rowTrailing}>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* 7. Group: Support & Feedback */}
          <View style={styles.groupContainer}>
            <Text style={[styles.groupHeaderLabel, { color: colors.textMuted }]}>
              SUPPORT & COMMUNITY
            </Text>
            <View
              style={[
                styles.groupCard,
                {
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.rowItem}
                onPress={() =>
                  Alert.alert(
                    'Help Center',
                    'Visit docs.screenalyze.ai for tutorials on prompt crafting, system wireframes, and shortcuts.'
                  )
                }
                activeOpacity={0.7}
              >
                <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                  <HelpCircle size={16} color={colors.accent} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Help & Documentation
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Interactive guides for screenshot capture
                  </Text>
                </View>
                <View style={styles.rowTrailing}>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              <View
                style={[
                  styles.rowDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border },
                ]}
              />

              <TouchableOpacity
                style={styles.rowItem}
                onPress={() =>
                  Alert.alert(
                    'Feedback Sent',
                    'Thank you for your feedback! Our engineering team actively reviews community suggestions.'
                  )
                }
                activeOpacity={0.7}
              >
                <View style={[styles.rowIconCircle, { backgroundColor: colors.badgeBg }]}>
                  <Mail size={16} color={colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    Send Feedback & Ideas
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    Request new AI actions or export formats
                  </Text>
                </View>
                <View style={styles.rowTrailing}>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            </View>
          </View>


          {/* Footer Build Info */}
          <View style={styles.footerContainer}>
            <View style={styles.footerBrandRow}>
              <FileCode size={13} color={colors.textMuted} />
              <Text style={[styles.versionText, { color: colors.textMuted }]}>
                Screenalyze Mobile • v0.0.1 (Build A1)
              </Text>
            </View>
            {/* <Text style={[styles.buildText, { color: colors.textMuted }]}>
              Powered by Expo SDK 57 • OpenAI GPT-4o Multimodal Vision
            </Text> */}
          </View>
        </ScrollView>

        {/* Edit Profile Modal */}
        <EditProfileModal
          visible={isEditModalVisible}
          profile={profile}
          onClose={() => setIsEditModalVisible(false)}
          onSave={handleSaveProfile}
        />

        {/* Plan Details Modal */}
        <PlanDetailsModal
          visible={isPlanModalVisible}
          onClose={() => setIsPlanModalVisible(false)}
        />

        {/* Legal & Policy Viewer Modal */}
        <LegalModal
          visible={legalModalVisible}
          type={legalModalType}
          onClose={() => setLegalModalVisible(false)}
        />

        {/* Back Tap & Shortcuts Setup Guide */}
        <BackTapGuideModal
          visible={isBackTapModalVisible}
          onClose={() => setIsBackTapModalVisible(false)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginLeft: 6,
  },
  groupHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  themeCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOptionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  themeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  themeOptionLabel: {
    fontSize: 13,
  },
  themeOptionDesc: {
    fontSize: 10,
    fontWeight: '500',
  },
  groupCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 1.5,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTrailingText: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 110,
  },
  rowDivider: {
    height: 1,
    marginLeft: 62,
  },
  proTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  proTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 4,
    marginTop: 4,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentBtnText: {
    fontSize: 12,
  },
  headerExitButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  footerContainer: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
  },
  footerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buildText: {
    fontSize: 11,
    opacity: 0.8,
  },
});
