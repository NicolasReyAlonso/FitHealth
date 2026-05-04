import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

export interface ClosureOverlayProps {
  visible: boolean;
  title: string; // ej: "¡Rutina creada!"
  details?: string; // ej: "Cardio para lunes y miércoles"
  duration?: number; // ms antes de auto-cerrar
  onDismiss: () => void;
  colorScheme: 'light' | 'dark';
}

export function ClosureOverlay({
  visible,
  title,
  details,
  duration = 2500,
  onDismiss,
  colorScheme,
}: ClosureOverlayProps) {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss();
        });
      }, duration);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, duration, onDismiss, scaleAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.success,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}>
        {/* Checkmark */}
        <View style={styles.checkmarkContainer}>
          <Text style={styles.checkmark}>✓</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: '#fff' }]}>{title}</Text>

        {/* Details */}
        {details && (
          <Text style={[styles.details, { color: 'rgba(255,255,255,0.9)' }]}>
            {details}
          </Text>
        )}

        {/* Hint */}
        <Text style={[styles.hint, { color: 'rgba(255,255,255,0.7)' }]}>
          Se cerrará en breve...
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  container: {
    borderRadius: 24,
    paddingHorizontal: 40,
    paddingVertical: 40,
    alignItems: 'center',
    minWidth: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  checkmarkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmark: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  details: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
