import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  ScreenshotCategorization,
  ScreenshotAnalysis,
  UserProfile,
  AppSettings,
  ContextualAction,
} from '../types';

/**
 * Dynamically resolves the FastAPI backend URL:
 * 1. Explicit env override: EXPO_PUBLIC_API_URL
 * 2. Host IP extracted from Expo dev server hostUri (works on physical devices over LAN!)
 * 3. Android emulator loopback (10.0.2.2)
 * 4. Localhost (8000)
 */
export function getBackendBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL?.trim()) {
    return process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/$/, '');
  }

  // Auto-detect host IP from Expo's Metro bundler hostUri when running on physical device
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:8000`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return 'http://localhost:8000';
}

export interface BackendAnalyzeResponse {
  title: string;
  category: string;
  summary: string;
  key_points: string[];
  contextual_actions: ContextualAction[];
  follow_up_questions: string[];
  is_worth_analyzing: boolean;
  image_hash?: string;
  already_analyzed?: boolean;
}

export interface BackendActionResponse {
  title: string;
  content: string;
  next_follow_ups: string[];
}

export interface ForwardSessionResult {
  sessionId: string;
  dashboardUrl: string;
  createdAt: number;
  status: string;
  message: string;
}

export interface BackendAuthResponse {
  success: boolean;
  token: string;
  user: UserProfile;
  is_new_user?: boolean;
}

export const ApiClient = {
  baseUrl: getBackendBaseUrl(),
  authToken: null as string | null,

  setAuthToken(token: string | null): void {
    this.authToken = token;
  },

  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  },

  /**
   * Health check to verify connection to FastAPI backend
   */
  async checkHealth(): Promise<{ status: string; service: string; version: string; openai_configured: boolean }> {
    const url = `${this.baseUrl}/health`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Backend health check failed: HTTP ${res.status}`);
    }
    return res.json();
  },

  /**
   * Fast gatekeeper classification via backend (/api/v1/screenshots/classify)
   */
  async classifyScreenshot(imageBase64: string): Promise<ScreenshotCategorization> {
    const url = `${this.baseUrl}/api/v1/screenshots/classify`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ image_base64: imageBase64 }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Classification error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      isWorthAnalyzing: Boolean(data.is_worth_analyzing),
      category: data.category,
      confidence: data.confidence,
      reason: data.reason,
      imageHash: data.image_hash,
      cached: data.cached,
    };
  },

  /**
   * Multimodal Sol analysis via backend (/api/v1/screenshots/analyze)
   */
  async analyzeScreenshot(
    imageBase64: string,
    customInstruction?: string,
    forceReanalyze?: boolean,
    skipGatekeeper?: boolean
  ): Promise<Omit<ScreenshotAnalysis, 'id' | 'imageUri' | 'capturedAt'>> {
    const url = `${this.baseUrl}/api/v1/screenshots/analyze`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        image_base64: imageBase64,
        custom_instruction: customInstruction,
        force_reanalyze: forceReanalyze ?? false,
        skip_gatekeeper: skipGatekeeper ?? true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Visual analysis error (${res.status}): ${err}`);
    }

    const data: BackendAnalyzeResponse = await res.json();
    return {
      title: data.title,
      category: data.category,
      summary: data.summary,
      keyPoints: data.key_points || [],
      contextualActions: data.contextual_actions || [],
      followUpQuestions: data.follow_up_questions || [],
      isWorthAnalyzing: data.is_worth_analyzing,
      imageHash: data.image_hash,
      alreadyAnalyzed: data.already_analyzed,
      isReviewed: false,
    };
  },

  /**
   * Execute tutorial, architecture breakdown, or Q&A via backend (/api/v1/actions/execute)
   */
  async executeAction(params: {
    actionOrQuestion: string;
    screenshotTitle: string;
    category?: string;
    summary?: string;
    keyPoints?: string[];
    customPrompt?: string;
    previousContext?: string;
  }): Promise<{ title: string; content: string; nextFollowUps: string[] }> {
    const url = `${this.baseUrl}/api/v1/actions/execute`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        action_or_question: params.actionOrQuestion,
        screenshot_title: params.screenshotTitle,
        category: params.category || 'general',
        summary: params.summary || '',
        key_points: params.keyPoints || [],
        custom_prompt: params.customPrompt,
        previous_context: params.previousContext,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Action execution error (${res.status}): ${err}`);
    }

    const data: BackendActionResponse = await res.json();
    return {
      title: data.title,
      content: data.content,
      nextFollowUps: data.next_follow_ups || [],
    };
  },

  /**
   * Screenshot Storage Sync endpoints
   */
  async getUserScreenshots(): Promise<ScreenshotAnalysis[]> {
    const url = `${this.baseUrl}/api/v1/screenshots`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch screenshots: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.map((item: any) => ({
      id: item.id,
      imageUri: item.image_uri || '',
      capturedAt: item.captured_at,
      title: item.title,
      category: item.category,
      summary: item.summary,
      keyPoints: item.key_points || [],
      contextualActions: item.contextual_actions || [],
      followUpQuestions: item.follow_up_questions || [],
      isWorthAnalyzing: item.is_worth_analyzing,
      imageHash: item.image_hash,
      assetId: item.asset_id,
      isReviewed: item.is_reviewed,
    }));
  },

  async saveScreenshot(item: ScreenshotAnalysis): Promise<void> {
    const url = `${this.baseUrl}/api/v1/screenshots`;
    const payload = {
      id: item.id,
      image_uri: item.imageUri,
      captured_at: item.capturedAt,
      title: item.title,
      category: item.category,
      summary: item.summary,
      key_points: item.keyPoints,
      contextual_actions: item.contextualActions,
      follow_up_questions: item.followUpQuestions,
      is_worth_analyzing: item.isWorthAnalyzing ?? true,
      image_hash: item.imageHash,
      asset_id: item.assetId,
      is_reviewed: item.isReviewed ?? false,
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`Failed saving screenshot to backend: HTTP ${res.status}`);
    }
  },

  async deleteScreenshot(id: string): Promise<void> {
    const url = `${this.baseUrl}/api/v1/screenshots/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      console.warn(`Failed deleting screenshot from backend: HTTP ${res.status}`);
    }
  },

  /**
   * User Profile endpoints
   */
  async getUserProfile(): Promise<UserProfile> {
    const url = `${this.baseUrl}/api/v1/user/profile`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch user profile: HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      name: data.name,
      email: data.email,
      role: data.role,
      company: data.company,
      avatarUri: data.avatar_uri,
      plan: data.plan,
      planName: data.plan_name,
      memberSince: data.member_since,
      totalCaptures: data.total_captures,
      totalTutorials: data.total_tutorials,
      accuracyRate: data.accuracy_rate,
      cloudSync: data.cloud_sync,
      biometricLock: data.biometric_lock,
      telemetryEnabled: data.telemetry_enabled,
      isRegistered: Boolean(data.is_registered === true),
    };
  },

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const url = `${this.baseUrl}/api/v1/user/profile`;
    const body: Record<string, unknown> = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.email !== undefined) body.email = updates.email;
    if (updates.role !== undefined) body.role = updates.role;
    if (updates.company !== undefined) body.company = updates.company;
    if (updates.avatarUri !== undefined) body.avatar_uri = updates.avatarUri;
    if (updates.plan !== undefined) body.plan = updates.plan;
    if (updates.planName !== undefined) body.plan_name = updates.planName;
    if (updates.cloudSync !== undefined) body.cloud_sync = updates.cloudSync;
    if (updates.biometricLock !== undefined) body.biometric_lock = updates.biometricLock;
    if (updates.telemetryEnabled !== undefined) body.telemetry_enabled = updates.telemetryEnabled;
    if (updates.isRegistered !== undefined) body.is_registered = updates.isRegistered;

    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Failed to update user profile: HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      name: data.name,
      email: data.email,
      role: data.role,
      company: data.company,
      avatarUri: data.avatar_uri,
      plan: data.plan,
      planName: data.plan_name,
      memberSince: data.member_since,
      totalCaptures: data.total_captures,
      totalTutorials: data.total_tutorials,
      accuracyRate: data.accuracy_rate,
      cloudSync: data.cloud_sync,
      biometricLock: data.biometric_lock,
      telemetryEnabled: data.telemetry_enabled,
      isRegistered: data.is_registered ?? true,
    };
  },

  /**
   * App Settings endpoints
   */
  async getAppSettings(): Promise<Partial<AppSettings>> {
    const url = `${this.baseUrl}/api/v1/user/settings`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch app settings: HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      autoAnalyzeScreenshots: data.auto_analyze_screenshots,
      enableNotifications: data.enable_notifications,
      dailyNudgeEnabled: data.daily_nudge_enabled,
      dailyNudgeHour: data.daily_nudge_hour,
      dailyNudgeMinute: data.daily_nudge_minute,
      smartCategorizationEnabled: data.smart_categorization_enabled,
      preferredDetailLevel: data.preferred_detail_level,
      customPromptInstruction: data.custom_prompt_instruction,
      themeMode: data.theme_mode,
      promptPastScreenshotsEnabled: data.prompt_past_screenshots_enabled,
    };
  },

  async updateAppSettings(updates: Partial<AppSettings>): Promise<Partial<AppSettings>> {
    const url = `${this.baseUrl}/api/v1/user/settings`;
    const body: Record<string, unknown> = {};
    if (updates.autoAnalyzeScreenshots !== undefined) body.auto_analyze_screenshots = updates.autoAnalyzeScreenshots;
    if (updates.enableNotifications !== undefined) body.enable_notifications = updates.enableNotifications;
    if (updates.dailyNudgeEnabled !== undefined) body.daily_nudge_enabled = updates.dailyNudgeEnabled;
    if (updates.dailyNudgeHour !== undefined) body.daily_nudge_hour = updates.dailyNudgeHour;
    if (updates.dailyNudgeMinute !== undefined) body.daily_nudge_minute = updates.dailyNudgeMinute;
    if (updates.smartCategorizationEnabled !== undefined) body.smart_categorization_enabled = updates.smartCategorizationEnabled;
    if (updates.preferredDetailLevel !== undefined) body.preferred_detail_level = updates.preferredDetailLevel;
    if (updates.customPromptInstruction !== undefined) body.custom_prompt_instruction = updates.customPromptInstruction;
    if (updates.themeMode !== undefined) body.theme_mode = updates.themeMode;
    if (updates.promptPastScreenshotsEnabled !== undefined) body.prompt_past_screenshots_enabled = updates.promptPastScreenshotsEnabled;

    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Failed to update app settings: HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      autoAnalyzeScreenshots: data.auto_analyze_screenshots,
      enableNotifications: data.enable_notifications,
      dailyNudgeEnabled: data.daily_nudge_enabled,
      dailyNudgeHour: data.daily_nudge_hour,
      dailyNudgeMinute: data.daily_nudge_minute,
      smartCategorizationEnabled: data.smart_categorization_enabled,
      preferredDetailLevel: data.preferred_detail_level,
      customPromptInstruction: data.custom_prompt_instruction,
      themeMode: data.theme_mode,
      promptPastScreenshotsEnabled: data.prompt_past_screenshots_enabled,
    };
  },


  /**
   * Passwordless Auth endpoints
   */
  async requestOtp(email: string): Promise<{ success: boolean; message: string }> {
    const url = `${this.baseUrl}/api/v1/auth/request-otp`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to request OTP (${res.status}): ${err}`);
    }
    return res.json();
  },

  async verifyOtp(email: string, code: string): Promise<BackendAuthResponse> {
    const url = `${this.baseUrl}/api/v1/auth/verify-otp`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Invalid authentication code: ${err}`);
    }
    const rawData = await res.json();
    const u = rawData.user || {};
    if (rawData.token) {
      this.setAuthToken(rawData.token);
    }
    const isNewUser = Boolean(rawData.is_new_user);
    const isRegistered = !isNewUser && Boolean(u.is_registered === true);
    return {
      success: rawData.success,
      token: rawData.token,
      is_new_user: isNewUser,
      user: {
        name: u.name,
        email: u.email,
        role: u.role,
        company: u.company,
        avatarUri: u.avatar_uri,
        plan: u.plan,
        planName: u.plan_name,
        memberSince: u.member_since,
        totalCaptures: u.total_captures,
        totalTutorials: u.total_tutorials,
        accuracyRate: u.accuracy_rate,
        cloudSync: u.cloud_sync,
        biometricLock: u.biometric_lock,
        telemetryEnabled: u.telemetry_enabled,
        isRegistered,
      },
    };
  },

  async getMe(): Promise<UserProfile> {
    const url = `${this.baseUrl}/api/v1/auth/me`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch current user session: HTTP ${res.status}`);
    }
    const data = await res.json();
    const u = data.user;
    return {
      name: u.name,
      email: u.email,
      role: u.role,
      company: u.company,
      avatarUri: u.avatar_uri,
      plan: u.plan,
      planName: u.plan_name,
      memberSince: u.member_since,
      totalCaptures: u.total_captures,
      totalTutorials: u.total_tutorials,
      accuracyRate: u.accuracy_rate,
      cloudSync: u.cloud_sync,
      biometricLock: u.biometric_lock,
      telemetryEnabled: u.telemetry_enabled,
    };
  },

  async biometricLogin(email: string): Promise<BackendAuthResponse> {
    const url = `${this.baseUrl}/api/v1/auth/biometric-login`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Biometric login failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    const u = data.user;
    if (data.token) {
      this.setAuthToken(data.token);
    }
    return {
      success: data.success,
      token: data.token,
      user: {
        name: u.name,
        email: u.email,
        role: u.role,
        company: u.company,
        avatarUri: u.avatar_uri,
        plan: u.plan,
        planName: u.plan_name,
        memberSince: u.member_since,
        totalCaptures: u.total_captures,
        totalTutorials: u.total_tutorials,
        accuracyRate: u.accuracy_rate,
        cloudSync: u.cloud_sync,
        biometricLock: u.biometric_lock,
        telemetryEnabled: u.telemetry_enabled,
        isRegistered: Boolean(u.is_registered === true),
      },
    };
  },

  async logout(): Promise<void> {
    try {
      const url = `${this.baseUrl}/api/v1/auth/logout`;
      await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch (e) {
      console.warn('Backend logout call failed:', e);
    } finally {
      this.setAuthToken(null);
    }
  },

  /**
   * Forwards a screenshot, prompt, and analysis into a connected live Web Dashboard session
   */
  async forwardScreenshotSession(payload: {
    screenshotId: string;
    title: string;
    category?: string;
    summary?: string;
    keyPoints?: string[];
    contextualActions?: any[];
    followUpQuestions?: string[];
    generatedContent?: any[];
    imageBase64?: string;
    imageUrl?: string;
    initialPrompt?: string;
  }): Promise<ForwardSessionResult> {
    const url = `${this.baseUrl}/api/v1/sessions/forward`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        screenshot_id: payload.screenshotId,
        title: payload.title,
        category: payload.category || 'general',
        summary: payload.summary || '',
        key_points: payload.keyPoints || [],
        contextual_actions: payload.contextualActions || [],
        follow_up_questions: payload.followUpQuestions || [],
        generated_content: payload.generatedContent || [],
        image_base64: payload.imageBase64,
        image_url: payload.imageUrl,
        initial_prompt: payload.initialPrompt,
        client_platform: Platform.OS,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Forwarding session failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      sessionId: data.session_id,
      dashboardUrl: data.dashboard_url,
      createdAt: data.created_at,
      status: data.status,
      message: data.message,
    };
  },
};

