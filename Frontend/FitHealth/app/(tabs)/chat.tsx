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
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import { WS_BASE_URL } from '@/services/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notification-context';

type ChatRoom = {
  id: number;
  doctor_id: number;
  patient_id: number;
  doctor_username: string;
  patient_username: string;
  doctor_profile_picture?: string;
  patient_profile_picture?: string;
};

type Message = {
  id: number;
  sender_id: number;
  content: string;
  timestamp: string;
  is_read: boolean;
  type?: string;
  report_data?: any;
};

export default function ChatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, token } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [doctors, setDoctors] = useState<{ id: number; username: string; profile_picture?: string }[]>([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [routines, setRoutines] = useState<any[]>([]);
  const [loadingRoutines, setLoadingRoutines] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const { setActiveRoomId, lastEvent, showNotification } = useNotifications();

  const fetchRooms = async () => {
    try {
      const res = await api.get('/chat/rooms');
      setRooms(res.data);
    } catch {
      Alert.alert('Error', t('errors.load_messages'));
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersToChat = async () => {
    if (!user) return;
    try {
      const endpoint = user.role === 'patient' ? '/relationships/patient/doctors' : '/relationships/doctor/patients';
      const res = await api.get(endpoint);
      setDoctors(res.data); // doctors maps to relation profiles
    } catch {
      // ignore
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRooms();
      fetchUsersToChat();
    }, [user?.role])
  );

  // Reference to manually hold the active room when interpreting global events
  const currentRoomRef = useRef<ChatRoom | null>(null);
  useEffect(() => {
    currentRoomRef.current = selectedRoom;
  }, [selectedRoom]);

  // Escucha de eventos WebSocket globales para recargar listas y manejar eliminación de chats en tiempo real
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'chat_deleted') {
      const deletedRoomId = lastEvent.data.room_id;
      // Si el chat borrado es el que tenemos abierto
      if (currentRoomRef.current?.id === deletedRoomId) {
        setSelectedRoom(null);
        if (Platform.OS === 'web') {
          window.alert(lastEvent.data.message || 'El otro usuario ha borrado este chat.');
        } else {
          Alert.alert('Chat eliminado', lastEvent.data.message || 'El otro usuario ha borrado este chat.');
        }
      }
      fetchRooms();
    } 
    else if (lastEvent.type === 'contact_accepted' || lastEvent.type === 'contact_deleted') {
      fetchUsersToChat();
      fetchRooms();
    }
    else if (lastEvent.type === 'new_message') {
      fetchRooms();
    }
  }, [lastEvent]);

  // Connect / disconnect WebSocket when selectedRoom changes
  useEffect(() => {
    setActiveRoomId(selectedRoom?.id || null);

    if (!selectedRoom || !token) {
      if (!selectedRoom) setActiveRoomId(null);
      return;
    }

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
      setActiveRoomId(null);
    };
  }, [selectedRoom, token, setActiveRoomId]);

  const openRoom = async (room: ChatRoom) => {
    setSelectedRoom(room);
    try {
      const res = await api.get(`/chat/rooms/${room.id}/messages`);
      setMessages(res.data);
    } catch {
      Alert.alert('Error', t('errors.load_messages'));
    }
  };

  const deleteCurrentRoom = async () => {
    if (!selectedRoom) return;

    const performDelete = async () => {
      try {
        console.log(`Attempting to delete room ${selectedRoom.id}...`);
        await api.delete(`/chat/rooms/${selectedRoom.id}`);
        console.log('Room deleted successfully');
        setSelectedRoom(null);
        fetchRooms();
      } catch (e: any) {
        console.error("Error deleting room:", e);
        const errorMessage = e.response?.data?.detail || e.message || 'Ocurrió un error desconocido al intentar borrar el chat.';
        if (Platform.OS === 'web') {
          window.alert(`No se pudo borrar el chat. Detalle: ${errorMessage}`);
        } else {
          Alert.alert('Error', `No se pudo borrar el chat. Detalle: ${errorMessage}`);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro de que quieres borrar este chat? Se perderán todos los mensajes.');
      if (confirmed) {
        performDelete();
      }
    } else {
      Alert.alert('Confirmar', '¿Estás seguro de que quieres borrar este chat? Se perderán todos los mensajes.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: performDelete }
      ]);
    }
  };

  const deleteCurrentRoom = async () => {
    if (!selectedRoom) return;

    const performDelete = async () => {
      try {
        console.log(`Attempting to delete room ${selectedRoom.id}...`);
        await api.delete(`/chat/rooms/${selectedRoom.id}`);
        console.log('Room deleted successfully');
        setSelectedRoom(null);
        fetchRooms();
      } catch (e: any) {
        console.error("Error deleting room:", e);
        const errorMessage = e.response?.data?.detail || e.message || 'Ocurrió un error desconocido al intentar borrar el chat.';
        if (Platform.OS === 'web') {
          window.alert(`No se pudo borrar el chat. Detalle: ${errorMessage}`);
        } else {
          Alert.alert('Error', `No se pudo borrar el chat. Detalle: ${errorMessage}`);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro de que quieres borrar este chat? Se perderán todos los mensajes.');
      if (confirmed) {
        performDelete();
      }
    } else {
      Alert.alert('Confirmar', '¿Estás seguro de que quieres borrar este chat? Se perderán todos los mensajes.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: performDelete }
      ]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) {
      console.warn('Cannot send message: Message content is empty or no room selected.'); // <-- Added warning log
      return;
    }

    const content = newMessage.trim();
    setNewMessage(''); // Clear input immediately to provide visual feedback

    try {
        // Send via WebSocket if connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log('Attempting to send message via WebSocket:', content);
          wsRef.current.send(JSON.stringify({ content }));
        } else {
          // Fallback to REST
          console.warn('WebSocket not open. Falling back to REST API.'); // <-- Added warning log
          try {
            const res = await api.post(`/chat/rooms/${selectedRoom.id}/messages`, { content });
            console.log('Message sent successfully via REST API:', res.data);
            setMessages((prev) => [...prev, res.data]);
          } catch (e: any) {
            console.error('Error sending message via REST API:', e); // <-- Added error log
            Alert.alert('Error', `No se pudo enviar el mensaje. Detalle: ${e.response?.data?.detail || 'Verifique la conexión o los permisos.'}`);
          }
        }
    } catch (outerError) {
      console.error('Critical error during message sending process:', outerError); // <-- Added critical error log
      Alert.alert('Error Crítico', 'Ocurrió un error inesperado al intentar enviar el mensaje.');
    }
  };

  const startChat = async (doctorId: number) => {
    try {
      const res = await api.post(`/chat/rooms/${doctorId}`);
      await fetchRooms();
      openRoom(res.data);
    } catch {
      Alert.alert('Error', t('errors.create_chat'));
    }
  };

  const openReportModal = async () => {
    if (!selectedRoom) return;
    setReportModalVisible(true);
    setLoadingRoutines(true);
    try {
      const res = await api.get('/routines/');
      const myRoutines = res.data.filter((r: any) => r.creator_id === selectedRoom.doctor_id);
      setRoutines(myRoutines);
    } catch {
      Alert.alert('Error', t('errors.load_routines'));
    } finally {
      setLoadingRoutines(false);
    }
  };

  const generateReport = async (routineId: number) => {
    if (!selectedRoom) return;
    setReportModalVisible(false);
    try {
      const res = await api.post(`/chat/rooms/${selectedRoom.id}/report`, { routine_id: routineId });
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || t('errors.generate_report'));
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
    
    const otherProfilePicture = 
      user?.id === selectedRoom.doctor_id
        ? selectedRoom.patient_profile_picture
        : selectedRoom.doctor_profile_picture;

    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={[styles.chatHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setSelectedRoom(null)}
            accessibilityRole="button"
            accessibilityLabel="Go back to conversations"
          >
            <Text style={[styles.backBtn, { color: colors.primary }]}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>t('common.back')
            {otherProfilePicture && (
              <Image source={{ uri: otherProfilePicture }} style={[styles.roomAvatarImage, { width: 32, height: 32, borderRadius: 16, marginRight: 8 }]} />
            )}
            <Text style={[styles.chatTitle, { color: colors.text }]} numberOfLines={1}>{otherName}</Text>
          </View>
          {user?.role === 'patient' && (
            <TouchableOpacity style={[styles.reportBtn, { backgroundColor: colors.primary }]} onPress={openReportModal}>
              <Text style={styles.reportBtnText}>t('chat.generate_report')</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.reportBtn, { backgroundColor: '#FF3B30', marginLeft: 8 }]} onPress={deleteCurrentRoom}>
            <Text style={styles.reportBtnText}>Borrar</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.sender_id === user?.id;
            const msgAvatar = isMe ? user?.profile_picture : otherProfilePicture;
            
            const isReport = item.type === 'report' && item.report_data;

            const prepareChartData = (records: any[] | undefined) => {
              if (!records || records.length === 0) return null;
              const labels = records.map(d => new Date(d.date).getDate().toString());
              const data = records.map(d => d.value);
              if (data.length === 1) {
                labels.push(labels[0]);
                data.push(data[0]);
              }
              return { labels, datasets: [{ data }] };
            };

            return (
              <View style={[styles.messageWrapper, isMe ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
                {msgAvatar ? (
                  <Image source={{ uri: msgAvatar }} style={[styles.messageAvatar, { marginLeft: isMe ? 8 : 0, marginRight: isMe ? 0 : 8 }]} />
                ) : (
                  <View style={[styles.messageAvatarPlaceholder, { marginLeft: isMe ? 8 : 0, marginRight: isMe ? 0 : 8, backgroundColor: colors.primaryLight }]}>
                     <Text>{isMe ? '👤' : (user?.id === selectedRoom.doctor_id ? '👤' : '🩺')}</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isMe
                      ? { backgroundColor: colors.primary, alignSelf: 'flex-end', borderTopRightRadius: 4 }
                      : { backgroundColor: colors.card, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 4 },
                    isReport ? { maxWidth: '90%' } : {},
                  ]}
                >
                  <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.text }, isReport ? { fontWeight: 'bold', marginBottom: 8 } : {}]}>
                    {item.content}
                  </Text>

                  {isReport && (
                    <View style={styles.reportContainer}>
                      <Text style={[styles.reportStat, { color: isMe ? '#fff' : colors.text }]}>Inicio: {new Date(item.report_data!.routine_start).toLocaleDateString()}</Text>
                      <Text style={[styles.reportStat, { color: isMe ? '#fff' : colors.text }]}>Total actividades: {item.report_data!.stats.total_activities}</Text>
                      <Text style={[styles.reportStat, { color: isMe ? '#fff' : colors.text }]}>Distancia (km): {item.report_data!.stats.total_distance_km.toFixed(2)}</Text>
                      <Text style={[styles.reportStat, { color: isMe ? '#fff' : colors.text }]}>Pasos: {item.report_data!.stats.total_steps}</Text>
                      
                      {prepareChartData(item.report_data!.graphs.bpm_over_time) && (
                        <View style={styles.chartWrapper}>
                          <Text style={[styles.chartTitle, { color: isMe ? '#fff' : colors.text }]}>Evolución BPM</Text>
                          <LineChart
                            data={prepareChartData(item.report_data!.graphs.bpm_over_time)!}
                            width={Dimensions.get('window').width * 0.7}
                            height={150}
                            fromZero={true}
                            chartConfig={{
                              backgroundColor: 'transparent',
                              backgroundGradientFrom: isMe ? colors.primary : colors.card,
                              backgroundGradientTo: isMe ? colors.primary : colors.card,
                              color: (opacity = 1) => isMe ? `rgba(255, 255, 255, ${opacity})` : colors.primary,
                              labelColor: (opacity = 1) => isMe ? `rgba(255, 255, 255, ${opacity})` : colors.text,
                              propsForDots: { r: "3", strokeWidth: "1" }
                            }}
                            bezier
                            style={styles.chartStyle}
                          />
                        </View>
                      )}

                      {prepareChartData(item.report_data!.graphs.steps_over_time) && (
                        <View style={styles.chartWrapper}>
                          <Text style={[styles.chartTitle, { color: isMe ? '#fff' : colors.text }]}>Evolución Pasos</Text>
                          <LineChart
                            data={prepareChartData(item.report_data!.graphs.steps_over_time)!}
                            width={Dimensions.get('window').width * 0.7}
                            height={150}
                            fromZero={true}
                            chartConfig={{
                              backgroundColor: 'transparent',
                              backgroundGradientFrom: isMe ? colors.primary : colors.card,
                              backgroundGradientTo: isMe ? colors.primary : colors.card,
                              color: (opacity = 1) => isMe ? `rgba(255, 255, 255, ${opacity})` : colors.primary,
                              labelColor: (opacity = 1) => isMe ? `rgba(255, 255, 255, ${opacity})` : colors.text,
                            }}
                            bezier
                            style={styles.chartStyle}
                          />
                        </View>
                      )}
                      
                      {prepareChartData(item.report_data!.graphs.weight_over_time) && (
                        <View style={styles.chartWrapper}>
                          <Text style={[styles.chartTitle, { color: isMe ? '#fff' : colors.text }]}>Evolución Peso</Text>
                          <LineChart
                            data={prepareChartData(item.report_data!.graphs.weight_over_time)!}
                            width={Dimensions.get('window').width * 0.7}
                            height={150}
                            fromZero={true}
                            chartConfig={{
                              backgroundColor: 'transparent',
                              backgroundGradientFrom: isMe ? colors.primary : colors.card,
                              backgroundGradientTo: isMe ? colors.primary : colors.card,
                              color: (opacity = 1) => isMe ? `rgba(255, 255, 255, ${opacity})` : colors.primary,
                              labelColor: (opacity = 1) => isMe ? `rgba(255, 255, 255, ${opacity})` : colors.text,
                            }}
                            bezier
                            style={styles.chartStyle}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.icon }]}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.messageInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            placeholder={t('chat.write_message')}
            placeholderTextColor={colors.icon}
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={sendMessage}>
            <Text style={styles.sendBtnText}>t('chat.send')</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={reportModalVisible} transparent animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.background, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Selecciona una rutina para el reporte</Text>
              
              {loadingRoutines ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : routines.length === 0 ? (
                <Text style={{ color: colors.text, textAlign: 'center', marginVertical: 20 }}>No hay rutinas creadas por este doctor.</Text>
              ) : (
                <ScrollView>
                  {routines.map(r => (
                    <TouchableOpacity key={r.id} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => generateReport(r.id)}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{r.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.icon }}>Desde: {new Date(r.created_at).toLocaleDateString()}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              
              <TouchableOpacity onPress={() => setReportModalVisible(false)} style={{ marginTop: 20, padding: 16, backgroundColor: colors.card, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  // Room list view
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.accent }, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View style={{ flex: 1, marginRight: 16 }}>
          <Text style={styles.title}>{t('chat.label')}</Text>
          <Text style={styles.subtitle}>{t('chat.subtitle')}</Text>
        </View>
        <TouchableOpacity style={{ backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }} onPress={() => router.push('/contacts')}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{user?.role === 'patient' ? t('chat.my_doctors') : t('chat.my_patients')}</Text>
        </TouchableOpacity>
      </View>

      {doctors.length > 0 && selectedRoom === null && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{user?.role === 'patient' ? t('chat.my_doctors') : t('chat.my_patients')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.doctorList}>
            {doctors.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.doctorCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                onPress={() => startChat(d.id)}
                activeOpacity={0.7}
              >
                {d.profile_picture ? (
                  <Image source={{ uri: d.profile_picture }} style={styles.doctorAvatarImage} />
                ) : (
                  <Text style={[styles.doctorName, { color: colors.primary }]}>{user?.role === 'patient' ? '🩺' : '👤'}</Text>
                )}
                <Text style={[styles.doctorNameText, { color: colors.primary }]}>{d.username.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {rooms.length === 0 ? (
          <Text style={[styles.empty, { color: colors.icon }]}>
            {t('chat.no_conversations')}
          </Text>
        ) : (
          rooms.map((r) => {
            const otherName =
              user?.id === r.doctor_id ? r.patient_username : r.doctor_username;
            const otherProfilePicture =
              user?.id === r.doctor_id ? r.patient_profile_picture : r.doctor_profile_picture;
            const roleLabel = user?.id === r.doctor_id ? '👤' + t('roles.patient') : '🩺' + t('roles.doctor');
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.roomCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openRoom(r)}
                activeOpacity={0.7}
              >
                {otherProfilePicture ? (
                  <Image source={{ uri: otherProfilePicture }} style={styles.roomAvatarImage} />
                ) : (
                  <View style={[styles.roomAvatar, { backgroundColor: colors.primaryLight }]}>
                    <Text>{user?.id === r.doctor_id ? '👤' : '🩺'}</Text>
                  </View>
                )}
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
  doctorAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  roomAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
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
  reportBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 10,
  },
  reportBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  messageList: { 
    padding: 16, 
    gap: 12 
  },
  messageWrapper: {
    marginBottom: 4,
    alignItems: 'flex-end',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
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
  reportContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 8,
  },
  reportStat: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  chartWrapper: {
    marginTop: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    padding: 8,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  chartStyle: {
    borderRadius: 8,
  },
});
