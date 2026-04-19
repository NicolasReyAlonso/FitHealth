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
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Routine = {
  id: number;
  name: string;
  description: string | null;
  days: {
    id: number;
    day_of_week: number;
  }[];
  created_at: string;
};

export default function RoutinesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');

  const fetchRoutines = async () => {
    try {
      const res = await api.get('/routines/');
      setRoutines(res.data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las rutinas');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [])
  );

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    try {
      await api.post('/routines/', { name: name.trim(), description: description.trim() || null });
      setName('');
      setDescription('');
      setShowModal(false);
      fetchRoutines();
    } catch {
      Alert.alert('Error', 'No se pudo crear la rutina');
    }
  };

  const handleDelete = (id: number) => {
    console.log('🗑️ Abriendo confirmación de delete para rutina:', id);
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      console.log('📡 Eliminando rutina:', deleteId);
      await api.delete(`/routines/${deleteId}`);
      console.log('✅ Rutina eliminada exitosamente');
      setDeleteId(null);
      await fetchRoutines();
      Alert.alert('Éxito', 'Rutina eliminada correctamente');
    } catch (error: any) {
      console.error('❌ Error al eliminar:', error);
      Alert.alert('Error', error.message || 'No se pudo eliminar la rutina');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (routine: Routine) => {
    console.log('✏️ Abriendo edición para rutina:', routine.id);
    setEditingId(routine.id);
    setEditingName(routine.name);
    setEditingDescription(routine.description || '');
  };


  const confirmEdit = async () => {
    if (!editingId) return;
    try {
      console.log('📡 Actualizando rutina:', editingId);
      await api.patch(`/routines/${editingId}`, {
        name: editingName,
        description: editingDescription || null,
      });
      console.log('✅ Rutina actualizada exitosamente');
      setEditingId(null);
      setEditingName('');
      setEditingDescription('');
      await fetchRoutines();
      Alert.alert('Éxito', 'Rutina actualizada correctamente');
    } catch (error: any) {
      console.error('❌ Error al actualizar:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar la rutina');
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
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.title}>{t('myRoutines')}</Text>
          <Text style={styles.subtitle}>{t('orgTraining')}</Text>
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
        {routines.length === 0 ? (
          <Text style={[styles.empty, { color: colors.icon }]}>
            No tienes rutinas aún. ¡Crea tu primera rutina!
          </Text>
        ) : (
          routines.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/routines/${r.id}`)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{r.name}</Text>
                  {r.description && (
                    <Text style={[styles.cardDesc, { color: colors.icon }]} numberOfLines={2}>{r.description}</Text>
                  )}
                </View>
              <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); handleEdit(r); }}
                    activeOpacity={0.6}
                  >
                    <Text style={{ fontSize: 18 }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                    activeOpacity={0.6}
                  >
                    <Text style={{ fontSize: 18 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.cardMeta}>
                <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    📅 {r.days ? r.days.length : 0} días
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modal de Eliminación */}
      <Modal visible={deleteId !== null} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 300 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>
              ¿Eliminar rutina?
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

      {/* Modal de Edición */}
      <Modal visible={editingId !== null} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20 }}>
              Editar Rutina
            </Text>
            
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              placeholder="Nombre de la rutina"
              placeholderTextColor={colors.icon}
              value={editingName}
              onChangeText={setEditingName}
            />
            
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text, height: 80 }]}
              placeholder="Descripción"
              placeholderTextColor={colors.icon}
              value={editingDescription}
              onChangeText={setEditingDescription}
              multiline
              numberOfLines={3}
            />
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center' }}
                onPress={() => {
                  setEditingId(null);
                  setEditingName('');
                  setEditingDescription('');
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' }}
                onPress={confirmEdit}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Nueva Rutina</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              placeholder="Nombre"
              placeholderTextColor={colors.icon}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              placeholder="Descripción (opcional)"
              placeholderTextColor={colors.icon}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowModal(false)}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleCreate}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 0,
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
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: { 
    fontSize: 13, 
    marginBottom: 2,
    fontWeight: '400',
    lineHeight: 18,
  },
  cardMeta: { 
    flexDirection: 'row', 
    gap: 8 
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaText: { 
    fontSize: 13,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
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
});
