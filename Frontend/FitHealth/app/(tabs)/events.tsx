import React, { useCallback, useState, useRef } from 'react';
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
import { useToast } from '@/context/toast-context';
import { useClosureOverlay } from '@/hooks/use-closure-overlay';
import { UndoToast } from '@/components/undo-toast';

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
  const toast = useToast();
  const { component: closureOverlay, show: showClosure } = useClosureOverlay();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  
  // Undo functionality
  const [lastDeletedEventId, setLastDeletedEventId] = useState<number | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingDate, setEditingDate] = useState(new Date());
  const [editingType, setEditingType] = useState('custom');
  const [editingRoutineId, setEditingRoutineId] = useState('');

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
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events/');
      setEvents(res.data);
    } catch (error: any) {
      console.error('❌ Error al cargar eventos:', error);
      toast.error('No se pudieron cargar los eventos');
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

  // NOSONAR
  const handleCreate = async () => {
    if (!name.trim()) {
      toast.warning('El nombre es requerido');
      return;
    }
    const payload: Record<string, unknown> = {
      name: name.trim(),
      event_type: eventType,
      timestamp: selectedDate.toISOString(),
      notes: notes.trim() || null,
    };
    if (routineId.trim()) {
      payload.routine_id = parseInt(routineId.trim(), 10);
    }
    if (eventType === 'biometric') {
      const biometricData: Record<string, unknown> = {};
      if (hrAvg) biometricData.heart_rate_avg = Number.parseInt(hrAvg, 10);
      if (hrMax) biometricData.heart_rate_max = Number.parseInt(hrMax, 10);
      if (hrMin) biometricData.heart_rate_min = Number.parseInt(hrMin, 10);
      if (bloodSugar) biometricData.blood_sugar = parseFloat(bloodSugar);
      
      if (Object.keys(biometricData).length > 0) {
        payload.biometric = biometricData;
      }
    }
    if (eventType === 'walking' || eventType === 'running') {
      const biometricData: Record<string, unknown> = {};
      if (hrAvg) biometricData.heart_rate_avg = Number.parseInt(hrAvg, 10);
      if (hrMax) biometricData.heart_rate_max = Number.parseInt(hrMax, 10);
      if (hrMin) biometricData.heart_rate_min = Number.parseInt(hrMin, 10);
      
      if (Object.keys(biometricData).length > 0) {
        payload.biometric = biometricData;
      }
      
      const activityData: Record<string, unknown> = {
        activity_type: eventType === 'walking' ? 'Caminar' : 'Correr',
      };
      if (steps) activityData.steps = Number.parseInt(steps, 10);
      if (distanceKm) activityData.distance_km = parseFloat(distanceKm);
      payload.activity_log = activityData;
    }
    if (eventType === 'water' && waterMl) {
      payload.water_log = { amount_ml: Number.parseInt(waterMl, 10) };
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
      
      // Mostrar confirmación de cierre
      const eventTypeLabel = EVENT_TYPES.find(et => et.key === eventType)?.label || eventType;
      showClosure(
        `¡Evento registrado!`,
        `"${name.trim()}" - ${eventTypeLabel}`
      );
      
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
      setShowModal(false);
      fetchEvents();
    } catch {
      toast.error('No se pudo crear el evento');
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
      
      // Guardar ID para undo
      setLastDeletedEventId(deleteId);
      setShowUndoToast(true);
      
      // Limpiar timeout anterior si existe
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      
      // Auto-dismiss después de 5 segundos
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndoToast(false);
        setLastDeletedEventId(null);
      }, 5000);
      
      setDeleteId(null);
      await fetchEvents();
    } catch (error: any) {
      console.error('❌ Error al eliminar:', error);
      toast.error(error.message || 'No se pudo eliminar el evento');
    } finally {
      setDeleting(false);
    }
  };

  const handleUndo = async () => {
    if (!lastDeletedEventId) return;
    
    try {
      console.log('↶ Deshaciendo eliminación de evento:', lastDeletedEventId);
      await api.post(`/events/${lastDeletedEventId}/restore`);
      toast.success('↶ Evento restaurado');
      await fetchEvents();
    } catch (error: any) {
      console.error('❌ Error al restaurar:', error);
      toast.error('No se pudo restaurar el evento');
    } finally {
      setShowUndoToast(false);
      setLastDeletedEventId(null);
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    }
  };

  const handleEdit = (event: EventItem) => {
    console.log('✏️ Abriendo edición para evento:', event.id);
    setEditingId(event.id);
    setEditingName(event.name);
    setEditingNotes(event.notes || '');
    setEditingDate(new Date(event.timestamp));
    setEditingType(event.event_type);
    setEditingRoutineId((event as any).routine_id ? String((event as any).routine_id) : '');
  };

  const confirmEdit = async () => {
    if (!editingId) return;
    try {
      console.log('📡 Actualizando evento:', editingId);
      const payload: Record<string, unknown> = {
        name: editingName,
        notes: editingNotes || null,
        timestamp: editingDate.toISOString(),
        event_type: editingType,
      };
      if (editingRoutineId) {
        payload.routine_id = Number.parseInt(editingRoutineId, 10);
      } else {
        payload.routine_id = null;
      }
      await api.patch(`/events/${editingId}`, payload);
      console.log('✅ Evento actualizado exitosamente');
      
      // Mostrar confirmación de cierre
      const eventTypeLabel = EVENT_TYPES.find(et => et.key === editingType)?.label || editingType;
      showClosure(
        `¡Evento actualizado!`,
        `"${editingName.trim()}" - ${eventTypeLabel}`
      );
      
      setEditingId(null);
      setEditingName('');
      setEditingNotes('');
      setEditingDate(new Date());
      setEditingType('custom');
      setEditingRoutineId('');
      await fetchEvents();
    } catch (error: any) {
      console.error('❌ Error al actualizar:', error);
      toast.error(error.message || 'No se pudo actualizar el evento');
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
                  value={`${String(editingDate.getDate()).padStart(2, '0')}/${String(editingDate.getMonth() + 1).padStart(2, '0')}/${editingDate.getFullYear()}`}
                  onChangeText={(text) => {
                    const parts = text.split('/');
                    if (parts.length === 3) {
                      const day = Number.parseInt(parts[0], 10);
                      const month = Number.parseInt(parts[1], 10) - 1;
                      const year = Number.parseInt(parts[2], 10);
                      if (day > 0 && day <= 31 && month >= 0 && month < 12 && year > 1900) {
                        const newDate = new Date(editingDate);
                        newDate.setFullYear(year, month, day);
                        setEditingDate(newDate);
                      }
                    }
                  }}
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
                  value={`${String(editingDate.getHours()).padStart(2, '0')}:${String(editingDate.getMinutes()).padStart(2, '0')}`}
                  onChangeText={(text) => {
                    const parts = text.split(':');
                    if (parts.length === 2) {
                      const hours = Number.parseInt(parts[0], 10);
                      const minutes = Number.parseInt(parts[1], 10);
                      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                        const newDate = new Date(editingDate);
                        newDate.setHours(hours, minutes);
                        setEditingDate(newDate);
                      }
                    }
                  }}
                />
              </View>

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
                    setEditingDate(new Date());
                    setEditingType('custom');
                    setEditingRoutineId('');
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, padding: 12, alignItems: 'center' }}
                  onPress={confirmEdit}
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

              {/* Date/Time Picker */}
              <Text style={{ color: colors.text, marginBottom: 8, marginTop: 12, fontWeight: '600' }}>Fecha y Hora:</Text>
              <TouchableOpacity 
                style={[styles.input, { borderColor: colors.primary, backgroundColor: colors.primaryLight, borderWidth: 2, justifyContent: 'center' }]}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  📅 {selectedDate.toLocaleString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <View style={{ 
                  backgroundColor: colors.background, 
                  borderRadius: 12, 
                  padding: 16, 
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.border
                }}>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <TextInput
                      style={[styles.input, { 
                        flex: 1,
                        borderColor: colors.border, 
                        backgroundColor: colors.card, 
                        color: colors.text,
                        height: 44
                      }]}
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
                      style={[styles.input, { 
                        flex: 1,
                        borderColor: colors.border, 
                        backgroundColor: colors.card, 
                        color: colors.text,
                        height: 44
                      }]}
                      placeholder="MM"
                      placeholderTextColor={colors.icon}
                      maxLength={2}
                      keyboardType="numeric"
                      value={String(selectedDate.getMonth() + 1).padStart(2, '0')}
                      onChangeText={(val) => {
                        const month = Math.min(12, Math.max(1, Number.parseInt(val, 10) || 1)) - 1;
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(month);
                        setSelectedDate(newDate);
                      }}
                    />
                    <TextInput
                      style={[styles.input, { 
                        flex: 1,
                        borderColor: colors.border, 
                        backgroundColor: colors.card, 
                        color: colors.text,
                        height: 44
                      }]}
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
                      style={[styles.input, { 
                        flex: 1,
                        borderColor: colors.border, 
                        backgroundColor: colors.card, 
                        color: colors.text,
                        height: 44
                      }]}
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
                      style={[styles.input, { 
                        flex: 1,
                        borderColor: colors.border, 
                        backgroundColor: colors.card, 
                        color: colors.text,
                        height: 44
                      }]}
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
                      style={[styles.input, { 
                        flex: 1,
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                        justifyContent: 'center',
                        height: 44
                      }]}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Hecho</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

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
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={handleCreate}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Crear</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Closure Overlay */}
      {closureOverlay}

      {/* Undo Toast */}
      {showUndoToast && lastDeletedEventId && (
        <UndoToast
          message="Evento eliminado"
          onUndo={handleUndo}
          onDismiss={() => {
            setShowUndoToast(false);
            setLastDeletedEventId(null);
            if (undoTimeoutRef.current) {
              clearTimeout(undoTimeoutRef.current);
            }
          }}
          duration={5000}
          colorScheme={colorScheme}
        />
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
  typeChip: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
