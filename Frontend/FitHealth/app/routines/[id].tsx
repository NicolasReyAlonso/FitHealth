import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Modal, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api, { API_BASE_URL } from '@/services/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [routine, setRoutine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0); 
  
  const [modalVisible, setModalVisible] = useState(false);
  const [addingType, setAddingType] = useState<'exercise'|'diet'|'med'|null>(null);
  const [savingItem, setSavingItem] = useState(false);
  
  // Forms states
  const [itemName, setItemName] = useState('');
  const [itemSets, setItemSets] = useState('');
  const [itemReps, setItemReps] = useState('');
  const [itemCalories, setItemCalories] = useState('');
  const [itemDose, setItemDose] = useState('');
  const [itemTime, setItemTime] = useState(''); // e.g. "14:00:00"

  const fetchRoutine = useCallback(async () => {
    try {
      const res = await api.get(`/routines/${id}`);
      setRoutine(res.data);
    } catch {
      Alert.alert('Error', 'No se pudo cargar la rutina');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchRoutine();
  }, [fetchRoutine]);

  const handlePickImage = async (exerciseId: number) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      uploadImage(exerciseId, uri);
    }
  };

  const uploadImage = async (exerciseId: number, uri: string) => {
    try {
      setLoading(true);
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // En la web, necesitamos convertir la URI en un Blob de verdad
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
      } else {
        // En móvil usamos este atajo de React Native
        formData.append('file', { uri, name: filename, type } as any);
      }

      await api.post(`/routines/exercises/${exerciseId}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
      });
      fetchRoutine();
    } catch (e: any) {
      console.error(e?.response?.data || e);
      Alert.alert('Error', `Fallo al subir la imagen: ${e?.response?.data?.detail?.[0]?.msg || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!itemName) {
        Alert.alert('Aviso', 'El nombre es obligatorio');
        return;
    }
    
    // Normalizar la hora para evitar errores 422 de Pydantic
    let formattedTime = itemTime ? itemTime.trim() : null;
    if (formattedTime) {
        // Simple regex to check and fix formats like "9", "9:00", "09", "09:00"
        if (/^\d{1,2}$/.test(formattedTime)) {
            formattedTime = `${formattedTime.padStart(2, '0')}:00:00`;
        } else if (/^\d{1,2}:\d{2}$/.test(formattedTime)) {
            const [h, m] = formattedTime.split(':');
            formattedTime = `${h.padStart(2, '0')}:${m}:00`;
        }
    }

    try {
        setSavingItem(true);
        if (addingType === 'exercise') {
            await api.post(`/routines/${id}/days/${selectedDay}/exercises`, {
                name: itemName,
                sets: itemSets ? parseInt(itemSets) : null,
                reps: itemReps ? parseInt(itemReps) : null
            });
        } else if (addingType === 'diet') {
            await api.post(`/routines/${id}/days/${selectedDay}/diets`, {
                name: itemName,
                calories: itemCalories ? parseInt(itemCalories) : null,
                time_of_day: formattedTime
            });
        } else if (addingType === 'med') {
            await api.post(`/routines/${id}/days/${selectedDay}/medications`, {
                name: itemName,
                dose: itemDose || '1 pill',
                time_of_day: formattedTime
            });
        }
        setModalVisible(false);
        fetchRoutine();
    } catch (e: any) {
        console.error("DEBUG HTTP 422:", JSON.stringify(e.response?.data || e.message));
        Alert.alert('Error', 'Fallo al guardar: ' + (e.response?.data?.detail?.[0]?.msg || e.message));
    } finally {
        setSavingItem(false);
    }
  };

  const handleDeleteItem = async (type: string, itemId: number) => {
      try {
          await api.delete(`/routines/items/${type}/${itemId}`);
          fetchRoutine();
      } catch {
          Alert.alert('Error', 'Fallo al borrar');
      }
  };

  const openModal = (type: 'exercise'|'diet'|'med') => {
      setAddingType(type);
      setItemName('');
      setItemSets('');
      setItemReps('');
      setItemCalories('');
      setItemDose('');
      setItemTime('');
      setModalVisible(true);
  };

  if (loading || !routine) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentDayData = routine.days.find((d: any) => d.day_of_week === selectedDay) || { 
      exercises: [], diet_items: [], medications: [] 
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Selector de días */}
      <View style={styles.daysNav}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DAYS.map((dayName, index) => {
            const isSelected = selectedDay === index;
            return (
              <TouchableOpacity
                key={index}
                style={[
                    styles.dayTab, 
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setSelectedDay(index)}
              >
                <Text style={{ color: isSelected ? '#FFF' : colors.text, fontWeight: 'bold' }}>{dayName}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{routine.name}</Text>
          <Text style={{ fontSize: 16, color: colors.icon, marginBottom: 20 }}>Visión del {DAYS[selectedDay]}</Text>

          {/* MEDICAMENTOS */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>💊 Medicación</Text>
            <TouchableOpacity onPress={() => openModal('med')}><Text style={{ color: colors.primary, fontWeight: 'bold' }}>+ Añadir</Text></TouchableOpacity>
          </View>
          {currentDayData.medications.length === 0 && <Text style={{ color: colors.icon, marginBottom: 15 }}>No hay medicación este día.</Text>}
          {currentDayData.medications.map((m: any) => (
              <View key={`med-${m.id}`} style={[styles.cardRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>{m.name}</Text>
                      <Text style={{ color: colors.icon }}>Dosis: {m.dose} {m.time_of_day ? `| Hora: ${m.time_of_day}` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteItem('medication', m.id)}>
                      <Ionicons name="trash-outline" size={24} color="#D32F2F" />
                  </TouchableOpacity>
              </View>
          ))}

          {/* TABLA DE EJERCICIOS */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🏋️ Tabla de Ejercicios</Text>
            <TouchableOpacity onPress={() => openModal('exercise')}><Text style={{ color: colors.primary, fontWeight: 'bold' }}>+ Añadir</Text></TouchableOpacity>
          </View>
          {currentDayData.exercises.length === 0 && <Text style={{ color: colors.icon, marginBottom: 15 }}>Aún no hay ejercicios.</Text>}
          {currentDayData.exercises.map((ex: any) => (
              <View key={`ex-${ex.id}`} style={[styles.cardRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {ex.image_url ? (
                      <Image source={{ uri: API_BASE_URL + ex.image_url }} style={styles.exImage} />
                  ) : (
                      <TouchableOpacity style={[styles.exImagePlaceholder, { backgroundColor: colors.border }]} onPress={() => handlePickImage(ex.id)}>
                          <Ionicons name="camera-outline" size={24} color={colors.icon} />
                      </TouchableOpacity>
                  )}
                  <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>{ex.name}</Text>
                      <Text style={{ color: colors.icon }}>Series: {ex.sets || '-'} | Reps: {ex.reps || '-'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteItem('exercise', ex.id)}>
                      <Ionicons name="trash-outline" size={24} color="#D32F2F" />
                  </TouchableOpacity>
              </View>
          ))}

          {/* DIETAS Y COMIDAS */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🥗 Comidas / Dieta</Text>
            <TouchableOpacity onPress={() => openModal('diet')}><Text style={{ color: colors.primary, fontWeight: 'bold' }}>+ Añadir</Text></TouchableOpacity>
          </View>
          {currentDayData.diet_items.length === 0 && <Text style={{ color: colors.icon, marginBottom: 15 }}>Sin dieta establecida para hoy.</Text>}
          {currentDayData.diet_items.map((d: any) => (
              <View key={`diet-${d.id}`} style={[styles.cardRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>{d.name}</Text>
                      <Text style={{ color: colors.icon }}>{d.calories ? `${d.calories} kcal` : 'Sin kcal prop.'} {d.time_of_day ? `| Hora: ${d.time_of_day}` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteItem('diet', d.id)}>
                      <Ionicons name="trash-outline" size={24} color="#D32F2F" />
                  </TouchableOpacity>
              </View>
          ))}
          
          <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Añadir Item */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20 }}>
                {addingType === 'exercise' ? 'Añadir Ejercicio' : addingType === 'diet' ? 'Añadir Comida' : 'Añadir Medicación'}
            </Text>

            <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder={addingType === 'med' ? "Nombre píldora (Ej. Ibuprofeno)" : "Nombre"}
                placeholderTextColor={colors.icon}
                value={itemName}
                onChangeText={setItemName}
            />

            {addingType === 'exercise' && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder="Series" placeholderTextColor={colors.icon} keyboardType="numeric" value={itemSets} onChangeText={setItemSets} />
                    <TextInput style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder="Reps" placeholderTextColor={colors.icon} keyboardType="numeric" value={itemReps} onChangeText={setItemReps} />
                </View>
            )}

            {addingType === 'diet' && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder="Kcal" placeholderTextColor={colors.icon} keyboardType="numeric" value={itemCalories} onChangeText={setItemCalories} />
                    <TextInput style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder="Hora (ej. 14:00)" placeholderTextColor={colors.icon} value={itemTime} onChangeText={setItemTime} />
                </View>
            )}
            
            {addingType === 'med' && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder="Dosis (Ej: 1 pastilla)" placeholderTextColor={colors.icon} value={itemDose} onChangeText={setItemDose} />
                    <TextInput style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder="Hora (ej. 09:00)" placeholderTextColor={colors.icon} value={itemTime} onChangeText={setItemTime} />
                </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border, flex: 1 }]} onPress={() => setModalVisible(false)}>
                <Text style={{ textAlign: 'center', color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]} onPress={handleSaveItem} disabled={savingItem}>
                {savingItem ? <ActivityIndicator color="#fff" /> : <Text style={{ textAlign: 'center', color: '#fff', fontWeight: 'bold' }}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  daysNav: { paddingVertical: 12, paddingHorizontal: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  dayTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', marginHorizontal: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  exImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  exImagePlaceholder: { width: 50, height: 50, borderRadius: 8, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 14 },
  btn: { padding: 16, borderRadius: 12 },
});