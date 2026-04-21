import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAuth } from '@/context/auth-context';
import api from '@/services/api';

const NotificationContext = createContext<any>(null);

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const opacity = new Animated.Value(0);

  useEffect(() => {
    if (!user) return;

    let wsUrl = api.defaults.baseURL?.replace('http', 'ws');
    if (wsUrl?.endsWith('/')) {
      wsUrl = wsUrl.slice(0, -1);
    }
    const ws = new WebSocket(`${wsUrl}/notifications/ws/${user.id}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.message) {
        showNotification(data.message, data.type);
      }
    };

    return () => {
      ws.close();
    };
  }, [user]);

  const showNotification = (message: string, type: string) => {
    setNotification({ message, type });
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start(() => setNotification(null));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <Animated.View style={[styles.notification, { opacity }]}>
          <Text style={styles.text}>{notification.message}</Text>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  notification: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#1565C0',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center'
  }
});