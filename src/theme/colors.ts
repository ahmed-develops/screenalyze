export const DarkColors = {
  background: '#090D16',
  surface: '#111827',
  surfaceSubtle: '#1F2937',
  surfaceBorder: '#374151',
  card: '#131B2E',
  cardBorder: 'rgba(99, 102, 241, 0.25)',

  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  primaryGlow: 'rgba(99, 102, 241, 0.25)',

  accent: '#06B6D4', // Cyan
  accentGlow: 'rgba(6, 182, 212, 0.2)',

  success: '#10B981', // Emerald
  successGlow: 'rgba(16, 185, 129, 0.2)',

  warning: '#F59E0B', // Amber
  danger: '#EF4444',

  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#090D16',

  border: '#2A3447',
  borderHighlight: '#4F46E5',

  badgeBg: 'rgba(99, 102, 241, 0.15)',
  badgeText: '#A5B4FC',
};

export const LightColors = {
  background: '#F6F8FC',
  surface: '#FFFFFF',
  surfaceSubtle: '#EDF2F7',
  surfaceBorder: '#E2E8F0',
  card: '#FFFFFF',
  cardBorder: 'rgba(99, 102, 241, 0.18)',

  primary: '#4F46E5', // High contrast vibrant Indigo
  primaryLight: '#6366F1',
  primaryDark: '#3730A3',
  primaryGlow: 'rgba(79, 70, 229, 0.15)',

  accent: '#0284C7', // Cyan / Sky
  accentGlow: 'rgba(2, 132, 199, 0.15)',

  success: '#059669', // Emerald
  successGlow: 'rgba(5, 150, 105, 0.15)',

  warning: '#D97706', // Amber
  danger: '#DC2626',

  textPrimary: '#0F172A', // Deep slate / charcoal
  textSecondary: '#475569', // Muted slate
  textMuted: '#94A3B8', // Light slate
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  borderHighlight: '#4F46E5',

  badgeBg: 'rgba(99, 102, 241, 0.1)',
  badgeText: '#4F46E5',
};

export type ColorPalette = typeof DarkColors;

export const Colors: ColorPalette = { ...DarkColors };

export function setGlobalThemeColors(isDark: boolean): ColorPalette {
  const target = isDark ? DarkColors : LightColors;
  Object.assign(Colors, target);
  return Colors;
}
