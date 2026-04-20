/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#6366F1';
const tintColorDark = '#818CF8';

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#64748B',
    tabIconDefault: '#CBD5E1',
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    primary: '#6366F1',
    primaryLight: '#EEF2FF',
    secondary: '#EC4899',
    secondaryLight: '#FCE7F3',
    border: '#E2E8F0',
    accent: '#F59E0B',
    accentLight: '#FEF3C7',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
  },
  dark: {
    text: '#F1F5F9',
    background: '#0F172A',
    tint: tintColorDark,
    icon: '#94A3B8',
    tabIconDefault: '#475569',
    tabIconSelected: tintColorDark,
    card: '#1E293B',
    primary: '#818CF8',
    primaryLight: '#312E81',
    secondary: '#F472B6',
    secondaryLight: '#831843',
    border: '#334155',
    accent: '#FBBF24',
    accentLight: '#78350F',
    success: '#34D399',
    danger: '#F87171',
    warning: '#FBBF24',
    gray50: '#1E293B',
    gray100: '#0F172A',
    gray200: '#1E293B',
    gray300: '#334155',
  },
};

/**
 * Font definitions - Using only system fonts to avoid any external font loading
 * This prevents FontFaceObserver timeouts and web load issues
 */
export const Fonts = {
  sans: 'system-ui, -apple-system, sans-serif',
  serif: 'Georgia, serif',
  mono: 'monospace',
};
