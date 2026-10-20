import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, Check, User, Briefcase, Building, Mail } from 'lucide-react-native';
import { UserProfile } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface EditProfileModalProps {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (updated: Partial<UserProfile>) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  profile,
  onClose,
  onSave,
}) => {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [company, setCompany] = useState(profile.company);
  const [email, setEmail] = useState(profile.email);
  const [avatarUri, setAvatarUri] = useState(profile.avatarUri);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Screenalyze needs permission to select a profile photo from your library.'
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
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Error picking image', e);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    onSave({
      name: name.trim(),
      role: role.trim() || 'Product Designer',
      company: company.trim() || 'Screenalyze Labs',
      email: email.trim(),
      avatarUri,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
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
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                Update your personal workspace identity
              </Text>
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
            {/* Avatar Section */}
            <View
              style={[
                styles.avatarPickerSection,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.avatarPreviewWrap}>
                <Image
                  source={{ uri: avatarUri }}
                  style={[styles.avatarPreview, { borderColor: colors.primaryLight }]}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={[styles.changePhotoBtn, { backgroundColor: colors.primary }]}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <Camera size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.avatarPickerActions}>
                <TouchableOpacity
                  style={[
                    styles.choosePhotoAction,
                    {
                      backgroundColor: isDark
                        ? 'rgba(99, 102, 241, 0.12)'
                        : 'rgba(79, 70, 229, 0.08)',
                    },
                  ]}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <Camera size={15} color={colors.primary} />
                  <Text style={[styles.choosePhotoText, { color: colors.primary }]}>
                    Choose from Camera Roll
                  </Text>
                </TouchableOpacity>

                {/* Preset Avatars Row */}
                <Text style={[styles.presetsLabel, { color: colors.textMuted }]}>
                  Or select a preset:
                </Text>
                <View style={styles.presetsRow}>
                  {PRESET_AVATARS.map((uri, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setAvatarUri(uri)}
                      style={[
                        styles.presetThumbWrap,
                        avatarUri === uri && { borderColor: colors.accent },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri }} style={styles.presetThumb} contentFit="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Input Fields */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <User size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Role / Job Title</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Briefcase size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  value={role}
                  onChangeText={setRole}
                  placeholder="e.g. Senior Product Designer"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Company / Workspace
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Building size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  value={company}
                  onChangeText={setCompany}
                  placeholder="e.g. Screenalyze Labs"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Mail size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@company.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Save / Cancel */}
          <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingVertical: 20,
    gap: 16,
  },
  avatarPickerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatarPreviewWrap: {
    position: 'relative',
  },
  avatarPreview: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
  },
  changePhotoBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPickerActions: {
    flex: 1,
  },
  choosePhotoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  choosePhotoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetsLabel: {
    fontSize: 11,
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetThumbWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  presetThumb: {
    width: '100%',
    height: '100%',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    height: 48,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
