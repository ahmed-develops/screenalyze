import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenshotAnalysis, AppSettings, UserProfile, ThemeMode } from '../types';
import { ApiClient } from './apiClient';

const STORAGE_KEYS = {
  SCREENSHOTS: '@screenalyze_screenshots_v1',
  SETTINGS: '@screenalyze_settings_v1',
  USER_PROFILE: '@screenalyze_user_profile_v1',
  IGNORED_IDS: '@screenalyze_ignored_ids_v1',
  IGNORED_HASHES: '@screenalyze_ignored_hashes_v1',
  AUTH_TOKEN: '@screenalyze_auth_token_v1',
  AUTH_EMAIL: '@screenalyze_auth_email_v1',
  BIOMETRIC_LOCK: '@screenalyze_biometric_lock_v1',
  BIOMETRIC_LINKED_EMAIL: '@screenalyze_biometric_linked_email_v1',
  BIOMETRIC_TOKEN_PREFIX: '@screenalyze_biometric_token_v1_',
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Screenalyze User',
  email: 'user@screenalyze.ai',
  role: 'Product Creator',
  company: 'Screenalyze Workspace',
  avatarUri:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  plan: 'pro',
  planName: 'Pro',
  memberSince: 'October 2026',
  totalCaptures: 0,
  totalTutorials: 0,
  accuracyRate: '100%',
  cloudSync: true,
  biometricLock: true,
  telemetryEnabled: false,
};

const DEFAULT_SETTINGS: AppSettings = {
  openaiApiKey: '',
  autoAnalyzeScreenshots: true,
  enableNotifications: true,
  dailyNudgeEnabled: true,
  dailyNudgeHour: 20,
  dailyNudgeMinute: 0,
  smartCategorizationEnabled: true,
  preferredDetailLevel: 'detailed',
  customPromptInstruction: '',
  themeMode: 'system',
};

export const INITIAL_STITCH_SCREENSHOTS: ScreenshotAnalysis[] = [
  {
    id: 'stitch-dash-v2',
    title: 'Dashboard Redesign v2',
    category: 'Figma Mockup',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDg4TQ_x19mfDcjzMQhYyxl0TAtSr37btztmAEPn0Yg8PG_WWMxO1f6MQ97Tf5wWNSWUhHuWTUHzMPCXr1PAzlVXM1iJrXoPx9cMtqEgjUjKvDXXnc4drFm9Ki0LfvWXkoR1wB3zx1anaMTM1zSwu7YiywyySNtY7NhDTMFvgjU8QI_NK91IFi3j7IC73PVCPcRxAJuMF4kegP35_qaTvLc8OXJdfkl2UFxRbo7ASO-SK9qQU5k9q5e6g',
    capturedAt: Date.now() - 12 * 60 * 1000,
    summary:
      'Dark mode analytics dashboard with blue KPI line charts, frosted glass widget containers, and tabular real-time metrics extracted from Figma.',
    keyPoints: [
      'Obsidian dark surface (#101319) with 24px blur',
      'Electric cyan highlight accents (#0099FF)',
      'Tabular KPI metric cards with 96% visual match',
    ],
    contextualActions: [
      { id: 'a1', label: 'Create Figma Component Specs', badge: 'Tutorial', type: 'tutorial' },
      { id: 'a2', label: 'Extract React Native Code', badge: 'Code', type: 'code' },
    ],
    followUpQuestions: [
      'How do I build the frosted line chart?',
      'What are the design tokens used in this card?',
    ],
    suggestedActions: ['Create Tutorial', 'Extract React Code'],
    isReviewed: true,
  },
  {
    id: 'stitch-checkout-flow',
    title: 'Payment Checkout Flow',
    category: 'iOS App',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCbR70MIfPLjnRs4U1KhcMy_vSLobieh4iF1bZiakTq-S44zxAinhmF1GfJJIcqiGktkYPs7Bdj3XtCaoChG7S24MEnF2yuqcyyaZ9x1e-1vqX0QWC4k1NXYzsi7efvKgkr41s5W1Y5jM9-7q0I3XBD0kzOc8GBJdGLCjqKo7gF3QejLLkyQ-RY1MO7qJvoI7ipX6jBDVjTTfYiyUFVZ5CI3GnWRW0H-fgg6bloCnKx5tAM_pVji1ghPA',
    capturedAt: Date.now() - 2 * 60 * 60 * 1000,
    summary:
      'Mobile fintech checkout sheet featuring frosted glass payment cards, Apple Pay primary button, and biometric authentication status.',
    keyPoints: [
      'Single-hand checkout action bar',
      'OCR text extracted for card brand and pricing',
      'Biometric authorization indicator',
    ],
    contextualActions: [
      { id: 'b1', label: 'Generate Step-by-Step Tutorial', badge: 'Tutorial', type: 'tutorial' },
      { id: 'b2', label: 'Explain Flow Architecture', badge: 'Architecture', type: 'explanation' },
    ],
    followUpQuestions: [
      'How does Apple Pay sheet integrate here?',
      'What fallback exists for older iOS devices?',
    ],
    suggestedActions: ['Generate Tutorial', 'Explain Architecture'],
    isReviewed: true,
  },
  {
    id: 'stitch-user-profile',
    title: 'User Profile Wireframe',
    category: 'Design System',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuACCfHkrY_KFZnS3yIUgHgnPP2xVUFLllzM_le_T_2r_HRmADaA3LAAvTmCWaKQlvKeQsaijC5kLUrLWPMVzRXAvAMTEorLMts44saV1FlFotpXqzrWX8zCGLOm_LoLJImfsX5Y3BuMLE9pw2eOCrZtCBJSlz-GOUOyJAjI0ccdlhsWZt63J5j1U6h4VoI74ekSuzp8Ni37PKohQ1kyxHAZDqLNyFNU_MsCDjnIjICnwUyTQnssazgZxg',
    capturedAt: Date.now() - 24 * 60 * 60 * 1000,
    summary:
      'Design system specification sheet showcasing profile settings toggles, avatar placeholders, and typography scale tokens.',
    keyPoints: [
      'Comprehensive Inter font scale specimen',
      'Rounded toggle switches and badge chips',
      'Color contrast validation passed WCAG AAA',
    ],
    contextualActions: [
      { id: 'c1', label: 'Extract Typography Tokens', badge: 'Tokens', type: 'diagram' },
      { id: 'c2', label: 'Build Component Library', badge: 'Code', type: 'code' },
    ],
    followUpQuestions: [
      'What are the switch toggle corner radii?',
      'Which color tokens are used for disabled state?',
    ],
    suggestedActions: ['Extract Tokens', 'Build Library'],
    isReviewed: false,
  },
];

let activeUserEmail: string | null = null;
let cachedScreenshots: ScreenshotAnalysis[] | null = null;
let cachedSettings: AppSettings | null = null;
let cachedUserProfile: UserProfile | null = null;
let cachedIgnoredIds: Set<string> | null = null;
let cachedIgnoredHashes: Set<string> | null = null;

function sanitizeEmailKey(email: string | null): string {
  if (!email || !email.trim()) return 'guest';
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export const StorageService = {
  /**
   * Helper to resolve the currently active user email.
   */
  async getActiveUserEmail(): Promise<string | null> {
    if (activeUserEmail) return activeUserEmail;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_EMAIL);
      if (stored) {
        activeUserEmail = stored.trim().toLowerCase();
        return activeUserEmail;
      }
    } catch (e) {
      console.warn('Failed reading active auth email:', e);
    }
    return null;
  },

  getScopedKey(baseKey: string, email?: string | null): string {
    const target = email || activeUserEmail;
    return `${baseKey}_${sanitizeEmailKey(target)}`;
  },

  /**
   * Clears in-memory caches to prevent state leaking between account switches.
   */
  clearActiveUserContext(): void {
    activeUserEmail = null;
    cachedScreenshots = null;
    cachedSettings = null;
    cachedUserProfile = null;
    cachedIgnoredIds = null;
    cachedIgnoredHashes = null;
  },

  getScreenshotById(id: string): ScreenshotAnalysis | null {
    if (cachedScreenshots) {
      const found = cachedScreenshots.find((s) => s.id === id);
      if (found) return found;
    }
    return null;
  },

  /**
   * Searches existing history for a screenshot matching id, assetId, or imageHash.
   */
  async findExistingScreenshot(criteria: {
    id?: string;
    assetId?: string;
    imageHash?: string;
  }): Promise<ScreenshotAnalysis | null> {
    const list = await this.getScreenshots();
    return (
      list.find((s) => {
        if (criteria.id && s.id === criteria.id) return true;
        if (criteria.assetId && s.assetId && s.assetId === criteria.assetId) return true;
        if (criteria.imageHash && s.imageHash && s.imageHash === criteria.imageHash) return true;
        return false;
      }) || null
    );
  },

  /**
   * Checks whether a screenshot has already been analyzed or dismissed as personal/non-actionable.
   */
  async isAlreadyAnalyzed(criteria: {
    id?: string;
    assetId?: string;
    imageHash?: string;
  }): Promise<boolean> {
    const existing = await this.findExistingScreenshot(criteria);
    if (existing) return true;

    const ignoredIds = await this.getIgnoredAssetIds();
    if (criteria.id && ignoredIds.has(criteria.id)) return true;
    if (criteria.assetId && ignoredIds.has(criteria.assetId)) return true;

    if (criteria.imageHash) {
      const ignoredHashes = await this.getIgnoredHashes();
      if (ignoredHashes.has(criteria.imageHash)) return true;
    }

    return false;
  },

  async getScreenshots(): Promise<ScreenshotAnalysis[]> {
    if (cachedScreenshots) {
      return cachedScreenshots;
    }

    const email = await this.getActiveUserEmail();
    const scopedKey = this.getScopedKey(STORAGE_KEYS.SCREENSHOTS, email);

    // 1. Try syncing from FastAPI backend
    try {
      const backendScreenshots = await ApiClient.getUserScreenshots();
      if (Array.isArray(backendScreenshots)) {
        cachedScreenshots = backendScreenshots;
        await AsyncStorage.setItem(scopedKey, JSON.stringify(backendScreenshots));
        return backendScreenshots;
      }
    } catch {
      // Backend unavailable or offline; proceed to local scoped cache
    }

    // 2. Read local scoped cache
    try {
      const data = await AsyncStorage.getItem(scopedKey);
      if (!data) {
        cachedScreenshots = [];
        return [];
      }
      const parsed: ScreenshotAnalysis[] = JSON.parse(data);
      cachedScreenshots = parsed;
      return parsed;
    } catch (e) {
      console.error('Failed to load screenshots from storage', e);
      cachedScreenshots = [];
      return [];
    }
  },

  async saveScreenshot(item: ScreenshotAnalysis): Promise<void> {
    try {
      const email = await this.getActiveUserEmail();
      const scopedKey = this.getScopedKey(STORAGE_KEYS.SCREENSHOTS, email);

      const current = await this.getScreenshots();
      // Deduplicate: replace any existing item with same id, assetId, or imageHash
      const filtered = current.filter((i) => {
        if (i.id === item.id) return false;
        if (item.assetId && i.assetId && i.assetId === item.assetId) return false;
        if (item.imageHash && i.imageHash && i.imageHash === item.imageHash) return false;
        return true;
      });

      const updated = [item, ...filtered];
      cachedScreenshots = updated;
      await AsyncStorage.setItem(scopedKey, JSON.stringify(updated));

      // Asynchronously sync to backend MongoDB
      ApiClient.saveScreenshot(item).catch((e) =>
        console.warn('Failed syncing screenshot to backend:', e)
      );
    } catch (e) {
      console.error('Failed to save screenshot', e);
    }
  },

  async updateScreenshot(
    id: string,
    updater: (prev: ScreenshotAnalysis) => ScreenshotAnalysis
  ): Promise<ScreenshotAnalysis | null> {
    try {
      const email = await this.getActiveUserEmail();
      const scopedKey = this.getScopedKey(STORAGE_KEYS.SCREENSHOTS, email);

      const current = await this.getScreenshots();
      const index = current.findIndex((s) => s.id === id);
      if (index === -1) return null;

      const updatedItem = updater(current[index]);
      current[index] = updatedItem;
      cachedScreenshots = [...current];
      await AsyncStorage.setItem(scopedKey, JSON.stringify(current));

      // Asynchronously sync to backend MongoDB
      ApiClient.saveScreenshot(updatedItem).catch((e) =>
        console.warn('Failed syncing updated screenshot to backend:', e)
      );

      return updatedItem;
    } catch (e) {
      console.error('Failed to update screenshot', e);
      return null;
    }
  },

  async deleteScreenshot(id: string): Promise<void> {
    try {
      const email = await this.getActiveUserEmail();
      const scopedKey = this.getScopedKey(STORAGE_KEYS.SCREENSHOTS, email);

      const current = await this.getScreenshots();
      const filtered = current.filter((s) => s.id !== id);
      cachedScreenshots = filtered;
      await AsyncStorage.setItem(scopedKey, JSON.stringify(filtered));

      // Asynchronously sync deletion to backend MongoDB
      ApiClient.deleteScreenshot(id).catch((e) =>
        console.warn('Failed deleting screenshot from backend:', e)
      );
    } catch (e) {
      console.error('Failed to delete screenshot', e);
    }
  },

  async getSettings(): Promise<AppSettings> {
    if (cachedSettings) return cachedSettings;

    const email = await this.getActiveUserEmail();
    const scopedKey = this.getScopedKey(STORAGE_KEYS.SETTINGS, email);

    try {
      // 1. Try syncing from FastAPI backend
      try {
        const backendSettings = await ApiClient.getAppSettings();
        const merged: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...backendSettings,
        };
        cachedSettings = merged;
        await AsyncStorage.setItem(scopedKey, JSON.stringify(merged));
        return merged;
      } catch {
        // Backend offline or error; proceed to scoped local storage
      }

      // 2. Fallback to AsyncStorage
      const data = await AsyncStorage.getItem(scopedKey);
      if (!data) {
        cachedSettings = DEFAULT_SETTINGS;
        return DEFAULT_SETTINGS;
      }
      const parsed = JSON.parse(data);
      const res = {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };
      cachedSettings = res;
      return res;
    } catch (e) {
      console.error('Failed to load settings', e);
      cachedSettings = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const email = await this.getActiveUserEmail();
      const scopedKey = this.getScopedKey(STORAGE_KEYS.SETTINGS, email);

      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      cachedSettings = updated;
      await AsyncStorage.setItem(scopedKey, JSON.stringify(updated));

      // Sync to FastAPI backend asynchronously
      try {
        await ApiClient.updateAppSettings(settings);
      } catch (errSync) {
        console.warn('Failed syncing settings to backend:', errSync);
      }

      return updated;
    } catch (e) {
      console.error('Failed to save settings', e);
      return DEFAULT_SETTINGS;
    }
  },

  async getUserProfile(targetEmail?: string | null): Promise<UserProfile> {
    const email = (targetEmail || (await this.getActiveUserEmail()))?.trim().toLowerCase();
    if (!targetEmail && cachedUserProfile) return cachedUserProfile;

    const scopedKey = this.getScopedKey(STORAGE_KEYS.USER_PROFILE, email);

    try {
      // 1. Try syncing from FastAPI backend
      try {
        const backendProfile = await ApiClient.getUserProfile();
        cachedUserProfile = backendProfile;
        await AsyncStorage.setItem(scopedKey, JSON.stringify(backendProfile));
        return backendProfile;
      } catch {
        // Backend offline or unauthenticated; fallback to local scoped cache
      }

      // 2. Fallback to AsyncStorage
      const data = await AsyncStorage.getItem(scopedKey);
      if (!data) {
        const displayName = email
          ? email
              .split('@')[0]
              .split('.')
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(' ')
          : 'Screenalyze User';

        const freshProfile: UserProfile = {
          name: displayName,
          email: email || 'user@screenalyze.ai',
          role: 'Product Creator',
          company: 'Screenalyze Workspace',
          avatarUri:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          plan: 'pro',
          planName: 'Pro',
          memberSince: 'October 2026',
          totalCaptures: 0,
          totalTutorials: 0,
          accuracyRate: '100%',
          cloudSync: true,
          biometricLock: true,
          telemetryEnabled: false,
        };
        cachedUserProfile = freshProfile;
        return freshProfile;
      }
      const parsed = JSON.parse(data);
      const res: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        ...parsed,
      };
      cachedUserProfile = res;
      return res;
    } catch (e) {
      console.error('Failed to load user profile', e);
      cachedUserProfile = DEFAULT_USER_PROFILE;
      return DEFAULT_USER_PROFILE;
    }
  },

  async saveUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const email = await this.getActiveUserEmail();
      const scopedKey = this.getScopedKey(STORAGE_KEYS.USER_PROFILE, email);

      const current = await this.getUserProfile();
      const updated: UserProfile = { ...current, ...profile };
      cachedUserProfile = updated;
      await AsyncStorage.setItem(scopedKey, JSON.stringify(updated));

      // Sync to FastAPI backend asynchronously
      try {
        await ApiClient.updateUserProfile(profile);
      } catch (errSync) {
        console.warn('Failed syncing user profile to backend:', errSync);
      }

      return updated;
    } catch (e) {
      console.error('Failed to save user profile', e);
      return DEFAULT_USER_PROFILE;
    }
  },

  async getThemeMode(): Promise<ThemeMode> {
    const s = await this.getSettings();
    return s.themeMode || 'system';
  },

  async saveThemeMode(mode: ThemeMode): Promise<ThemeMode> {
    await this.saveSettings({ themeMode: mode });
    return mode;
  },

  async getIgnoredAssetIds(): Promise<Set<string>> {
    if (cachedIgnoredIds) return cachedIgnoredIds;
    const email = await this.getActiveUserEmail();
    const scopedKey = this.getScopedKey(STORAGE_KEYS.IGNORED_IDS, email);
    try {
      const data = await AsyncStorage.getItem(scopedKey);
      if (data) {
        const parsed: string[] = JSON.parse(data);
        cachedIgnoredIds = new Set(parsed);
        return cachedIgnoredIds;
      }
      cachedIgnoredIds = new Set<string>();
      return cachedIgnoredIds;
    } catch (e) {
      console.warn('Failed loading ignored IDs', e);
      cachedIgnoredIds = new Set<string>();
      return cachedIgnoredIds;
    }
  },

  async addIgnoredAssetId(id: string): Promise<void> {
    try {
      const email = await this.getActiveUserEmail();
      const scopedKey = this.getScopedKey(STORAGE_KEYS.IGNORED_IDS, email);
      const current = await this.getIgnoredAssetIds();
      current.add(id);
      cachedIgnoredIds = current;
      await AsyncStorage.setItem(scopedKey, JSON.stringify(Array.from(current)));
    } catch (e) {
      console.warn('Failed saving ignored asset ID', e);
    }
  },

  async getIgnoredHashes(): Promise<Set<string>> {
    if (cachedIgnoredHashes) return cachedIgnoredHashes;
    const email = await this.getActiveUserEmail();
    const scopedKey = this.getScopedKey(STORAGE_KEYS.IGNORED_HASHES, email);
    try {
      const data = await AsyncStorage.getItem(scopedKey);
      if (data) {
        const parsed: string[] = JSON.parse(data);
        cachedIgnoredHashes = new Set(parsed);
        return cachedIgnoredHashes;
      }
      cachedIgnoredHashes = new Set<string>();
      return cachedIgnoredHashes;
    } catch (e) {
      console.warn('Failed loading ignored hashes', e);
      cachedIgnoredHashes = new Set<string>();
      return cachedIgnoredHashes;
    }
  },

  async addIgnoredHash(hash: string): Promise<void> {
    try {
      const email = await this.getActiveUserEmail();
      const scopedKey = this.getScopedKey(STORAGE_KEYS.IGNORED_HASHES, email);
      const current = await this.getIgnoredHashes();
      current.add(hash);
      cachedIgnoredHashes = current;
      await AsyncStorage.setItem(scopedKey, JSON.stringify(Array.from(current)));
    } catch (e) {
      console.warn('Failed saving ignored hash', e);
    }
  },

  async clearAll(): Promise<void> {
    try {
      this.clearActiveUserContext();
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.AUTH_EMAIL,
      ]);
      ApiClient.setAuthToken(null);
    } catch (e) {
      console.error('Failed to clear storage', e);
    }
  },

  async saveAuthSession(token: string, email: string): Promise<void> {
    try {
      this.clearActiveUserContext();
      activeUserEmail = email.trim().toLowerCase();
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.AUTH_TOKEN, token],
        [STORAGE_KEYS.AUTH_EMAIL, activeUserEmail],
      ]);
      ApiClient.setAuthToken(token);
    } catch (e) {
      console.error('Failed saving auth session:', e);
    }
  },

  async getAuthSession(): Promise<{ token: string; email: string } | null> {
    try {
      const [[, token], [, email]] = await AsyncStorage.multiGet([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.AUTH_EMAIL,
      ]);
      if (token && email) {
        activeUserEmail = email.trim().toLowerCase();
        ApiClient.setAuthToken(token);
        return { token, email: activeUserEmail };
      }
      return null;
    } catch (e) {
      console.warn('Failed retrieving auth session:', e);
      return null;
    }
  },

  async clearAuthSession(): Promise<void> {
    try {
      this.clearActiveUserContext();
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.AUTH_EMAIL,
      ]);
      ApiClient.setAuthToken(null);
    } catch (e) {
      console.error('Failed clearing auth session:', e);
    }
  },

  async getBiometricLinkedEmail(): Promise<string | null> {
    try {
      const email = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_LINKED_EMAIL);
      if (email) return email.trim().toLowerCase();
      const session = await this.getAuthSession();
      if (session?.email) return session.email.trim().toLowerCase();
      return 'muhammad.ahmed31612@gmail.com';
    } catch {
      return 'muhammad.ahmed31612@gmail.com';
    }
  },

  async setBiometricLinkedEmail(email: string | null): Promise<void> {
    try {
      if (email) {
        await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_LINKED_EMAIL, email.trim().toLowerCase());
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_LINKED_EMAIL);
      }
    } catch (e) {
      console.warn('Failed saving biometric linked email:', e);
    }
  },

  async saveBiometricToken(email: string, token: string): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.BIOMETRIC_TOKEN_PREFIX}${email.trim().toLowerCase()}`;
      await AsyncStorage.setItem(key, token);
    } catch (e) {
      console.warn('Failed saving biometric token:', e);
    }
  },

  async getBiometricToken(email: string): Promise<string | null> {
    try {
      const key = `${STORAGE_KEYS.BIOMETRIC_TOKEN_PREFIX}${email.trim().toLowerCase()}`;
      const token = await AsyncStorage.getItem(key);
      if (token) return token;
      const session = await this.getAuthSession();
      if (session && session.email.toLowerCase() === email.trim().toLowerCase()) {
        return session.token;
      }
      return null;
    } catch {
      return null;
    }
  },

  async removeBiometricToken(email: string): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.BIOMETRIC_TOKEN_PREFIX}${email.trim().toLowerCase()}`;
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed removing biometric token:', e);
    }
  },

  async setBiometricLockEnabled(enabled: boolean, email?: string | null): Promise<void> {
    try {
      const userEmail = (email || (await this.getActiveUserEmail()))?.trim().toLowerCase();
      const scopedKey = this.getScopedKey(STORAGE_KEYS.BIOMETRIC_LOCK, userEmail);
      await AsyncStorage.setItem(scopedKey, JSON.stringify(enabled));

      if (enabled && userEmail) {
        await this.setBiometricLinkedEmail(userEmail);
      } else if (!enabled && userEmail) {
        const linked = await this.getBiometricLinkedEmail();
        if (linked === userEmail) {
          await this.setBiometricLinkedEmail(null);
          await this.removeBiometricToken(userEmail);
        }
      }
    } catch (e) {
      console.warn('Failed saving biometric lock setting:', e);
    }
  },

  async isBiometricLockEnabled(email?: string | null): Promise<boolean> {
    try {
      const userEmail = (email || (await this.getActiveUserEmail()))?.trim().toLowerCase();
      const scopedKey = this.getScopedKey(STORAGE_KEYS.BIOMETRIC_LOCK, userEmail);
      const data = await AsyncStorage.getItem(scopedKey);
      if (data !== null) {
        return JSON.parse(data) === true;
      }
      // Check user profile for scoped user
      const profile = await this.getUserProfile(userEmail);
      return profile?.biometricLock ?? true;
    } catch {
      return false;
    }
  },
};
