import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  User,
  Briefcase,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ArrowRight,
  ScanFace,
  Sparkles,
} from 'lucide-react-native';
import { StitchTheme } from '../../theme/stitchTheme';
import { Colors } from '../../theme/colors';
import { ApiClient } from '../../services/apiClient';
import { StorageService } from '../../services/storageService';
import { BiometricService } from '../../services/biometricService';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
];

const SUGGESTED_ROLES = [
  'Product Designer',
  'AI Engineer',
  'Product Manager',
  'Software Engineer',
  'Founder',
  'UX Researcher',
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState((params.email || '').trim().toLowerCase());

  useEffect(() => {
    if (!email) {
      StorageService.getActiveUserEmail().then((stored) => {
        if (stored) setEmail(stored.trim().toLowerCase());
      });
    }
  }, [email]);

  const [name, setName] = useState('');
  const [role, setRole] = useState('Product Creator');
  const [company, setCompany] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [enableFaceId, setEnableFaceId] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  const handlePickCustomImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Needed',
          'Please allow photo library access to choose a custom profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setSelectedAvatar(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  const handleCompleteRegistration = async () => {
    Keyboard.dismiss();
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setNameError('Please enter your full name (at least 2 characters).');
      return;
    }
    setNameError('');
    setIsLoading(true);

    try {
      const trimmedRole = role.trim() || 'Product Creator';
      const trimmedCompany = company.trim() || 'Screenalyze Workspace';

      // 1. Update user profile on backend
      const savedProfile = await ApiClient.updateUserProfile({
        name: trimmedName,
        role: trimmedRole,
        company: trimmedCompany,
        avatarUri: selectedAvatar,
        isRegistered: true,
      });

      // 2. Persist locally to storage
      await StorageService.saveUserProfile(savedProfile, email);

      // 3. Mark user registered
      await StorageService.setUserRegistered(email, true);

      // 4. If Face ID opt-in was selected, confirm via native biometric authentication
      if (enableFaceId) {
        const biometricStatus = await BiometricService.checkBiometricStatus();
        if (biometricStatus.isSupported) {
          const authenticated = await BiometricService.authenticate(
            `Enable ${biometricStatus.label} for ${email}`
          );

          if (authenticated) {
            const session = await StorageService.getAuthSession();
            if (session?.token) {
              await StorageService.setBiometricLinkedEmail(email);
              await StorageService.saveBiometricToken(email, session.token);
              await StorageService.setBiometricLockEnabled(true, email);
              await StorageService.saveUserProfile({ biometricLock: true }, email);
            }
          } else {
            await StorageService.setBiometricLockEnabled(false, email);
            await StorageService.saveUserProfile({ biometricLock: false }, email);
          }
        }
      } else {
        await StorageService.setBiometricLockEnabled(false, email);
      }

      setIsLoading(false);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      setIsLoading(false);
      console.warn('Registration failed:', err);
      // Fallback: Save locally anyway so user is not blocked
      await StorageService.saveUserProfile(
        {
          name: trimmedName,
          role: role.trim() || 'Product Creator',
          company: company.trim() || 'Screenalyze Workspace',
          avatarUri: selectedAvatar,
          isRegistered: true,
        },
        email
      );
      await StorageService.setUserRegistered(email, true);
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.root}>
      {/* Scenic Mountain Background Wallpaper matching auth screens */}
      <Image
        source={{ uri: StitchTheme.backdropUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
        cachePolicy="memory-disk"
        pointerEvents="none"
      />

      {/* Dark Scrim Gradient */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.45)',
          'rgba(0, 0, 0, 0.65)',
          'rgba(0, 0, 0, 0.88)',
        ]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 16,
                paddingBottom: insets.bottom + 24,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Island Badge */}
            <View style={styles.badgeRow}>
              <View style={styles.stepBadge}>
                <Sparkles size={13} color="#0099ff" />
                <Text style={styles.stepBadgeText}>STEP 2 OF 2 • COMPLETE REGISTRATION</Text>
              </View>
            </View>

            {/* Hero Title */}
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Welcome aboard</Text>
              <Text style={styles.heroSubtitle}>
                Tell us a bit about yourself to personalize your Screenalyze experience.
              </Text>

              {email ? (
                <View style={styles.verifiedEmailCapsule}>
                  <CheckCircle2 size={13} color="#34D399" />
                  <Text style={styles.verifiedEmailText}>{email}</Text>
                </View>
              ) : null}
            </View>

            {/* Frosted Glass Form Card */}
            <BlurView intensity={70} tint="dark" style={styles.glassCard}>
              {/* Top Hairline Accent */}
              <LinearGradient
                colors={['transparent', 'rgba(255, 255, 255, 0.22)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.topHairline}
                pointerEvents="none"
              />

              {/* Avatar Selection Section */}
              <View style={styles.avatarSection}>
                <View style={styles.mainAvatarWrapper}>
                  <Image
                    source={{ uri: selectedAvatar }}
                    style={styles.mainAvatar}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.customCameraBtn}
                    onPress={handlePickCustomImage}
                    activeOpacity={0.8}
                    accessibilityLabel="Upload custom photo"
                  >
                    <Camera size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {/* Preset Avatars Row */}
                <View style={styles.avatarPickerRow}>
                  {PRESET_AVATARS.map((uri, idx) => {
                    const isSelected = selectedAvatar === uri;
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setSelectedAvatar(uri)}
                        activeOpacity={0.7}
                        style={[
                          styles.presetAvatarBtn,
                          isSelected && styles.presetAvatarBtnActive,
                        ]}
                      >
                        <Image source={{ uri }} style={styles.presetAvatarImg} contentFit="cover" />
                        {isSelected && (
                          <View style={styles.avatarCheckmarkBadge}>
                            <Check size={9} color="#ffffff" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Full Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Full Name <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    Boolean(nameError) && styles.inputContainerError,
                  ]}
                >
                  <User size={18} color={StitchTheme.colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Alex Morgan"
                    placeholderTextColor={StitchTheme.colors.outline}
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      if (nameError) setNameError('');
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                {Boolean(nameError) && <Text style={styles.errorText}>{nameError}</Text>}
              </View>

              {/* Professional Role / Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role or Profession</Text>
                <View style={styles.inputContainer}>
                  <Briefcase size={18} color={StitchTheme.colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Product Designer"
                    placeholderTextColor={StitchTheme.colors.outline}
                    value={role}
                    onChangeText={setRole}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>

                {/* Suggested Role Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScroll}
                >
                  {SUGGESTED_ROLES.map((r) => {
                    const active = role.toLowerCase() === r.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[styles.roleChip, active && styles.roleChipActive]}
                        onPress={() => setRole(r)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Company / Workspace Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Workspace or Company (Optional)</Text>
                <View style={styles.inputContainer}>
                  <Building2 size={18} color={StitchTheme.colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Screenalyze Labs or Personal"
                    placeholderTextColor={StitchTheme.colors.outline}
                    value={company}
                    onChangeText={setCompany}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleCompleteRegistration}
                  />
                </View>
              </View>

              {/* Explicit Face ID Opt-In Switch Card */}
              <View style={styles.faceIdCard}>
                <View style={styles.faceIdLeft}>
                  <View style={styles.faceIdIconWrapper}>
                    <ScanFace size={20} color="#0099ff" />
                  </View>
                  <View style={styles.faceIdTextWrapper}>
                    <Text style={styles.faceIdTitle}>Enable Face ID Sign-In</Text>
                    <Text style={styles.faceIdDescription}>
                      Allows instant login next time using Face ID or device passcode.
                    </Text>
                  </View>
                </View>
                <Switch
                  value={enableFaceId}
                  onValueChange={setEnableFaceId}
                  trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#0099ff' }}
                  thumbColor="#ffffff"
                  ios_backgroundColor="rgba(255,255,255,0.15)"
                />
              </View>

              {/* Complete Setup Action Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.submitBtn}
                onPress={handleCompleteRegistration}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#0099ff', '#0077cc']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitText}>Complete Setup & Launch</Text>
                      <ArrowRight size={18} color="#ffffff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  badgeRow: {
    marginBottom: 12,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 153, 255, 0.12)',
    borderColor: 'rgba(0, 153, 255, 0.30)',
    borderWidth: 1,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0099ff',
    letterSpacing: 0.6,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.6,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  verifiedEmailCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginTop: 10,
  },
  verifiedEmailText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34D399',
  },
  glassCard: {
    width: '100%',
    borderRadius: 26,
    padding: 20,
    backgroundColor: 'rgba(11, 14, 20, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 12,
  },
  topHairline: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainAvatarWrapper: {
    position: 'relative',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: '#0099ff',
    padding: 2,
    marginBottom: 14,
  },
  mainAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  customCameraBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0099ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#101319',
  },
  avatarPickerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  presetAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'visible',
    position: 'relative',
  },
  presetAvatarBtnActive: {
    borderColor: '#0099ff',
    transform: [{ scale: 1.08 }],
  },
  presetAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  avatarCheckmarkBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0099ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: StitchTheme.colors.onSurfaceVariant,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  requiredAsterisk: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 9999,
    backgroundColor: 'rgba(39, 42, 49, 0.60)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: '#ffffff',
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 2,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(39, 42, 49, 0.45)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  roleChipActive: {
    backgroundColor: 'rgba(0, 153, 255, 0.18)',
    borderColor: '#0099ff',
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  roleChipTextActive: {
    color: '#0099ff',
    fontWeight: '600',
  },
  faceIdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 153, 255, 0.08)',
    borderColor: 'rgba(0, 153, 255, 0.22)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
    marginTop: 4,
  },
  faceIdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 12,
  },
  faceIdIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 153, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceIdTextWrapper: {
    flex: 1,
  },
  faceIdTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  faceIdDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 15,
  },
  submitBtn: {
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: '#0099ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: 20,
    gap: 8,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
