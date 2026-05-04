import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { View } from 'react-native';

type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  }, [removeToast]);

  const value = useMemo<ToastContextType>(() => ({
    showToast,
    success: (message: string) => showToast(message, 'success'),
    error: (message: string) => showToast(message, 'error'),
    warning: (message: string) => showToast(message, 'warning'),
    info: (message: string) => showToast(message, 'info'),
  }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    } as ToastContextType;
  }
  return context;
}
import React, { createContext, useContext, useCallback, useState } from 'react';
import { View } from 'react-native';
import { Toast, ToastType } from '@/components/toast';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const colorScheme = useColorScheme() ?? 'light';

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3000) => {
      const id = Date.now().toString();
      const newToast: ToastMessage = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after duration (handled by Toast component)
      setTimeout(() => {
        dismissToast(id);
      }, duration + 300); // Add 300ms for fade-out animation
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => showToast(message, 'success', duration),
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => showToast(message, 'error', duration),
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => showToast(message, 'warning', duration),
    [showToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => showToast(message, 'info', duration),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <View
        style={{
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            colorScheme={colorScheme}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
import React, { createContext, useContext, useCallback, useState } from 'react';
import { View } from 'react-native';
import { Toast, ToastType } from '@/components/toast';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const colorScheme = useColorScheme() ?? 'light';

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3000) => {
      const id = Date.now().toString();
      const newToast: ToastMessage = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after duration (handled by Toast component)
      setTimeout(() => {
        dismissToast(id);
      }, duration + 300); // Add 300ms for fade-out animation
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => showToast(message, 'success', duration),
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => showToast(message, 'error', duration),
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => showToast(message, 'warning', duration),
    [showToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => showToast(message, 'info', duration),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <View
        style={{
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            colorScheme={colorScheme}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
