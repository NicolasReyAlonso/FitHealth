/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';
import { blue } from 'react-native-reanimated/lib/typescript/Colors';

const tintColorLight = '#1565C0';
const tintColorDark = '#81D4FA';

export const Colors = {
  light: {
    text: '#1B5E20',
    background: '#E8F5E9',
    tint: tintColorLight,
    icon: '#388E3C',
    tabIconDefault: '#8E9AAF',
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    primary: '#1565C0',
    primaryLight: '#E3F2FD',
    secondary: '#2E7D32',
    secondaryLight: '#C8E6C9',
    border: '#C8E6C9',
    edit: '#2563eb'
  },
  dark: {
    text: '#E8F5E9',
    background: '#0D1B0E',
    tint: tintColorDark,
    icon: '#81C784',
    tabIconDefault: '#607D8B',
    tabIconSelected: tintColorDark,
    card: '#1B2E1C',
    primary: '#42A5F5',
    primaryLight: '#0D47A1',
    secondary: '#66BB6A',
    secondaryLight: '#1B5E20',
    border: '#2E7D32',
    edit: '#2563eb'
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
