import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/context/notification-context';

const EVENT_TYPES = [
  { key: 'walking', label: '🚶 Caminar' },
  { key: 'running', label: '🏃 Correr' },
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
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [events, setEvents] = useState<EventItem[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [editingDateText, setEditingDateText] = useState('');
  const [editingTimeText, setEditingTimeText] = useState('');
  const [editingType, setEditingType] = useState('custom');
  const [editingRoutineId, setEditingRoutineId] = useState('');
  const [undoDeletedEvent, setUndoDeletedEvent] = useState<Record<string, unknown> | null>(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('custom');
  const [notes, setNotes] = useState('');
  const [routineId, setRoutineId] = useState('');
  // Specific fields
  const [waterMl, setWaterMl] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityType, setActivityType] = useState('');
  const [foodName, setFoodName] = useState('');

  const [hrAvg, setHrAvg] = useState('');
  const [hrMax, setHrMax] = useState('');
  const [hrMin, setHrMin] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  
  const [steps, setSteps] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  
  // Date picker state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { showNotification } = useNotifications();

  const resetCreateForm = () => {
    setName('');
    setNotes('');
    setWaterMl('');
    setWeightKg('');
    setActivityType('');
    setFoodName('');
    setRoutineId('');
    setHrAvg('');
    setHrMax('');
    setHrMin('');
    setBloodSugar('');
    setSteps('');
    setDistanceKm('');
    setSelectedDate(new Date());
  };

  const getDateText = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  const getTimeText = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const parseDateTime = (dateText: string, timeText: string) => {
    const dateParts = dateText.split('/');
    const timeParts = timeText.split(':');
    if (dateParts.length !== 3 || timeParts.length !== 2) return null;

    const day = Number.parseInt(dateParts[0], 10);
    const month = Number.parseInt(dateParts[1], 10) - 1;
    const year = Number.parseInt(dateParts[2], 10);
    const hours = Number.parseInt(timeParts[0], 10);
    const minutes = Number.parseInt(timeParts[1], 10);

    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year) || Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    const parsed = new Date(year, month, day, hours, minutes);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const mapEventToCreatePayload = (event: Record<string, unknown>) => {
    const e = event as Record<string, any>;
    const payload: Record<string, unknown> = {
      name: e.name,
      event_type: e.event_type,
      timestamp: e.timestamp,
      notes: e.notes ?? null,
      routine_id: e.routine_id ?? null,
    };

    if (e.biometric) {
      const { id, event_id, ...biometric } = e.biometric;
      payload.biometric = biometric;
    }
    if (e.water_log) {
      const { id, event_id, ...waterLog } = e.water_log;
      payload.water_log = waterLog;
    }
    if (e.activity_log) {
      const { id, event_id, ...activityLog } = e.activity_log;
      payload.activity_log = activityLog;
    }
    if (e.food_log) {
      const { id, event_id, ...foodLog } = e.food_log;
      payload.food_log = foodLog;
    }
    if (e.weight_log) {
      const { id, event_id, ...weightLog } = e.weight_log;
      payload.weight_log = weightLog;
    }

    return payload;
  };

  const buildBiometricPayload = () => {
    const biometricData: Record<string, unknown> = {};
    if (hrAvg) biometricData.heart_rate_avg = Number.parseInt(hrAvg, 10);
    if (hrMax) biometricData.heart_rate_max = Number.parseInt(hrMax, 10);
    if (hrMin) biometricData.heart_rate_min = Number.parseInt(hrMin, 10);
    if (bloodSugar) biometricData.blood_sugar = Number.parseFloat(bloodSugar);
    return Object.keys(biometricData).length > 0 ? biometricData : null;
  };

  const buildActivityPayload = () => {
    if (eventType === 'walking' || eventType === 'running') {
      return {
        activity_type: eventType === 'walking' ? 'Caminar' : 'Correr',
        steps: steps ? Number.parseInt(steps, 10) : undefined,
        distance_km: distanceKm ? Number.parseFloat(distanceKm) : undefined,
      };
    }

    if (eventType === 'activity' && activityType) {
      return { activity_type: activityType };
    }

    return null;
  };

  const buildCreatePayload = () => {
    const payload: Record<string, unknown> = {
      name: name.trim(),
      event_type: eventType,
      timestamp: selectedDate.toISOString(),
      notes: notes.trim() || null,
    };

    if (routineId.trim()) {
      payload.routine_id = Number.parseInt(routineId.trim(), 10);
    }

    const biometricPayload = buildBiometricPayload();
    if (biometricPayload) {
      payload.biometric = biometricPayload;
    }

    const activityPayload = buildActivityPayload();
    if (activityPayload) {
      payload.activity_log = activityPayload;
    }

    if (eventType === 'water' && waterMl) {
      payload.water_log = { amount_ml: Number.parseInt(waterMl, 10) };
    }

    if (eventType === 'weight' && weightKg) {
      payload.weight_log = { weight_kg: Number.parseFloat(weightKg) };
    }

    if (eventType === 'food' && foodName) {
      payload.food_log = { food_name: foodName };
    }

    return payload;
  };

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events/');
      setEvents(res.data);
    } catch {
      showNotification('No se pudieron cargar los eventos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutines = async () => {
    try {
      const res = await api.get('/routines/');
      setRoutines(res.data);
    } catch {
      console.error('Error al cargar rutinas');
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
      fetchRoutines();
    }, [])
  );

  useEffect(() => {
    return () => {
      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
      }
    };
  }, [undoTimeoutId]);

  const handleCreate = async () => {
    if (!name.trim()) {
      showNotification('El nombre es requerido', 'error');
      return;
    }
    try {
      const payload = buildCreatePayload();
      await api.post('/events/', payload);
      resetCreateForm();
      setShowModal(false);
      fetchEvents();
      showNotification('Evento añadido correctamente', 'success');
    } catch {
      showNotification('No se pudo crear el evento', 'error');
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
      const deletedEvent = events.find((event) => event.id === deleteId) as unknown as Record<string, unknown> | undefined;
      console.log('📡 Eliminando evento:', deleteId);
      await api.delete(`/events/${deleteId}`);
      console.log('✅ Evento eliminado exitosamente');
      setDeleteId(null);
      await fetchEvents();
      if (deletedEvent) {
        setUndoDeletedEvent(deletedEvent);
        if (undoTimeoutId) {
          clearTimeout(undoTimeoutId);
        }
        const timeoutId = setTimeout(() => {
          setUndoDeletedEvent(null);
          setUndoTimeoutId(null);
        }, 5000);
        setUndoTimeoutId(timeoutId);
      }
      showNotification('Evento eliminado. Puedes deshacer durante 5 segundos', 'warning');
    } catch (error: any) {
      console.error('❌ Error al eliminar:', error);
      showNotification(error.message || 'No se pudo eliminar el evento', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (event: EventItem) => {
    console.log('✏️ Abriendo edición para evento:', event.id);
    setEditingId(event.id);
    setEditingName(event.name);
    setEditingNotes(event.notes || '');
    const eventDate = new Date(event.timestamp);
    setEditingDateText(getDateText(eventDate));
    setEditingTimeText(getTimeText(eventDate));
    setEditingType(event.event_type);
    setEditingRoutineId((event as any).routine_id ? String((event as any).routine_id) : '');
  };

  const confirmEdit = async () => {
    if (!editingId) return;
    const parsedDate = parseDateTime(editingDateText, editingTimeText);
    if (!parsedDate) {
      showNotification('Fecha u hora inválida. Usa DD/MM/AAAA y HH:MM', 'error');
      return;
    }
    try {
      console.log('📡 Actualizando evento:', editingId);
      const payload: Record<string, unknown> = {
        name: editingName,
        notes: editingNotes || null,
        timestamp: parsedDate.toISOString(),
        event_type: editingType,
      };
      if (editingRoutineId) {
        payload.routine_id = Number.parseInt(editingRoutineId, 10);
      } else {
        payload.routine_id = null;
      }
      await api.patch(`/events/${editingId}`, payload);
      console.log('✅ Evento actualizado exitosamente');
      setEditingId(null);
      setEditingName('');
      setEditingNotes('');
      setEditingDateText('');
      setEditingTimeText('');
      setEditingType('custom');
      setEditingRoutineId('');
      await fetchEvents();
      showNotification('Evento actualizado correctamente', 'success');
    } catch (error: any) {
      console.error('❌ Error al actualizar:', error);
      showNotification(error.message || 'No se pudo actualizar el evento', 'error');
    }
  };

  const getTypeEmoji = (type: string) => EVENT_TYPES.find((t) => t.key === type)?.label ?? '📝';
  const canCreateEvent = name.trim().length > 0;
  const canSaveEdit = editingName.trim().length > 0 && !!parseDateTime(editingDateText, editingTimeText);

  const handleUndoDelete = async () => {
    if (!undoDeletedEvent) return;
    try {
      const payload = mapEventToCreatePayload(undoDeletedEvent);
      await api.post('/events/', payload);
      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
      }
      setUndoDeletedEvent(null);
      setUndoTimeoutId(null);
      await fetchEvents();
      showNotification('Evento restaurado correctamente', 'success');
    } catch {
      showNotification('No se pudo restaurar el evento', 'error');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.secondary }]}>
        <View>
          <Text style={styles.title}>{t('myEvents')}</Text>
          <Text style={styles.subtitle}>{t('registerHealth')}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: 'rgba(255,255,255,0.25)' }]} 
          onPress={() => setShowModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
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
                <View style={[styles.emoji, { backgroundColor: `${colors.secondary}20` }]}>
                  <Text>{getTypeEmoji(e.event_type).split(' ')[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{e.name}</Text>
                  <Text style={[styles.cardDate, { color: colors.icon }]}>
                    {new Date(e.timestamp).toLocaleString('es-ES')}
                  </Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={() => handleEdit(e)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.deleteIcon}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(e.id)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {e.notes && <Text style={[styles.cardNotes, { color: colors.icon }]}>{e.notes}</Text>}
              {(e as any).routine_id && (
                <Text style={[styles.cardNotes, { color: colors.primary, fontWeight: '600' }]}>
                  🎯 Rutina: {routines.find((r) => r.id === (e as any).routine_id)?.name || (e as any).routine_id}
                </Text>
              )}
              {e.event_type === 'biometric' && (e as any).biometric && (
                <View style={{ marginTop: 10 }}>
                  {(e as any).biometric.heart_rate_avg && <Text style={[styles.cardNotes, { color: colors.text }]}>❤️ BPM Medio: {(e as any).biometric.heart_rate_avg}</Text>}
                  {(e as any).biometric.blood_sugar && <Text style={[styles.cardNotes, { color: colors.text }]}>🍬 Azúcar: {(e as any).biometric.blood_sugar} mg/dL</Text>}
                </View>
              )}
              {(e.event_type === 'walking' || e.event_type === 'running') && (
                <View style={{ marginTop: 10 }}>
                  {(e as any).activity_log?.steps && <Text style={[styles.cardNotes, { color: colors.text }]}>👣 Pasos: {(e as any).activity_log.steps}</Text>}
                  {(e as any).activity_log?.distance_km && <Text style={[styles.cardNotes, { color: colors.text }]}>📏 Distancia: {(e as any).activity_log.distance_km} km</Text>}
                  {(e as any).biometric?.heart_rate_avg && <Text style={[styles.cardNotes, { color: colors.text }]}>❤️ BPM Medio: {(e as any).biometric.heart_rate_avg}</Text>}
                  {(e as any).biometric?.heart_rate_max && <Text style={[styles.cardNotes, { color: colors.text }]}>❤️ BPM Pico: {(e as any).biometric.heart_rate_max}</Text>}
                  {(e as any).biometric?.heart_rate_min && <Text style={[styles.cardNotes, { color: colors.text }]}>❤️ BPM Mínimo: {(e as any).biometric.heart_rate_min}</Text>}
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
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
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: '90%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
                Editar Evento
              </Text>
              
              {/* Nombre */}
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                placeholder="Nombre del evento"
                placeholderTextColor={colors.icon}
                value={editingName}
                onChangeText={setEditingName}
              />

              {/* Tipo de Evento */}
              <Text style={{ color: colors.text, marginBottom: 8, marginTop: 12, fontWeight: '600', fontSize: 14 }}>Tipo:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {EVENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.typeChip,
                      { borderColor: colors.border, marginRight: 8 },
                      editingType === type.key 
                        ? { backgroundColor: colors.primary, borderColor: colors.primary } 
                        : { backgroundColor: colors.background }
                    ]}
                    onPress={() => setEditingType(type.key)}
                  >
                    <Text style={{ color: editingType === type.key ? '#fff' : colors.text, fontSize: 12 }}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Fecha y Hora (compacto) */}
              <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '600', fontSize: 14 }}>Fecha y Hora:</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TextInput
                  style={[styles.input, { 
                    flex: 1.5,
                    borderColor: colors.border, 
                    backgroundColor: colors.background, 
                    color: colors.text,
                    height: 40,
                    fontSize: 12
                  }]}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.icon}
                  value={editingDateText}
                  onChangeText={setEditingDateText}
                />
                <TextInput
                  style={[styles.input, { 
                    flex: 1,
                    borderColor: colors.border, 
                    backgroundColor: colors.background, 
                    color: colors.text,
                    height: 40,
                    fontSize: 12
                  }]}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.icon}
                  value={editingTimeText}
                  onChangeText={setEditingTimeText}
                />
              </View>
              {!parseDateTime(editingDateText, editingTimeText) && (
                <Text style={styles.inlineErrorText}>Formato inválido. Usa DD/MM/AAAA y HH:MM.</Text>
              )}

              {/* Rutina asociada */}
              <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '600', fontSize: 14 }}>Rutina asociada:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    { borderColor: colors.border, marginRight: 8 },
                    editingRoutineId.length > 0
                      ? { backgroundColor: colors.background }
                      : { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setEditingRoutineId('')}
                >
                  <Text style={{ color: editingRoutineId.length > 0 ? colors.text : '#fff', fontSize: 12 }}>Ninguna</Text>
                </TouchableOpacity>
                {routines.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.typeChip,
                      { borderColor: colors.border, marginRight: 8 },
                      editingRoutineId === String(r.id) ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.background }
                    ]}
                    onPress={() => setEditingRoutineId(String(r.id))}
                  >
                    <Text style={{ color: editingRoutineId === String(r.id) ? '#fff' : colors.text, fontSize: 12 }}>
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Notas */}
              <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '600', fontSize: 14 }}>Notas:</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text, height: 60 }]}
                placeholder="Agregar notas..."
                placeholderTextColor={colors.icon}
                value={editingNotes}
                onChangeText={setEditingNotes}
                multiline
                numberOfLines={2}
              />
              
              {/* Botones */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.border, borderRadius: 12, padding: 12, alignItems: 'center' }}
                  onPress={() => {
                    setEditingId(null);
                    setEditingName('');
                    setEditingNotes('');
                    setEditingDateText('');
                    setEditingTimeText('');
                    setEditingType('custom');
                    setEditingRoutineId('');
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: canSaveEdit ? colors.secondary : colors.border,
                    borderRadius: 12,
                    padding: 12,
                    alignItems: 'center',
                    opacity: canSaveEdit ? 1 : 0.6,
                  }}
                  onPress={confirmEdit}
                  disabled={!canSaveEdit}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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

              <Text style={{ color: colors.text, marginBottom: 8, marginTop: 12, fontWeight: '600' }}>Fecha y Hora:</Text>
              <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, height: 44 }]}
                    placeholder="DD"
                    placeholderTextColor={colors.icon}
                    maxLength={2}
                    keyboardType="numeric"
                    value={String(selectedDate.getDate()).padStart(2, '0')}
                    onChangeText={(val) => {
                      const day = Math.min(31, Math.max(1, Number.parseInt(val, 10) || selectedDate.getDate()));
                      const newDate = new Date(selectedDate);
                      newDate.setDate(day);
                      setSelectedDate(newDate);
                    }}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, height: 44 }]}
                    placeholder="MM"
                    placeholderTextColor={colors.icon}
                    maxLength={2}
                    keyboardType="numeric"
                    value={String(selectedDate.getMonth() + 1).padStart(2, '0')}
                    onChangeText={(val) => {
                      const month = Math.min(12, Math.max(1, Number.parseInt(val, 10) || selectedDate.getMonth() + 1)) - 1;
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(month);
                      setSelectedDate(newDate);
                    }}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, height: 44 }]}
                    placeholder="AAAA"
                    placeholderTextColor={colors.icon}
                    maxLength={4}
                    keyboardType="numeric"
                    value={String(selectedDate.getFullYear())}
                    onChangeText={(val) => {
                      const year = Number.parseInt(val, 10) || selectedDate.getFullYear();
                      const newDate = new Date(selectedDate);
                      newDate.setFullYear(year);
                      setSelectedDate(newDate);
                    }}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, height: 44 }]}
                    placeholder="HH"
                    placeholderTextColor={colors.icon}
                    maxLength={2}
                    keyboardType="numeric"
                    value={String(selectedDate.getHours()).padStart(2, '0')}
                    onChangeText={(val) => {
                      const hours = Math.min(23, Math.max(0, Number.parseInt(val, 10) || selectedDate.getHours()));
                      const newDate = new Date(selectedDate);
                      newDate.setHours(hours);
                      setSelectedDate(newDate);
                    }}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, height: 44 }]}
                    placeholder="MM"
                    placeholderTextColor={colors.icon}
                    maxLength={2}
                    keyboardType="numeric"
                    value={String(selectedDate.getMinutes()).padStart(2, '0')}
                    onChangeText={(val) => {
                      const minutes = Math.min(59, Math.max(0, Number.parseInt(val, 10) || selectedDate.getMinutes()));
                      const newDate = new Date(selectedDate);
                      newDate.setMinutes(minutes);
                      setSelectedDate(newDate);
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.input, { flex: 1, backgroundColor: colors.primary, borderColor: colors.primary, justifyContent: 'center', height: 44 }]}
                    onPress={() => setSelectedDate(new Date())}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Ahora</Text>
                  </TouchableOpacity>
                </View>
              </View>

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
              {(eventType === 'walking' || eventType === 'running') && (
                <>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    placeholder="BPM Medio (opcional)"
                    placeholderTextColor={colors.icon}
                    value={hrAvg}
                    onChangeText={setHrAvg}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    placeholder="BPM Pico (opcional)"
                    placeholderTextColor={colors.icon}
                    value={hrMax}
                    onChangeText={setHrMax}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    placeholder="BPM Mínimo (opcional)"
                    placeholderTextColor={colors.icon}
                    value={hrMin}
                    onChangeText={setHrMin}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    placeholder="Pasos (opcional)"
                    placeholderTextColor={colors.icon}
                    value={steps}
                    onChangeText={setSteps}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    placeholder="Distancia en km (opcional)"
                    placeholderTextColor={colors.icon}
                    value={distanceKm}
                    onChangeText={setDistanceKm}
                    keyboardType="decimal-pad"
                  />
                </>
              )}
              {eventType === 'biometric' && (
                <>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    placeholder="BPM Medio (opcional)"
                    placeholderTextColor={colors.icon}
                    value={hrAvg}
                    onChangeText={setHrAvg}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    placeholder="BPM Pico (opcional)"
                    placeholderTextColor={colors.icon}
                    value={hrMax}
                    onChangeText={setHrMax}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    placeholder="BPM Mínimo (opcional)"
                    placeholderTextColor={colors.icon}
                    value={hrMin}
                    onChangeText={setHrMin}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    placeholder="Azúcar en sangre (mg/dL) (opcional)"
                    placeholderTextColor={colors.icon}
                    value={bloodSugar}
                    onChangeText={setBloodSugar}
                    keyboardType="decimal-pad"
                  />
                </>
              )}

              <Text style={{ color: colors.text, marginBottom: 8, marginTop: 4 }}>Rutina asociada (opcional):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    { borderColor: colors.border, marginRight: 8 },
                    routineId ? { backgroundColor: colors.background } : { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setRoutineId('')}
                >
                  <Text style={{ color: routineId ? colors.text : '#fff' }}>Ninguna</Text>
                </TouchableOpacity>
                {routines.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.typeChip,
                      { borderColor: colors.border, marginRight: 8 },
                      routineId === String(r.id) ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.background }
                    ]}
                    onPress={() => setRoutineId(String(r.id))}
                  >
                    <Text style={{ color: routineId === String(r.id) ? '#fff' : colors.text }}>{r.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

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
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    { backgroundColor: canCreateEvent ? colors.secondary : colors.border, opacity: canCreateEvent ? 1 : 0.6 },
                  ]}
                  onPress={handleCreate}
                  disabled={!canCreateEvent}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Crear</Text>
                </TouchableOpacity>
              </View>
              {!canCreateEvent && (
                <Text style={styles.inlineErrorText}>El nombre es obligatorio para crear el evento.</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {undoDeletedEvent && (
        <View style={[styles.undoBanner, { backgroundColor: colors.secondary }]}>
          <Text style={styles.undoText}>Evento eliminado</Text>
          <TouchableOpacity onPress={handleUndoDelete}>
            <Text style={styles.undoAction}>Deshacer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 0 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
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
  addButton: { 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: { 
    color: '#fff', 
    fontWeight: '800', 
    fontSize: 18 
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
  card: { 
    borderRadius: 16, 
    padding: 18, 
    marginBottom: 12, 
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  emoji: { 
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 22,
  },
  cardTitle: { 
    fontSize: 15, 
    fontWeight: '700',
    flex: 1,
  },
  cardDate: { 
    fontSize: 12, 
    marginTop: 4,
    fontWeight: '500',
  },
  cardNotes: { 
    fontSize: 13, 
    marginTop: 10,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: { 
    padding: 4, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  deleteIcon: { 
    fontSize: 18 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    padding: 24 
  },
  modalContent: { 
    borderRadius: 24, 
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  label: { 
    fontSize: 15, 
    fontWeight: '700', 
    marginBottom: 10 
  },
  typeGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginBottom: 18 
  },
  typeButton: { 
    borderWidth: 2, 
    borderRadius: 14, 
    paddingHorizontal: 14, 
    paddingVertical: 10 
  },
  typeText: { 
    fontSize: 13, 
    fontWeight: '700',
  },
  input: { 
    borderWidth: 1, 
    borderRadius: 14, 
    padding: 16, 
    fontSize: 16, 
    marginBottom: 14,
    fontWeight: '500',
  },
  modalButtons: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 12 
  },
  modalBtn: { 
    flex: 1, 
    borderRadius: 14, 
    padding: 16, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inlineErrorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 8,
  },
  typeChip: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  undoBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
  },
  undoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  undoAction: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
