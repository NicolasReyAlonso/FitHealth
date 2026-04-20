import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Modal, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api, { API_BASE_URL } from '@/services/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [routine, setRoutine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0); 
  
  const [modalVisible, setModalVisible] = useState(false);
  const [addingType, setAddingType] = useState<'exercise'|'diet'|'med'|'objective'|null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectedDaysForDuplicate, setSelectedDaysForDuplicate] = useState<number[]>([]);
  const [copyingDays, setCopyingDays] = useState(false);
  
  // Forms states
  const [itemName, setItemName] = useState('');
  const [itemSets, setItemSets] = useState('');
  const [itemReps, setItemReps] = useState('');
  const [itemCalories, setItemCalories] = useState('');
  const [itemDose, setItemDose] = useState('');
  const [itemTime, setItemTime] = useState(''); // e.g. "14:00:00"
  const [itemType, setItemType] = useState('weight'); // 'weight' or 'biometric'
  const [itemTargetValue, setItemTargetValue] = useState('');
  const [itemUnit, setItemUnit] = useState(''); // kg, bpm
  const [itemRecommendedDate, setItemRecommendedDate] = useState<Date | null>(null);
  const [itemDeadlineDate, setItemDeadlineDate] = useState<Date | null>(null);
  const [showRecommendedPicker, setShowRecommendedPicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };


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
    
    // Connect WebSocket
    const rawHost = API_BASE_URL.replace(/^http(s?):\/\//, '');
    const wsScheme = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = `${wsScheme}://${rawHost}/routines/ws/${id}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'routine_updated') {
          fetchRoutine();
        }
        else if (data.type === 'objective_updated') {
          setRoutine((prev: any) => {
            if (!prev) return prev;
            const newRoutine = { ...prev };
            if (newRoutine.objectives) {
              newRoutine.objectives = newRoutine.objectives.map((obj: any) => 
                obj.id === data.id ? { ...obj, is_completed: data.is_completed } : obj
              );
            }
            return newRoutine;
          });
        }
        else if (data.type === 'medication_updated') {
          setRoutine((prev: any) => {
            if (!prev) return prev;
            const newRoutine = { ...prev };
            newRoutine.days = newRoutine.days.map((day: any) => ({
              ...day,
              medications: day.medications?.map((med: any) => 
                med.id === data.id ? { ...med, is_completed: data.is_completed } : med
              )
            }));
            return newRoutine;
          });
        }
      } catch (e) {
        console.error("Error parsing WS message:", e);
      }
    };
    
    return () => {
      ws.close();
    }
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
                sets: itemSets ? Number.parseInt(itemSets) : null,
                reps: itemReps ? Number.parseInt(itemReps) : null
            });
        } else if (addingType === 'diet') {
            await api.post(`/routines/${id}/days/${selectedDay}/diets`, {
                name: itemName,
                calories: itemCalories ? Number.parseInt(itemCalories) : null,
                time_of_day: formattedTime
            });
        
        } else if (addingType === 'objective') {
            await api.post(`/routines/${id}/objectives`, {
                name: itemName,
                type: itemType || null,
                target_value: itemTargetValue ? parseFloat(itemTargetValue) : null,
                unit: itemUnit || null,
                recommended_date: itemRecommendedDate ? itemRecommendedDate.toISOString() : null,
                deadline_date: itemDeadlineDate ? itemDeadlineDate.toISOString() : null,
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

  const handleToggleObjective = async (obj: any) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      let isOverdue = false;
      if (obj.deadline_date) {
        const d = new Date(obj.deadline_date);
        d.setHours(0, 0, 0, 0);
        if (now > d) isOverdue = true;
      }
      
      if (isOverdue && !obj.is_completed) {
          Alert.alert('Plazo expirado', 'Este objetivo ya ha pasado su fecha límite.');
          return;
      }
      try {
          await api.put(`/routines/objectives/${obj.id}`, {
              is_completed: !obj.is_completed
          });
          fetchRoutine();
      } catch (e) {
          Alert.alert('Error', 'No se pudo actualizar el objetivo.');
      }
  };

  const handleToggleMedication = async (med: any) => {
      try {
          await api.patch(`/routines/medications/${med.id}`, {
              is_completed: !med.is_completed
          });
          fetchRoutine();
      } catch (e) {
          Alert.alert('Error', 'No se pudo actualizar la medicación.');
      }
  };

  const openModal = (type: 'exercise'|'diet'|'med'|'objective') => {
      setAddingType(type);
      setItemType('');
      setItemTargetValue('');
      setItemUnit('');
      setItemRecommendedDate(null);
      setItemDeadlineDate(null);
      setShowRecommendedPicker(false);
      setShowDeadlinePicker(false);
      setItemName('');
      setItemSets('');
      setItemReps('');
      setItemCalories('');
      setItemDose('');
      setItemTime('');
      setModalVisible(true);
  };

  const confirmDuplicateDays = async () => {
    if (selectedDaysForDuplicate.length === 0) {
      Alert.alert('Aviso', 'Selecciona al menos un día');
      return;
    }
    try {
      setCopyingDays(true);
      // Usar el nuevo endpoint que copia el contenido del día actual a otros días
      await api.post(`/routines/${id}/duplicate-day`, { 
        source_day: selectedDay,
        target_days: selectedDaysForDuplicate 
      });
      Alert.alert('Éxito', 'Rutina copiada a los días seleccionados');
      setShowDuplicateModal(false);
      setSelectedDaysForDuplicate([]);
      fetchRoutine();
    } catch (error: any) {
      console.error('Error duplicating day:', error);
      Alert.alert('Error', error.response?.data?.detail || 'No se pudo copiar la rutina');
    } finally {
      setCopyingDays(false);
    }
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
      <Stack.Screen 
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)/routines'); } }} style={{ marginRight: 16, padding: 4 }}>
              <Ionicons name="arrow-back" size={28} color={colors.text} />
            </TouchableOpacity>
          )
        }}
      />

      {/* Header bar / Back button */}
      

      {/* Selector de días */}
      <View style={styles.daysNav}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DAYS.map((dayName, index) => {
            const isSelected = selectedDay === index;
            const dayHasContent = routine.days.some((d: any) => d.day_of_week === index);
            return (
              <TouchableOpacity
                key={index}
                style={[
                    styles.dayTab, 
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    dayHasContent && !isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                ]}
                onPress={() => setSelectedDay(index)}
              >
                <Text style={{ color: isSelected ? '#FFF' : dayHasContent ? colors.primary : colors.text, fontWeight: 'bold' }}>
                  {dayName} {dayHasContent ? '✓' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{routine.name}</Text>
          <Text style={{ fontSize: 16, color: colors.icon, marginBottom: 20 }}>Visión del {DAYS[selectedDay]}</Text>

          
          {/* OBJETIVOS */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🎯 Objetivos de la Rutina</Text>
            {(!routine.creator_id || routine.creator_id === user?.id) && (
              <TouchableOpacity onPress={() => openModal('objective')}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>+ Añadir</Text>
              </TouchableOpacity>
            )}
          </View>
          {(!routine.objectives || routine.objectives.length === 0) && <Text style={{ color: colors.icon, marginBottom: 15 }}>Aún no hay objetivos.</Text>}
          {routine.objectives && routine.objectives.map((obj: any) => {
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              
              const deadline = obj.deadline_date ? new Date(obj.deadline_date) : null;
              if (deadline) deadline.setHours(0, 0, 0, 0);
              const recommended = obj.recommended_date ? new Date(obj.recommended_date) : null;
              if (recommended) recommended.setHours(0, 0, 0, 0);

              const isOverdue = deadline && now > deadline && !obj.is_completed;
              // Si se hace antes o en la fecha recomendada (y está completado) o simplemente completado:
              const isCompleted = obj.is_completed;
              const isRecommendedOk = isCompleted && recommended && now <= recommended;
              
              let statusColor = colors.text;
              if (isOverdue) statusColor = '#D32F2F'; // Rojo si expiró
              else if (isCompleted) statusColor = '#4CAF50'; // Verde si está completado.
              
              return (
                <View key={`obj-${obj.id}`} style={[styles.cardRow, { backgroundColor: isOverdue ? 'rgba(211, 47, 47, 0.1)' : colors.card, borderColor: isOverdue ? '#D32F2F' : (isCompleted ? '#4CAF50' : colors.border) }]}>
                    <TouchableOpacity
                        onPress={() => handleToggleObjective(obj)}
                        disabled={(isOverdue && !isCompleted) || routine.user_id !== user?.id}
                        style={{ marginRight: 12, justifyContent: 'center' }}
                    >
                        <Ionicons
                            name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
                            size={28}
                            color={isOverdue && !isCompleted ? "#D32F2F" : (isCompleted ? "#4CAF50" : colors.icon)}
                        />
                    </TouchableOpacity>
                    <View style={{ flex: 1, opacity: (isOverdue && !isCompleted) ? 0.6 : 1 }}>
                        <Text style={{ color: statusColor, fontWeight: 'bold', fontSize: 16, textDecorationLine: isCompleted ? 'line-through' : 'none' }}>{obj.name}</Text>
                        <Text style={{ color: colors.icon }}>{obj.target_value ? `Meta: ${obj.target_value} ${obj.unit || ''}` : ''}</Text>
                        <Text style={{ color: isOverdue && !isCompleted ? '#D32F2F' : colors.icon, fontSize: 12 }}>
                          {obj.deadline_date ? `Límite: ${new Date(obj.deadline_date).toLocaleDateString()}` : ''}
                        </Text>
                        <Text style={{ color: isRecommendedOk ? '#4CAF50' : colors.icon, fontSize: 12 }}>
                          {obj.recommended_date ? `Recomendada: ${new Date(obj.recommended_date).toLocaleDateString()}` : ''}
                        </Text>
                    </View>
                    {(!routine.creator_id || routine.creator_id === user?.id) && (
                      <TouchableOpacity onPress={() => handleDeleteItem('objective', obj.id)}>
                          <Ionicons name="trash-outline" size={24} color="#D32F2F" />
                      </TouchableOpacity>
                    )}
                </View>
              );
          })}

          {/* MEDICAMENTOS */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>💊 Medicación</Text>
            {(!routine.creator_id || routine.creator_id === user?.id) && (
              <TouchableOpacity onPress={() => openModal('med')}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>+ Añadir</Text>
              </TouchableOpacity>
            )}
          </View>
          {currentDayData.medications.length === 0 && <Text style={{ color: colors.icon, marginBottom: 15 }}>No hay medicación este día.</Text>}
          {currentDayData.medications.map((m: any) => {
              const isCompleted = m.is_completed;
              return (
                <View key={`med-${m.id}`} style={[styles.cardRow, { backgroundColor: colors.card, borderColor: isCompleted ? '#4CAF50' : colors.border }]}>
                    <TouchableOpacity
                        onPress={() => handleToggleMedication(m)}
                        disabled={routine.user_id !== user?.id}
                        style={{ marginRight: 12, justifyContent: 'center' }}
                    >
                        <Ionicons
                            name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
                            size={28}
                            color={isCompleted ? "#4CAF50" : colors.icon}
                        />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: isCompleted ? '#4CAF50' : colors.text, fontWeight: 'bold', fontSize: 16, textDecorationLine: isCompleted ? 'line-through' : 'none' }}>{m.name}</Text>
                        <Text style={{ color: colors.icon }}>Dosis: {m.dose} {m.time_of_day ? `| Hora: ${m.time_of_day}` : ''}</Text>
                    </View>
                    {(!routine.creator_id || routine.creator_id === user?.id) && (
                      <TouchableOpacity onPress={() => handleDeleteItem('medication', m.id)}>
                          <Ionicons name="trash-outline" size={24} color="#D32F2F" />
                      </TouchableOpacity>
                    )}
                </View>
              );
          })}

          {/* TABLA DE EJERCICIOS */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🏋️ Tabla de Ejercicios</Text>
            {(!routine.creator_id || routine.creator_id === user?.id) && (
              <TouchableOpacity onPress={() => openModal('exercise')}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>+ Añadir</Text>
              </TouchableOpacity>
            )}
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
                  {(!routine.creator_id || routine.creator_id === user?.id) && (
                    <TouchableOpacity onPress={() => handleDeleteItem('exercise', ex.id)}>
                        <Ionicons name="trash-outline" size={24} color="#D32F2F" />
                    </TouchableOpacity>
                  )}
              </View>
          ))}

          {/* DIETAS Y COMIDAS */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🥗 Comidas / Dieta</Text>
            {(!routine.creator_id || routine.creator_id === user?.id) && (
              <TouchableOpacity onPress={() => openModal('diet')}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>+ Añadir</Text>
              </TouchableOpacity>
            )}
          </View>
          {currentDayData.diet_items.length === 0 && <Text style={{ color: colors.icon, marginBottom: 15 }}>Sin dieta establecida para hoy.</Text>}
          {currentDayData.diet_items.map((d: any) => (
              <View key={`diet-${d.id}`} style={[styles.cardRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>{d.name}</Text>
                      <Text style={{ color: colors.icon }}>{d.calories ? `${d.calories} kcal` : 'Sin kcal prop.'} {d.time_of_day ? `| Hora: ${d.time_of_day}` : ''}</Text>
                  </View>
                  {(!routine.creator_id || routine.creator_id === user?.id) && (
                    <TouchableOpacity onPress={() => handleDeleteItem('diet', d.id)}>
                        <Ionicons name="trash-outline" size={24} color="#D32F2F" />
                    </TouchableOpacity>
                  )}
              </View>
          ))}
          
          {/* Sección para copiar a otros días */}
          {(!routine.creator_id || routine.creator_id === user?.id) && (
            <View style={{ marginTop: 32, marginBottom: 20, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20 }}>
              <TouchableOpacity 
                style={{ backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, borderWidth: 2, borderColor: colors.primary }}
                onPress={() => setShowDuplicateModal(true)}
              >
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16, textAlign: 'center' }}>
                  📋 Añadir esta rutina para otros días
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Añadir Item */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20 }}>
                {addingType === 'exercise' ? 'Añadir Ejercicio' : addingType === 'diet' ? 'Añadir Comida' : addingType === 'objective' ? 'Añadir Objetivo' : 'Añadir Medicación'}
            </Text>

            <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder={addingType === 'med' ? "Nombre píldora (Ej. Ibuprofeno)" : addingType === 'objective' ? "Nombre (Ej. Llegar a 90 Kg)" : "Nombre"}
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
            
            
            {addingType === 'objective' && (
                <>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TextInput style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder="Valor objetivo (ej. 90)" placeholderTextColor={colors.icon} keyboardType="numeric" value={itemTargetValue} onChangeText={setItemTargetValue} />
                      <TextInput style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} placeholder="Unidad (ej. kg, bpm)" placeholderTextColor={colors.icon} value={itemUnit} onChangeText={setItemUnit} />
                  </View>
                  {Platform.OS === 'web' ? (
                    <>
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                        <Text style={{ color: colors.text, alignSelf: 'center', width: 120 }}>F. Recomendada</Text>
                        <input
                          type="date"
                          style={{ flex: 1, padding: 10, borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.background, color: colors.text, fontSize: 16 }}
                          value={itemRecommendedDate ? formatDate(itemRecommendedDate) : ''}
                          onChange={(e) => {
                            if (e.target.value) setItemRecommendedDate(new Date(e.target.value));
                            else setItemRecommendedDate(null);
                          }}
                        />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                        <Text style={{ color: colors.text, alignSelf: 'center', width: 120 }}>F. Límite</Text>
                        <input
                          type="date"
                          style={{ flex: 1, padding: 10, borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.background, color: colors.text, fontSize: 16 }}
                          value={itemDeadlineDate ? formatDate(itemDeadlineDate) : ''}
                          onChange={(e) => {
                            if (e.target.value) setItemDeadlineDate(new Date(e.target.value));
                            else setItemDeadlineDate(null);
                          }}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity onPress={() => setShowRecommendedPicker(true)} style={[styles.input, { flex: 1, borderColor: colors.border, backgroundColor: colors.background, justifyContent: 'center' }]}>
                            <Text style={{ color: itemRecommendedDate ? colors.text : colors.icon }}>{itemRecommendedDate ? formatDate(itemRecommendedDate) : 'F. Recomendada'}</Text>
                          </TouchableOpacity>
                      </View>
                      {showRecommendedPicker && (
                        <DateTimePicker
                          value={itemRecommendedDate || new Date()}
                          mode="date"
                          display="default"
                          onChange={(event, selectedDate) => {
                            setShowRecommendedPicker(Platform.OS === 'ios');
                            if (selectedDate) setItemRecommendedDate(selectedDate);
                          }}
                        />
                      )}
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity onPress={() => setShowDeadlinePicker(true)} style={[styles.input, { flex: 1, borderColor: colors.border, backgroundColor: colors.background, justifyContent: 'center' }]}>
                            <Text style={{ color: itemDeadlineDate ? colors.text : colors.icon }}>{itemDeadlineDate ? formatDate(itemDeadlineDate) : 'F. Límite'}</Text>
                          </TouchableOpacity>
                      </View>
                      {showDeadlinePicker && (
                        <DateTimePicker
                          value={itemDeadlineDate || new Date()}
                          mode="date"
                          display="default"
                          onChange={(event, selectedDate) => {
                            setShowDeadlinePicker(Platform.OS === 'ios');
                            if (selectedDate) setItemDeadlineDate(selectedDate);
                          }}
                        />
                      )}
                    </>
                  )}
                </>
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

      {/* Modal Copiar a otros días */}
      <Modal visible={showDuplicateModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: '80%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
                Copiar a otros días
              </Text>
              <Text style={{ fontSize: 14, color: colors.icon, marginBottom: 16 }}>
                Copiando contenido de <Text style={{ fontWeight: 'bold', color: colors.primary }}>{DAYS[selectedDay]}</Text> a:
              </Text>
              
              {DAYS.map((dayName, index) => {
                const isSelected = selectedDaysForDuplicate.includes(index);
                const isSourceDay = index === selectedDay;
                const bgColor = isSelected ? colors.primaryLight : colors.background;
                const borderClr = isSelected ? colors.primary : colors.border;
                const textOpacity = isSourceDay ? 0.5 : 1;
                const textColor = isSourceDay ? colors.icon : (isSelected ? colors.primary : colors.text);
                const icon = isSourceDay ? '📍' : (isSelected ? '✅' : '☐');
                
                return (
                  <TouchableOpacity
                    key={`day-${index}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      marginBottom: 8,
                      borderRadius: 12,
                      backgroundColor: bgColor,
                      borderWidth: 1,
                      borderColor: borderClr,
                      opacity: textOpacity,
                    }}
                    onPress={() => {
                      if (isSourceDay) {
                        Alert.alert('Aviso', `${dayName} es el día de origen (ya tiene este contenido)`);
                        return;
                      }
                      if (isSelected) {
                        setSelectedDaysForDuplicate(selectedDaysForDuplicate.filter(d => d !== index));
                      } else {
                        setSelectedDaysForDuplicate([...selectedDaysForDuplicate, index]);
                      }
                    }}
                    disabled={isSourceDay}
                  >
                    <Text style={{ fontSize: 20, marginRight: 12 }}>
                      {icon}
                    </Text>
                    <Text style={{ 
                      color: textColor, 
                      fontSize: 16, 
                      fontWeight: isSelected ? '600' : '500', 
                      flex: 1 
                    }}>
                      {dayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center' }}
                  onPress={() => {
                    setShowDuplicateModal(false);
                    setSelectedDaysForDuplicate([]);
                  }}
                  disabled={copyingDays}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', opacity: selectedDaysForDuplicate.length > 0 && !copyingDays ? 1 : 0.5 }}
                  onPress={confirmDuplicateDays}
                  disabled={selectedDaysForDuplicate.length === 0 || copyingDays}
                >
                  {copyingDays ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Copiar ({selectedDaysForDuplicate.length})</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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