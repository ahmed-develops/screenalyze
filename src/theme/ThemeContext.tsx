import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { DarkColors, LightColors, ColorPalette, setGlobalThemeColors } from './colors';
import { StorageService } from '../services/storageService';
import { ThemeMode } from '../types';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  isDark: true,
  colors: DarkColors,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const AppThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  // Load saved preference on mount
  useEffect(() => {
    let isSubscribed = true;
    StorageService.getThemeMode().then((mode) => {
      if (isSubscribed) {
        setThemeModeState(mode);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Compute resolved isDark
  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    // 'system' mode:
    return systemScheme !== 'light';
  }, [themeMode, systemScheme]);

  // Keep global Colors object in sync
  useEffect(() => {
    setGlobalThemeColors(isDark);
  }, [isDark]);

  const colors = useMemo(() => {
    return isDark ? DarkColors : LightColors;
  }, [isDark]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await StorageService.saveThemeMode(mode);
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    await setThemeMode(nextMode);
  }, [isDark, setThemeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      colors,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, isDark, colors, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
