import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
  colorScheme: 'light' | 'dark';
}

export function UndoToast({
  message,
  onUndo,
  onDismiss,
  duration = 5000,
  colorScheme,
}: UndoToastProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const colors = Colors[colorScheme];
  const [isActive, setIsActive] = React.useState(true);

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      if (!isActive) return;
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onDismiss();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss, fadeAnim, isActive]);

  const handleUndo = () => {
    setIsActive(false);
    onUndo();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          backgroundColor: colors.warning,
        },
      ]}>
      <Text style={[styles.message, { color: '#000' }]}>{message}</Text>
      <TouchableOpacity onPress={handleUndo} activeOpacity={0.7}>
        <Text style={styles.undoButton}>↶ Deshacer</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  undoButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
    marginLeft: 12,
  },
});
