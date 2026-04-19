import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/auth-context';
import api from '@/services/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

type Relation = {
  id: number;
  doctor_id: number;
  patient_id: number;
  status: string;
  doctor_username: string;
  patient_username: string;
  doctor_profile_picture?: string;
  patient_profile_picture?: string;
};

type UserSearch = {
  id: number;
  username: string;
  email: string;
  role: string;
  profile_picture?: string;
};

export default function ContactsScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [pendingRequests, setPendingRequests] = useState<Relation[]>([]);
  const [acceptedContacts, setAcceptedContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // For doctors adding patients
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearch[]>([]);
  const [searching, setSearchSearching] = useState(false);

  const fetchContacts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'doctor') {
        const [pendingRes, acceptedRes] = await Promise.all([
          api.get('/relationships/doctor/pending'),
          api.get('/relationships/doctor/patients')
        ]);
        setPendingRequests(pendingRes.data);
        setAcceptedContacts(acceptedRes.data);
      } else {
        const [pendingRes, acceptedRes] = await Promise.all([
          api.get('/relationships/patient/pending'),
          api.get('/relationships/patient/doctors')
        ]);
        setPendingRequests(pendingRes.data);
        setAcceptedContacts(acceptedRes.data);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudieron cargar los contactos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchSearching(true);
    try {
      const res = await api.get(`/users/search?query=${searchQuery}&role=patient`);
      setSearchResults(res.data);
    } catch (e) {
      Alert.alert('Error', 'Fallo al buscar usuarios');
    } finally {
      setSearchSearching(false);
    }
  };

  const sendRequest = async (patientId: number) => {
    try {
      await api.post(`/relationships/request?patient_id=${patientId}`);
      Alert.alert('Éxito', 'Solicitud enviada correctamente');
      setSearchQuery('');
      setSearchResults([]);
      fetchContacts();
    } catch (e: any) {
       Alert.alert('Error', e.response?.data?.detail || 'No se pudo enviar la solicitud, quizá ya existe.');
    }
  };

  const updateRequestStatus = async (relId: number, status: 'accepted' | 'rejected') => {
    try {
      await api.patch(`/relationships/${relId}/status?status=${status}`);
      fetchContacts();
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar la solicitud');
    }
  };

  if (!user) return null;

  const isDoctor = user.role === 'doctor';
  const title = isDoctor ? 'Mis Pacientes' : 'Mis Doctores';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title, headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }} />

      <FlatList
        data={[{ key: 'content' }]}
        keyExtractor={(i) => i.key}
        renderItem={() => (
          <View style={styles.content}>
            
            {/* DOC: Add Patient Section */}
            {isDoctor && (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Añadir Paciente</Text>
                <View style={styles.searchRow}>
                  <TextInput
                    style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Buscar por email o usuario..."
                    placeholderTextColor={colors.icon}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                  />
                  <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.primary }]} onPress={handleSearch}>
                    {searching ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchBtnText}>Buscar</Text>}
                  </TouchableOpacity>
                </View>

                {searchResults.map(res => (
                  <View key={res.id} style={[styles.resultCard, { borderColor: colors.border }]}>
                     {res.profile_picture ? (
                        <Image source={{ uri: res.profile_picture }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
                          <Text>👤</Text>
                        </View>
                      )}
                      <View style={styles.resultInfo}>
                        <Text style={[styles.resultName, { color: colors.text }]}>{res.username}</Text>
                        <Text style={[styles.resultEmail, { color: colors.icon }]}>{res.email}</Text>
                      </View>
                      <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => sendRequest(res.id)}>
                        <Text style={styles.addBtnText}>Añadir</Text>
                      </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* PENDING REQUESTS */}
            {pendingRequests.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Solicitudes Pendientes</Text>
                {pendingRequests.map(req => {
                  const otherName = isDoctor ? req.patient_username : req.doctor_username;
                  const otherPic = isDoctor ? req.patient_profile_picture : req.doctor_profile_picture;
                  return (
                    <View key={req.id} style={[styles.reqCard, { borderColor: colors.border }]}>
                      {otherPic ? (
                        <Image source={{ uri: otherPic }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
                          <Text>{isDoctor ? '👤' : '🩺'}</Text>
                        </View>
                      )}
                      <View style={styles.reqInfo}>
                        <Text style={[styles.reqName, { color: colors.text }]}>{otherName}</Text>
                        <Text style={[styles.reqStatus, { color: colors.icon }]}>Esperando aceptación</Text>
                      </View>
                      {!isDoctor && (
                         <View style={styles.actionRow}>
                           <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => updateRequestStatus(req.id, 'accepted')}>
                              <Text style={styles.actionText}>Aceptar</Text>
                           </TouchableOpacity>
                           <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF3B30' }]} onPress={() => updateRequestStatus(req.id, 'rejected')}>
                              <Text style={styles.actionText}>Rechazar</Text>
                           </TouchableOpacity>
                         </View>
                      )}
                    </View>
                  )
                })}
              </View>
            )}

            {/* ACCEPTED CONTACTS */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
              {loading && <ActivityIndicator style={{ margin: 20 }} color={colors.primary} />}
              {!loading && acceptedContacts.length === 0 && (
                <Text style={{ color: colors.icon, textAlign: 'center', marginVertical: 20 }}>No tienes {isDoctor ? 'pacientes' : 'doctores'} asociados aún.</Text>
              )}
              {acceptedContacts.map(c => (
                <View key={c.id} style={[styles.contactCard, { borderColor: colors.border }]}>
                  {c.profile_picture ? (
                    <Image source={{ uri: c.profile_picture }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
                      <Text>{isDoctor ? '👤' : '🩺'}</Text>
                    </View>
                  )}
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, { color: colors.text }]}>{c.username}</Text>
                    <Text style={[styles.contactEmail, { color: colors.icon }]}>{c.email}</Text>
                  </View>
                </View>
              ))}
            </View>

          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    height: 44,
  },
  searchBtnText: { color: '#fff', fontWeight: '600' },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 16, fontWeight: '600' },
  resultEmail: { fontSize: 13 },
  addBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  
  reqCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  reqInfo: { flex: 1 },
  reqName: { fontSize: 16, fontWeight: '600' },
  reqStatus: { fontSize: 13, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 12 },

  contactCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '600' },
  contactEmail: { fontSize: 13, marginTop: 2 },
});