import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useAuth } from '@/context/auth-context';
import api, { WS_BASE_URL } from '@/services/api';

const NotificationContext = createContext<any>(null);

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-50)).current;
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const activeRoomIdRef = useRef<number | null>(null);

  // Mantener actualizado el ref para usarlo dentro del onmessage del WebSocket
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    // Solicitar permiso de notificaciones nativas en la web
    if (Platform.OS === 'web' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      let wsUrl = WS_BASE_URL;
      if (wsUrl?.endsWith('/')) {
        wsUrl = wsUrl.slice(0, -1);
      }
      
      ws = new WebSocket(`${wsUrl}/notifications/ws/${user.id}`);

      ws.onopen = () => {
        console.log('✅ Conectado a notificaciones WebSocket');
      };

      ws.onmessage = (event) => {
        console.log('🔔 Notificación recibida:', event.data);
        try {
          const data = JSON.parse(event.data);
          if (data.message) {
            // No mostrar la notificación de chat si ya estamos dentro de esa sala
            if (data.type === 'new_message' && data.room_id && data.room_id === activeRoomIdRef.current) {
              console.log('🔇 Notificación silenciada (estás en la misma sala de chat)');
              return;
            }

            showNotification(data.message, data.type);
            
            // Disparar la notificación del navegador en Web
            if (Platform.OS === 'web' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('FitHealth', { body: data.message });
            }
          }
        } catch (err) {
          console.error('Error parseando notificación:', err);
        }
      };

      ws.onerror = (e) => {
        console.error('❌ Error en WebSocket de notificaciones', e);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket cerrado. Intentando reconectar...');
        if (isMounted) {
          reconnectTimeout = setTimeout(() => {
            connectWebSocket();
          }, 3000); // Reintentar a los 3 segundos
        }
      };
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (ws) {
        // Prevenir loop de reconexión intencional en cleanup
        ws.onclose = null;
        console.log('🔌 Desconectando socket de notificaciones (Cleanup)');
        ws.close();
      }
    };
  }, [user]);

  const showNotification = (message: string, type: string) => {
    setNotification({ message, type });
    
    // Resetear valores de animación de ref antes de empezar
    opacity.setValue(0);
    translateY.setValue(-50);
    
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: false }),
        Animated.timing(translateY, { toValue: 0, duration: 350, useNativeDriver: false })
      ]),
      Animated.delay(4000),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: false }),
        Animated.timing(translateY, { toValue: -50, duration: 250, useNativeDriver: false })
      ])
    ]).start(() => {
      setNotification(null);
    });
  };

  return (
    <NotificationContext.Provider value={{ showNotification, activeRoomId, setActiveRoomId }}>
      {children}
      {notification && (
        <Animated.View style={[styles.notification, { opacity, transform: [{ translateY }] }]}>
          <Text style={styles.text}>{notification.message}</Text>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  notification: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
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
    zIndex: 9999,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center'
  }
});