export interface ContextualAction {
  id: string;
  label: string;
  badge: string;
  type: 'tutorial' | 'explanation' | 'diagram' | 'code' | 'custom';
}

export interface GeneratedArtifact {
  id?: string;
  type: 'tutorial' | 'explanation' | 'diagram' | 'code' | 'custom' | 'share' | 'question_answer';
  title: string;
  content: string;
  timestamp: number;
  customPrompt?: string;
  prompt?: string;
  nextFollowUps?: string[];
}

export type ScreenshotCategory =
  | 'linkedin-post'
  | 'social-post'
  | 'article'
  | 'code'
  | 'architecture'
  | 'system-design'
  | 'tutorial'
  | 'document'
  | 'ui-design'
  | 'receipt'
  | 'chat'
  | 'personal-photo'
  | 'meme'
  | 'other';

export const INAPPROPRIATE_CATEGORIES: ReadonlySet<string> = new Set([
  'personal-photo',
  'meme',
  'other',
]);

export const ACTIONABLE_CATEGORIES: ReadonlySet<string> = new Set([
  'linkedin-post',
  'social-post',
  'article',
  'code',
  'architecture',
  'system-design',
  'tutorial',
  'document',
  'ui-design',
  'receipt',
  'chat',
  'youtube-tutorial',
]);

export function isAppropriateCategory(category?: string | null): boolean {
  if (!category) return false;
  const normalized = category.toLowerCase().trim();
  if (INAPPROPRIATE_CATEGORIES.has(normalized)) return false;
  return ACTIONABLE_CATEGORIES.has(normalized);
}

export function isAppropriateScreenshot(
  item: { isWorthAnalyzing?: boolean; category?: string } | null | undefined
): boolean {
  if (!item) return false;
  if (item.isWorthAnalyzing === false) return false;
  if (item.category && !isAppropriateCategory(item.category)) return false;
  return true;
}


export interface ScreenshotCategorization {
  isWorthAnalyzing: boolean;
  category: ScreenshotCategory;
  confidence: number;
  reason: string;
  imageHash?: string;
  cached?: boolean;
}

export interface ScreenshotAnalysis {
  id: string;
  imageUri: string;
  capturedAt: number;
  title: string;
  category: string;
  summary: string;
  keyPoints: string[];
  contextualActions: ContextualAction[];
  followUpQuestions: string[];
  isReviewed?: boolean;
  isWorthAnalyzing?: boolean;
  skipReason?: string;
  suggestedActions?: string[];
  generatedContent?: GeneratedArtifact[];
  assetId?: string;       // Device camera roll / media library asset ID
  imageHash?: string;     // SHA-256 fingerprint of the image content
  alreadyAnalyzed?: boolean; // True if served from deduplication cache
}

export type ActionOptionId =
  | 'create_tutorial'
  | 'explain_tutorial'
  | 'share_tutorial'
  | 'extract_diagram'
  | 'custom';

export interface ActionOption {
  id: ActionOptionId;
  label: string;
  icon: string;
  description: string;
}

export type ThemeMode = 'system' | 'dark' | 'light';

export interface AppSettings {
  openaiApiKey: string;
  autoAnalyzeScreenshots: boolean;
  enableNotifications: boolean;
  reminderIntervalMinutes?: number;
  dailyNudgeEnabled?: boolean;
  dailyNudgeHour?: number;
  dailyNudgeMinute?: number;
  smartCategorizationEnabled?: boolean;
  preferredDetailLevel: 'concise' | 'detailed' | 'comprehensive';
  customPromptInstruction: string;
  themeMode?: ThemeMode;
  promptPastScreenshotsEnabled?: boolean;
}


export interface UserProfile {
  name: string;
  email: string;
  role: string;
  company: string;
  avatarUri: string;
  plan: 'free' | 'pro' | 'enterprise';
  planName: string;
  memberSince: string;
  totalCaptures: number;
  totalTutorials: number;
  accuracyRate: string;
  cloudSync: boolean;
  biometricLock: boolean;
  telemetryEnabled: boolean;
  isRegistered?: boolean;
}

export interface BatchAnalysisItemResult {
  id: string;
  uri: string;
  timestamp?: number;
  status: 'analyzed' | 'skipped' | 'already_analyzed' | 'failed';
  title?: string;
  category?: string;
  reason?: string;
  analysis?: ScreenshotAnalysis;
}

export interface BatchAnalysisSummary {
  total: number;
  analyzedCount: number;
  skippedCount: number;
  items: BatchAnalysisItemResult[];
  completedAt: number;
}


