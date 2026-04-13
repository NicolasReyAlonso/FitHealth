import { t } from 'i18next';
import { useThemeColor } from './use-theme-color';

export function useColors() {
  return {
    background: useThemeColor({}, 'background'),
    text: useThemeColor({}, 'text'),
    tint: useThemeColor({}, 'tint'),
    icon: useThemeColor({}, 'icon'),
    tabIconDefault: useThemeColor({}, 'tabIconDefault'),
    tabIconSelected: useThemeColor({}, 'tabIconSelected'),
    primary: useThemeColor({}, 'primary'),
    primaryLight: useThemeColor({}, 'primaryLight'),
    secondary: useThemeColor({}, 'secondary'),
    secondaryLight: useThemeColor({}, 'secondaryLight'),
    card: useThemeColor({}, 'card'),
    border: useThemeColor({}, 'border'),
    edit: useThemeColor({}, 'edit'),
  };
}