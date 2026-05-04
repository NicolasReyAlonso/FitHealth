import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastConfig {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onDismiss?: () => void;
}

interface ToastProps extends ToastConfig {
  colorScheme: 'light' | 'dark';
}

export function Toast({ id, message, type, duration = 3000, onDismiss, colorScheme }: ToastProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const colors = Colors[colorScheme];

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onDismiss?.();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss, fadeAnim]);

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return { icon: '✅', bgColor: colors.success, textColor: '#fff' };
      case 'error':
        return { icon: '❌', bgColor: colors.danger, textColor: '#fff' };
      case 'warning':
        return { icon: '⚠️', bgColor: colors.warning, textColor: '#000' };
      case 'info':
      default:
        return { icon: 'ℹ️', bgColor: colors.primary, textColor: '#fff' };
    }
  };

  const { icon, bgColor, textColor } = getTypeConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          backgroundColor: bgColor,
        },
      ]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: 12,
  },
  icon: {
    fontSize: 18,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});
