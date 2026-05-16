import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notification-context';
import api from '@/services/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lastEvent } = useNotifications();
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
      Alert.alert(t('common.error'), t('contacts.load_contacts_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  // Escuchar eventos en tiempo real para recargar contactos
  useEffect(() => {
    if (lastEvent) {
      const relevantTypes = ['contact_request', 'contact_accepted', 'contact_deleted'];
      if (relevantTypes.includes(lastEvent.type)) {
        console.log('Recargando contactos debido a evento web socket:', lastEvent.type);
        fetchContacts();
      }
    }
  }, [lastEvent]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchSearching(true);
    try {
      const res = await api.get(`/users/search?query=${searchQuery}&role=patient`);
      setSearchResults(res.data);
    } catch (e) {
      Alert.alert(t('common.error'), t('contacts.search_failed'));
    } finally {
      setSearchSearching(false);
    }
  };

  const sendRequest = async (patientId: number) => {
    try {
      await api.post(`/relationships/request?patient_id=${patientId}`);
      Alert.alert(t('common.success'), t('contacts.request_sent'));
      setSearchQuery('');
      setSearchResults([]);
      fetchContacts();
    } catch (e: any) {
       Alert.alert(t('common.error'), e.response?.data?.detail || t('contacts.request_send_failed'));
    }
  };

  const updateRequestStatus = async (relId: number, status: 'accepted' | 'rejected') => {
    try {
      await api.patch(`/relationships/${relId}/status?status=${status}`);
      fetchContacts();
    } catch (e) {
      Alert.alert(t('common.error'), t('contacts.request_update_failed'));
    }
  };

  const unlinkContact = (relId: number) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t('contacts.confirm_unlink'));
      if (!confirmed) return;

      api.delete(`/relationships/${relId}`)
        .then(() => {
          console.log('Contacto desvinculado exitosamente');
          fetchContacts();
        })
        .catch((e: any) => {
          console.error("Error al desligar contacto:", e);
          alert(`${t('contacts.unlink_failed')} ${t('common.detail')}: ${e.response?.data?.detail || t('contacts.check_connection_or_perms')}`);
        });

    } else {
      Alert.alert(
        t('common.confirm'),
        t('contacts.confirm_unlink'),
        [
          { text: t('common.cancel'), style: "cancel" },
          {
            text: t('contacts.unlink'),
            style: "destructive",
            onPress: async () => {
              try {
                await api.delete(`/relationships/${relId}`);
                fetchContacts();
              } catch (e: any) {
                console.error("Error al desligar contacto:", e);
                Alert.alert(t('common.error'), `${t('contacts.unlink_failed')} ${t('common.detail')}: ${e.response?.data?.detail || t('contacts.check_connection_or_perms')}`);
              }
            }
          }
        ]
      );
    }
  };

  if (!user) return null;

  const isDoctor = user.role === 'doctor';
  const title = isDoctor ? t('contacts.title_patients') : t('contacts.title_doctors');

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
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('contacts.add_patient')}</Text>
                <View style={styles.searchRow}>
                  <TextInput
                    style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder={t('contacts.search_placeholder')}
                    placeholderTextColor={colors.icon}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                  />
                  <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.primary }]} onPress={handleSearch}>
                    {searching ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchBtnText}>{t('contacts.search')}</Text>}
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
                        <Text style={styles.addBtnText}>{t('contacts.add')}</Text>
                      </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* PENDING REQUESTS */}
            {pendingRequests.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('contacts.pending_requests')}</Text>
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
                        <Text style={[styles.reqStatus, { color: colors.icon }]}>{t('contacts.waiting_acceptance')}</Text>
                      </View>
                      {!isDoctor && (
                         <View style={styles.actionRow}>
                           <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => updateRequestStatus(req.id, 'accepted')}>
                              <Text style={styles.actionText}>{t('contacts.accept')}</Text>
                           </TouchableOpacity>
                           <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF3B30' }]} onPress={() => updateRequestStatus(req.id, 'rejected')}>
                              <Text style={styles.actionText}>{t('contacts.reject')}</Text>
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
                <Text style={{ color: colors.icon, textAlign: 'center', marginVertical: 20 }}>{isDoctor ? t('contacts.no_patients_yet') : t('contacts.no_doctors_yet')}</Text>
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
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF3B30' }]} onPress={() => unlinkContact(c.relationship_id)}>
                     <Text style={styles.actionText}>{t('contacts.unlink')}</Text>
                  </TouchableOpacity>
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