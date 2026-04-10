import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import api from '@/services/api';
import { WS_BASE_URL } from '@/services/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth-context';

type ChatRoom = {
  id: number;
  doctor_id: number;
  patient_id: number;
  doctor_username: string;
  patient_username: string;
};

type Message = {
  id: number;
  sender_id: number;
  content: string;
  timestamp: string;
  is_read: boolean;
};

export default function ChatScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, token } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [doctors, setDoctors] = useState<{ id: number; username: string }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/chat/rooms');
      setRooms(res.data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las conversaciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/chat/doctors');
      setDoctors(res.data);
    } catch {
      // ignore
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRooms();
      if (user?.role === 'patient') fetchDoctors();
    }, [])
  );

  // Connect / disconnect WebSocket when selectedRoom changes
  useEffect(() => {
    if (!selectedRoom || !token) return;

    const ws = new WebSocket(`${WS_BASE_URL}/chat/ws/${selectedRoom.id}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg: Message = JSON.parse(event.data);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    ws.onerror = () => {
      // Silent — fallback to REST still works
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [selectedRoom, token]);

  const openRoom = async (room: ChatRoom) => {
    setSelectedRoom(room);
    try {
      const res = await api.get(`/chat/rooms/${room.id}/messages`);
      setMessages(res.data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return;
    const content = newMessage.trim();
    setNewMessage('');

    // Send via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ content }));
    } else {
      // Fallback to REST
      try {
        const res = await api.post(`/chat/rooms/${selectedRoom.id}/messages`, { content });
        setMessages((prev) => [...prev, res.data]);
      } catch {
        Alert.alert('Error', 'No se pudo enviar el mensaje');
      }
    }
  };

  const startChat = async (doctorId: number) => {
    try {
      const res = await api.post(`/chat/rooms/${doctorId}`);
      await fetchRooms();
      openRoom(res.data);
    } catch {
      Alert.alert('Error', 'No se pudo crear la conversación');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Chat conversation view
  if (selectedRoom) {
    const otherName =
      user?.id === selectedRoom.doctor_id
        ? selectedRoom.patient_username
        : selectedRoom.doctor_username;

    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={[styles.chatHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSelectedRoom(null)}>
            <Text style={[styles.backBtn, { color: colors.primary }]}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={[styles.chatTitle, { color: colors.text }]}>{otherName}</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.sender_id === user?.id;
            return (
              <View
                style={[
                  styles.messageBubble,
                  isMe
                    ? { backgroundColor: colors.primary, alignSelf: 'flex-end' }
                    : { backgroundColor: colors.card, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.text }]}>
                  {item.content}
                </Text>
                <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.icon }]}>
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.messageInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.icon}
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={sendMessage}>
            <Text style={styles.sendBtnText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Room list view
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.accent }]}>
        <View>
          <Text style={styles.title}>💬 Chat</Text>
          <Text style={styles.subtitle}>Comunícate con tu doctor</Text>
        </View>
      </View>

      {user?.role === 'patient' && doctors.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Doctores disponibles</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.doctorList}>
            {doctors.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.doctorCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                onPress={() => startChat(d.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.doctorName, { color: colors.primary }]}>🩺</Text>
                <Text style={[styles.doctorNameText, { color: colors.primary }]}>{d.username.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {rooms.length === 0 ? (
          <Text style={[styles.empty, { color: colors.icon }]}>
            No tienes conversaciones aún.
          </Text>
        ) : (
          rooms.map((r) => {
            const otherName =
              user?.id === r.doctor_id ? r.patient_username : r.doctor_username;
            const roleLabel = user?.id === r.doctor_id ? '👤 Paciente' : '🩺 Doctor';
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.roomCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openRoom(r)}
                activeOpacity={0.7}
              >
                <View style={[styles.roomAvatar, { backgroundColor: colors.primaryLight }]}>
                  <Text>{user?.id === r.doctor_id ? '👤' : '🩺'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roomName, { color: colors.text }]}>{otherName}</Text>
                  <Text style={[styles.roomRole, { color: colors.icon }]}>{roleLabel}</Text>
                </View>
                <Text style={[styles.roomArrow, { color: colors.primary }]}>›</Text>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: { 
    paddingHorizontal: 24, 
    paddingVertical: 32,
    paddingTop: 40,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  subtitle: { 
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  section: { 
    paddingHorizontal: 20, 
    marginBottom: 20 
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  doctorList: { 
    gap: 12,
    paddingRight: 20,
  },
  doctorCard: { 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1.5,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  doctorName: { 
    fontWeight: '700', 
    fontSize: 24,
    marginBottom: 8,
  },
  doctorNameText: {
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  list: { 
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  empty: { 
    textAlign: 'center', 
    marginTop: 60, 
    fontSize: 16,
    fontWeight: '500',
  },
  roomCard: { 
    borderRadius: 16, 
    padding: 18, 
    marginBottom: 12, 
    borderWidth: 1, 
    flexDirection: 'row', 
    justifyContent: 'flex-start', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  roomAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    fontSize: 28,
  },
  roomName: { 
    fontSize: 16, 
    fontWeight: '700' 
  },
  roomRole: { 
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  roomArrow: {
    fontSize: 28,
    fontWeight: '700',
  },
  // Chat view
  chatHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16, 
    paddingTop: 12, 
    paddingHorizontal: 20, 
    paddingBottom: 14, 
    borderBottomWidth: 1 
  },
  backBtn: { 
    fontSize: 16, 
    fontWeight: '700' 
  },
  chatTitle: { 
    fontSize: 18, 
    fontWeight: '700',
    flex: 1,
  },
  messageList: { 
    padding: 16, 
    gap: 12 
  },
  messageBubble: { 
    maxWidth: '80%', 
    borderRadius: 18, 
    padding: 14, 
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: { 
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: { 
    fontSize: 11, 
    marginTop: 6, 
    textAlign: 'right',
    fontWeight: '500',
  },
  inputBar: { 
    flexDirection: 'row', 
    padding: 14, 
    gap: 10, 
    borderTopWidth: 1 
  },
  messageInput: { 
    flex: 1, 
    borderWidth: 1, 
    borderRadius: 24, 
    paddingHorizontal: 18, 
    paddingVertical: 12, 
    fontSize: 15,
    fontWeight: '500',
  },
  sendBtn: { 
    borderRadius: 24, 
    paddingHorizontal: 24, 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnText: { 
    color: '#fff', 
    fontWeight: '700' 
  },
});
