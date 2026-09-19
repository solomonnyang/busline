import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

export interface ThemeColors {
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  ink: string;
  text: string;
  muted: string;
  mutedLight: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  border: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  coralSoft: string;
  gold: string;
  goldSoft: string;
  windowTint: string;
  accentBlue: string;
  accentPink: string;
  accentPurple: string;
  teal: string;
  tealSoft: string;
  booked: string;
  white: string;
}

export const lightColors: ThemeColors = {
  primary: '#000000',
  primaryDeep: '#262626',
  primarySoft: '#F5F5F5',
  ink: '#111111',
  text: '#111111',
  muted: '#6B6B6B',
  mutedLight: '#9A9A9A',
  surface: '#ffffff',
  surfaceAlt: '#F7F7F7',
  surfaceElevated: '#ffffff',
  border: '#E5E5E5',
  success: '#2E9E5B',
  successSoft: '#E7F5EC',
  danger: '#D64545',
  dangerSoft: '#FBECEC',
  warning: '#C7792B',
  warningSoft: '#FAF0E0',
  coralSoft: '#FFF3C4',
  gold: '#E89A2B',
  goldSoft: '#FBF0DC',
  windowTint: '#E5E5E5',
  accentBlue: '#3B82F6',
  accentPink: '#E8598C',
  accentPurple: '#7C6BE0',
  teal: '#F59E0B',
  tealSoft: '#FDF1DE',
  booked: '#F5F5F5',
  white: '#ffffff',
};

export const darkColors: ThemeColors = {
  primary: '#ffffff',
  primaryDeep: '#E5E5E5',
  primarySoft: '#2A2A2A',
  ink: '#0D0D0D',
  text: '#F2F2F2',
  muted: '#9A9A9A',
  mutedLight: '#6B6B6B',
  surface: '#1A1A1A',
  surfaceAlt: '#141414',
  surfaceElevated: '#222222',
  border: '#2E2E2E',
  success: '#3CB371',
  successSoft: '#13281C',
  danger: '#E05555',
  dangerSoft: '#2E1717',
  warning: '#DB9A45',
  warningSoft: '#2B2116',
  coralSoft: '#332A14',
  gold: '#F0B24A',
  goldSoft: '#33291A',
  windowTint: '#1C1C1C',
  accentBlue: '#60A5FA',
  accentPink: '#F48FB1',
  accentPurple: '#9A8CE6',
  teal: '#FBBF24',
  tealSoft: '#33291A',
  booked: '#242424',
  white: '#ffffff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
};

export const shadow = {
  sm: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 6,
  },
};

export const font = {
  bold: '800',
  semibold: '600',
  medium: '500',
  regular: '400',
} as const;

export type ThemeMode = 'light' | 'dark';

export const THEME_KEY = 'busline.settings.theme';

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === 'light' || stored === 'dark') {
          setModeState(stored);
        }
      })
      .catch(() => {
        // ignore storage failures
      });
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {
      // ignore storage failures
    });
  }, []);

  const isDark = mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(() => ({ colors, mode, isDark, setMode }), [colors, mode, isDark, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T,
): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
