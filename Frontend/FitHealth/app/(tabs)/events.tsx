import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import api from '@/services/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const EVENT_TYPES = [
  { key: 'biometric', label: '❤️ Biométrico' },
  { key: 'water', label: '💧 Agua' },
  { key: 'activity', label: '🏃 Actividad' },
  { key: 'food', label: '🍎 Alimento' },
  { key: 'weight', label: '⚖️ Peso' },
  { key: 'custom', label: '📝 Otro' },
];

type EventItem = {
  id: number;
  name: string;
  event_type: string;
  timestamp: string;
  notes: string | null;
};

export default function EventsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingNotes, setEditingNotes] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('custom');
  const [notes, setNotes] = useState('');
  // Specific fields
  const [waterMl, setWaterMl] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityType, setActivityType] = useState('');
  const [foodName, setFoodName] = useState('');

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events/');
      setEvents(res.data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los eventos');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [])
  );

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    const payload: Record<string, unknown> = {
      name: name.trim(),
      event_type: eventType,
      timestamp: new Date().toISOString(),
      notes: notes.trim() || null,
    };
    if (eventType === 'water' && waterMl) {
      payload.water_log = { amount_ml: parseInt(waterMl, 10) };
    }
    if (eventType === 'weight' && weightKg) {
      payload.weight_log = { weight_kg: parseFloat(weightKg) };
    }
    if (eventType === 'activity' && activityType) {
      payload.activity_log = { activity_type: activityType };
    }
    if (eventType === 'food' && foodName) {
      payload.food_log = { food_name: foodName };
    }
    try {
      await api.post('/events/', payload);
      setName('');
      setNotes('');
      setWaterMl('');
      setWeightKg('');
      setActivityType('');
      setFoodName('');
      setShowModal(false);
      fetchEvents();
    } catch {
      Alert.alert('Error', 'No se pudo crear el evento');
    }
  };

  const handleDelete = (id: number) => {
    console.log('🗑️ Mostrar confirmación para evento:', id);
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      console.log('📡 Eliminando evento:', deleteId);
      await api.delete(`/events/${deleteId}`);
      console.log('✅ Evento eliminado exitosamente');
      setDeleteId(null);
      await fetchEvents();
      Alert.alert('Éxito', 'Evento eliminado correctamente');
    } catch (error: any) {
      console.error('❌ Error al eliminar:', error);
      Alert.alert('Error', error.message || 'No se pudo eliminar el evento');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (event: EventItem) => {
    console.log('✏️ Abriendo edición para evento:', event.id);
    setEditingId(event.id);
    setEditingName(event.name);
    setEditingNotes(event.notes || '');
  };

  const confirmEdit = async () => {
    if (!editingId) return;
    try {
      console.log('📡 Actualizando evento:', editingId);
      await api.patch(`/events/${editingId}`, {
        name: editingName,
        notes: editingNotes || null,
      });
      console.log('✅ Evento actualizado exitosamente');
      setEditingId(null);
      setEditingName('');
      setEditingNotes('');
      await fetchEvents();
      Alert.alert('Éxito', 'Evento actualizado correctamente');
    } catch (error: any) {
      console.error('❌ Error al actualizar:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar el evento');
    }
  };

  const getTypeEmoji = (type: string) => EVENT_TYPES.find((t) => t.key === type)?.label ?? '📝';

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Mis Eventos</Text>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.secondary }]} onPress={() => setShowModal(true)}>
          <Text style={styles.addButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {events.length === 0 ? (
          <Text style={[styles.empty, { color: colors.icon }]}>
            No tienes eventos registrados aún.
          </Text>
        ) : (
          events.map((e) => (
            <View
              key={e.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.emoji}>{getTypeEmoji(e.event_type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{e.name}</Text>
                  <Text style={[styles.cardDate, { color: colors.icon }]}>
                    {new Date(e.timestamp).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleEdit(e)}
                  style={styles.deleteButton}
                  activeOpacity={0.6}
                >
                  <Text style={styles.deleteIcon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(e.id)}
                  style={styles.deleteButton}
                  activeOpacity={0.6}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
              {e.notes && <Text style={[styles.cardNotes, { color: colors.icon }]}>{e.notes}</Text>}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de Confirmación de Delete */}
      <Modal visible={deleteId !== null} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 300 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>
              ¿Eliminar evento?
            </Text>
            <Text style={{ fontSize: 14, color: colors.icon, marginBottom: 24 }}>
              Esta acción no se puede deshacer
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.border, borderRadius: 12, padding: 12, alignItems: 'center' }}
                onPress={() => {
                  console.log('❌ Cancelar delete');
                  setDeleteId(null);
                }}
                disabled={deleting}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#FF4444', borderRadius: 12, padding: 12, alignItems: 'center', opacity: deleting ? 0.6 : 1 }}
                onPress={confirmDelete}
                disabled={deleting}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Edición de Evento */}
      <Modal visible={editingId !== null} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20 }}>
              Editar Evento
            </Text>
            
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              placeholder="Nombre del evento"
              placeholderTextColor={colors.icon}
              value={editingName}
              onChangeText={setEditingName}
            />
            
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text, height: 80 }]}
              placeholder="Notas"
              placeholderTextColor={colors.icon}
              value={editingNotes}
              onChangeText={setEditingNotes}
              multiline
              numberOfLines={3}
            />
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center' }}
                onPress={() => {
                  setEditingId(null);
                  setEditingName('');
                  setEditingNotes('');
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, padding: 14, alignItems: 'center' }}
                onPress={confirmEdit}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Crear Evento */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>Nuevo Evento</Text>

              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                placeholder="Nombre del evento"
                placeholderTextColor={colors.icon}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.label, { color: colors.text }]}>Tipo:</Text>
              <View style={styles.typeGrid}>
                {EVENT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.typeButton,
                      { borderColor: colors.border },
                      eventType === t.key && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => setEventType(t.key)}
                  >
                    <Text style={[styles.typeText, eventType === t.key && { color: colors.primary }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {eventType === 'water' && (
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                  placeholder="Cantidad (ml)"
                  placeholderTextColor={colors.icon}
                  value={waterMl}
                  onChangeText={setWaterMl}
                  keyboardType="numeric"
                />
              )}
              {eventType === 'weight' && (
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                  placeholder="Peso (kg)"
                  placeholderTextColor={colors.icon}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="decimal-pad"
                />
              )}
              {eventType === 'activity' && (
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                  placeholder="Tipo de actividad"
                  placeholderTextColor={colors.icon}
                  value={activityType}
                  onChangeText={setActivityType}
                />
              )}
              {eventType === 'food' && (
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                  placeholder="Nombre del alimento"
                  placeholderTextColor={colors.icon}
                  value={foodName}
                  onChangeText={setFoodName}
                />
              )}

              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                placeholder="Notas (opcional)"
                placeholderTextColor={colors.icon}
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowModal(false)}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={handleCreate}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Crear</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold' },
  addButton: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: 20 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 24 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDate: { fontSize: 12, marginTop: 2 },
  cardNotes: { fontSize: 13, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeButton: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  typeText: { fontSize: 13, fontWeight: '600', color: '#8E9AAF' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  deleteButton: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  deleteIcon: { fontSize: 20 },
});
