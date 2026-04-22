import { StyleSheet, Text, View, ScrollView, Pressable, Modal, Image, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import api from '@/services/api';

type ReportPoint = {
  date: string;
  value: number;
};

type ProgressReport = {
  routineName: string;
  routineStart: string;
  stats: {
    totalActivities: number;
    totalDistanceKm: number;
    totalSteps: number;
  };
  graphs: {
    bpmOverTime: ReportPoint[];
    stepsOverTime: ReportPoint[];
    weightOverTime: ReportPoint[];
  };
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [routines, setRoutines] = useState(0);
  const [events, setEvents] = useState(0);
  const [weekStats, setWeekStats] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [routinesData, setRoutinesData] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [dayActivityMap, setDayActivityMap] = useState<{ [key: number]: { routines: number; events: number } }>({});
  const [monthlyDistance, setMonthlyDistance] = useState(0);
  const [monthlySteps, setMonthlySteps] = useState(0);
  const [progressReport, setProgressReport] = useState<ProgressReport | null>(null);
  const [selectedReportRoutineId, setSelectedReportRoutineId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const buildProgressReport = (routinesList: any[], eventsList: any[], selectedRoutineId: number | null): ProgressReport | null => {
    if (!Array.isArray(routinesList) || routinesList.length === 0) {
      return null;
    }

    const selectedRoutine = routinesList.find((routine) => routine?.id === selectedRoutineId) || routinesList[0];
    const routineStartDate = selectedRoutine?.created_at ? new Date(selectedRoutine.created_at) : new Date();
    const validStartDate = Number.isNaN(routineStartDate.getTime()) ? new Date() : routineStartDate;

    const relevantEvents = (eventsList || []).filter((event: any) => {
      if (!event?.timestamp) return false;
      const eventDate = new Date(event.timestamp);
      if (Number.isNaN(eventDate.getTime())) return false;
      if (selectedRoutine?.id) {
        return event?.routine_id === selectedRoutine.id;
      }
      return eventDate >= validStartDate;
    });

    let totalActivities = 0;
    let totalDistanceKm = 0;
    let totalSteps = 0;
    const bpmOverTime: ReportPoint[] = [];
    const stepsOverTime: ReportPoint[] = [];
    const weightOverTime: ReportPoint[] = [];

    relevantEvents.forEach((event: any) => {
      const eventDate = new Date(event.timestamp);
      const dateStr = eventDate.toISOString().split('T')[0];

      if (['activity', 'walking', 'running', 'Caminar', 'Correr'].includes(event?.event_type) && event?.activity_log) {
        totalActivities += 1;
        const distance = Number(event.activity_log.distance_km || 0);
        const steps = Number(event.activity_log.steps || 0);
        totalDistanceKm += Number.isNaN(distance) ? 0 : distance;
        totalSteps += Number.isNaN(steps) ? 0 : steps;

        if (steps > 0) {
          stepsOverTime.push({ date: dateStr, value: steps });
        }
      }

      const bpmValue = Number(event?.biometric?.heart_rate_avg || 0);
      if (event?.event_type === 'biometric' && bpmValue > 0) {
        bpmOverTime.push({ date: dateStr, value: bpmValue });
      }

      const weightValue = Number(event?.weight_log?.weight_kg || 0);
      if (event?.event_type === 'weight' && weightValue > 0) {
        weightOverTime.push({ date: dateStr, value: weightValue });
      }
    });

    return {
      routineName: selectedRoutine?.name || 'Rutina actual',
      routineStart: validStartDate.toISOString(),
      stats: {
        totalActivities,
        totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
        totalSteps,
      },
      graphs: {
        bpmOverTime,
        stepsOverTime,
        weightOverTime,
      },
    };
  };

  const toLineData = (points: ReportPoint[]) => {
    const trimmed = points.slice(-7);
    return {
      labels: trimmed.map((point) => {
        const date = new Date(point.date);
        return Number.isNaN(date.getTime()) ? '' : `${date.getDate()}`;
      }),
      datasets: [{ data: trimmed.map((point) => point.value) }],
    };
  };

  const fetchStats = async () => {
    try {
      const routinesRes = await api.get('/routines/');
      const eventsRes = await api.get('/events/');
      
      const routinesDataFetch = routinesRes.data || [];
      const eventsDataFetch = eventsRes.data || [];
      
      setRoutines(routinesDataFetch.length);
      setEvents(eventsDataFetch.length);
      setRoutinesData(routinesDataFetch);
      setEventsData(eventsDataFetch);
      
      // Calcular actividad de esta semana (rutinas recurrentes + eventos)
      const today = new Date();
      const currentDay = today.getDay();
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
      const mondayOfWeek = new Date(today);
      mondayOfWeek.setDate(today.getDate() - daysFromMonday);
      mondayOfWeek.setHours(0, 0, 0, 0);
      
      const sundayOfWeek = new Date(mondayOfWeek);
      sundayOfWeek.setDate(mondayOfWeek.getDate() + 6);
      sundayOfWeek.setHours(23, 59, 59, 999);
      
      const weekData = [0, 0, 0, 0, 0, 0, 0]; // Lun, Mar, Mié, Jue, Vie, Sab, Dom
      const activityMap: { [key: number]: { routines: number; events: number } } = {};
      
      // Contar rutinas recurrentes por día de la semana
      routinesDataFetch.forEach((routine: any) => {
        if (routine.days && Array.isArray(routine.days)) {
          routine.days.forEach((routineDay: any) => {
            // day_of_week: 0=Lunes, 6=Domingo
            if (routineDay.day_of_week >= 0 && routineDay.day_of_week <= 6) {
              weekData[routineDay.day_of_week]++;
            }
          });
        }
      });
      
      let tempDistance = 0;
      let tempSteps = 0;

      // Contar eventos que caen en esta semana y sumar datos mensuales
      eventsDataFetch.forEach((event: any) => {
        if (event.timestamp) {
          const eventDate = new Date(event.timestamp);
          
          if (eventDate >= mondayOfWeek && eventDate <= sundayOfWeek) {
            const dayOfWeek = eventDate.getDay();
            const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            weekData[dayIndex]++;
          }

          if (eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear()) {
            if (event.activity_log) {
               tempDistance += event.activity_log.distance_km || 0;
               tempSteps += event.activity_log.steps || 0;
            }
          }
        }
      });

      setMonthlyDistance(tempDistance);
      setMonthlySteps(tempSteps);
      const hasSelectedRoutine = selectedReportRoutineId !== null && routinesDataFetch.some((routine: any) => routine.id === selectedReportRoutineId);
      const reportRoutineId = hasSelectedRoutine ? selectedReportRoutineId : (routinesDataFetch[0]?.id ?? null);

      if (!hasSelectedRoutine && reportRoutineId !== null) {
        setSelectedReportRoutineId(reportRoutineId);
      }

      setProgressReport(buildProgressReport(routinesDataFetch, eventsDataFetch, reportRoutineId));
      
      // Mapear actividad por día del mes
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        let routineCount = 0;
        let eventCount = 0;
        
        const dayDate = new Date(year, month, day);
        const dayOfWeek = dayDate.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        routinesDataFetch.forEach((routine: any) => {
          if (routine.days && Array.isArray(routine.days)) {
            routine.days.forEach((routineDay: any) => {
              if (routineDay.day_of_week === dayIndex) {
                routineCount++;
              }
            });
          }
        });
        
        eventsDataFetch.forEach((event: any) => {
          if (event.timestamp) {
            const eventDate = new Date(event.timestamp);
            if (eventDate.getDate() === day && eventDate.getMonth() === month && eventDate.getFullYear() === year) {
              eventCount++;
            }
          }
        });
        
        if (routineCount > 0 || eventCount > 0) {
          activityMap[day] = { routines: routineCount, events: eventCount };
        }
      }
      
      setDayActivityMap(activityMap);
      console.log('Weekly activity:', weekData);
      setWeekStats(weekData);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const getDaysOfMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getMonthName = () => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[new Date().getMonth()];
  };

  const getTodayDate = () => new Date().getDate();

  const handleStatPress = (screen: 'routines' | 'events') => {
    router.push(`/(tabs)/${screen}` as any);
  };

  const handleDayPress = (day: number | null) => {
    if (day !== null) {
      setSelectedDay(day);
      setDayModalVisible(true);
    }
  };

  const handleFeaturePress = (feature: string) => {
    switch (feature) {
      case 'Tu Resumen':
        router.push('/(tabs)');
        break;
      case 'Rutinas':
        router.push('/(tabs)/routines');
        break;
      case 'Eventos':
        router.push('/(tabs)/events');
        break;
      case 'Chat Médico':
        router.push('/(tabs)/chat');
        break;
    }
  };

  const handleSelectProgressRoutine = (routineId: number) => {
    setSelectedReportRoutineId(routineId);
    setProgressReport(buildProgressReport(routinesData, eventsData, routineId));
  };

  const features = [
    {
      icon: '📊',
      title: t('yourSummary'),
      description: t('summaryDesc'),
    },
    {
      icon: '🏋️',
      title: t('routines'),
      description: t('routinesDesc'),
    },
    {
      icon: '📅',
      title: t('events'),
      description: t('eventsDesc'),
    },
    {
      icon: '💬',
      title: t('chat'),
      description: t('chatDesc'),
    },
  ];

  const maxStat = Math.max(...weekStats);
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom'];
  const chartWidth = Math.max(Dimensions.get('window').width - 96, 240);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
      {/* Header Hero */}
      <View style={[styles.heroSection, { backgroundColor: colors.primary }]}>
        <Text style={styles.heroGreeting}>
          {t('hello')}, {user?.username}! 👋
        </Text>
        <Text style={styles.heroSubtitle}>
          {t('welcomeMsg')}
        </Text>
        
        <View style={[styles.avatarPlaceholder, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
          {user?.profile_picture ? (
             <Image source={{ uri: user.profile_picture }} style={{ width: 48, height: 48, borderRadius: 24 }} />
          ) : (
             <Text style={styles.avatarText}>
               {user?.username?.charAt(0).toUpperCase() || '👤'}
             </Text>
          )}
        </View>

      </View>

      {/* Stats Cards */}
      <View style={[styles.statsContainer, { flexWrap: 'wrap' }]}>
        <Pressable
          onPress={() => handleStatPress('routines')}
          style={({ pressed }) => [
            styles.statBox,
            { backgroundColor: colors.primaryLight, minWidth: '45%' },
            pressed && styles.statBoxPressed,
          ]}>
          <Text style={styles.statNumber}>{routines}</Text>
          <Text style={[styles.statLabel, { color: colors.primary }]}>{t('routines')}</Text>
          <Text style={[styles.statSubtext, { color: colors.primary }]}>{t('active')}</Text>
        </Pressable>
        <Pressable
          onPress={() => handleStatPress('events')}
          style={({ pressed }) => [
            styles.statBox,
            { backgroundColor: colors.secondaryLight, minWidth: '45%' },
            pressed && styles.statBoxPressed,
          ]}>
          <Text style={styles.statNumber}>{events}</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>{t('events')}</Text>
          <Text style={[styles.statSubtext, { color: colors.secondary }]}>{t('registered')}</Text>
        </Pressable>
        <Pressable
          onPress={() => handleStatPress('events')}
          style={({ pressed }) => [
            styles.statBox,
            { backgroundColor: colors.accentLight, minWidth: '45%' },
            pressed && styles.statBoxPressed,
          ]}>
          <Text style={styles.statNumber}>{monthlyDistance.toFixed(1)}</Text>
          <Text style={[styles.statLabel, { color: colors.accent }]}>Km</Text>
          <Text style={[styles.statSubtext, { color: colors.accent }]}>este mes</Text>
        </Pressable>
        <Pressable
          onPress={() => handleStatPress('events')}
          style={({ pressed }) => [
            styles.statBox,
            { backgroundColor: colors.accentLight, minWidth: '45%' },
            pressed && styles.statBoxPressed,
          ]}>
          <Text style={styles.statNumber}>{monthlySteps}</Text>
          <Text style={[styles.statLabel, { color: colors.accent }]}>Pasos</Text>
          <Text style={[styles.statSubtext, { color: colors.accent }]}>este mes</Text>
        </Pressable>
      </View>




      {/* Weekly Activity Chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>📊 {t('activityThisWeek')}</Text>
        <View style={styles.chartContainer}>
          {weekStats.map((value, index) => {
            const dayLabel = dayLabels[index];
            return (
              <Pressable
                key={dayLabel}
                onPress={() => handleDayPress(index)}
                style={styles.barWrapper}>
                <View style={styles.barLabels}>
                  <Text style={[styles.barValue, { color: colors.primary }]}>{value}</Text>
                </View>
                <View
                  style={[
                    styles.bar,
                    {
                      height: maxStat > 0 ? (value / maxStat) * 120 : 10,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
                <Text style={[styles.dayLabel, { color: colors.icon }]}>{dayLabels[index]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Progress Report */}
      {progressReport && (
        <View style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.reportTitle, { color: colors.text }]}>📄 Reporte de progreso</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reportRoutineSelector}>
            {routinesData.map((routine: any) => {
              const isSelected = selectedReportRoutineId === routine.id;
              return (
                <TouchableOpacity
                  key={routine.id}
                  style={[
                    styles.reportRoutineChip,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primaryLight : colors.background,
                    },
                  ]}
                  onPress={() => handleSelectProgressRoutine(routine.id)}
                >
                  <Text
                    style={{
                      color: isSelected ? colors.primary : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                      fontSize: 12,
                    }}
                  >
                    {routine.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={[styles.reportSubtitle, { color: colors.icon }]}>Rutina: {progressReport.routineName}</Text>
          <Text style={[styles.reportSubtitle, { color: colors.icon }]}>Desde: {new Date(progressReport.routineStart).toLocaleDateString()}</Text>

          <View style={styles.reportStatsGrid}>
            <View style={[styles.reportStatChip, { backgroundColor: colors.primaryLight }]}> 
              <Text style={[styles.reportStatLabel, { color: colors.primary }]}>Actividades</Text>
              <Text style={[styles.reportStatValue, { color: colors.primary }]}>{progressReport.stats.totalActivities}</Text>
            </View>
            <View style={[styles.reportStatChip, { backgroundColor: colors.secondaryLight }]}> 
              <Text style={[styles.reportStatLabel, { color: colors.secondary }]}>Distancia</Text>
              <Text style={[styles.reportStatValue, { color: colors.secondary }]}>{progressReport.stats.totalDistanceKm.toFixed(2)} km</Text>
            </View>
            <View style={[styles.reportStatChip, { backgroundColor: colors.accentLight }]}> 
              <Text style={[styles.reportStatLabel, { color: colors.accent }]}>Pasos</Text>
              <Text style={[styles.reportStatValue, { color: colors.accent }]}>{progressReport.stats.totalSteps}</Text>
            </View>
          </View>

          {progressReport.graphs.bpmOverTime.length === 0 &&
            progressReport.graphs.stepsOverTime.length === 0 &&
            progressReport.graphs.weightOverTime.length === 0 && (
              <Text style={[styles.reportEmptyState, { color: colors.icon }]}>Aún no hay datos suficientes para graficar.</Text>
            )}

          {progressReport.graphs.bpmOverTime.length > 0 && (
            <View style={styles.reportChartBlock}>
              <Text style={[styles.reportChartTitle, { color: colors.text }]}>Evolución BPM</Text>
              <LineChart
                data={toLineData(progressReport.graphs.bpmOverTime)}
                width={chartWidth}
                height={170}
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  propsForDots: { r: '3', strokeWidth: '1' },
                }}
                bezier
                style={styles.reportChart}
              />
            </View>
          )}

          {progressReport.graphs.stepsOverTime.length > 0 && (
            <View style={styles.reportChartBlock}>
              <Text style={[styles.reportChartTitle, { color: colors.text }]}>Evolución Pasos</Text>
              <LineChart
                data={toLineData(progressReport.graphs.stepsOverTime)}
                width={chartWidth}
                height={170}
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  propsForDots: { r: '3', strokeWidth: '1' },
                }}
                bezier
                style={styles.reportChart}
              />
            </View>
          )}

          {progressReport.graphs.weightOverTime.length > 0 && (
            <View style={styles.reportChartBlock}>
              <Text style={[styles.reportChartTitle, { color: colors.text }]}>Evolución Peso</Text>
              <LineChart
                data={toLineData(progressReport.graphs.weightOverTime)}
                width={chartWidth}
                height={170}
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  propsForDots: { r: '3', strokeWidth: '1' },
                }}
                bezier
                style={styles.reportChart}
              />
            </View>
          )}
        </View>
      )}

      {/* Calendar */}
      <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>📅 {getMonthName()}</Text>
        <View style={styles.calendarGrid}>
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
            <Text key={`week-${day}`} style={[styles.weekDay, { color: colors.primary }]}>
              {day}
            </Text>
          ))}
          {getDaysOfMonth().map((day) => {
            const today = getTodayDate();
            const isToday = day === today;
            const cellKey = day ? `day-${day}` : `empty-${Math.random()}`;
            const hasActivity = day && dayActivityMap[day];
            const activity = hasActivity ? dayActivityMap[day] : null;
            const totalActivity = activity ? activity.routines + activity.events : 0;
            let backgroundColor = colors.gray50;
            let borderColor = colors.border;
            let textColor = colors.text;
            const cellOpacity = day ? 1 : 0;

            if (hasActivity) {
              backgroundColor = colors.primaryLight;
              borderColor = colors.primary;
              textColor = colors.primary;
            }

            if (isToday) {
              backgroundColor = colors.primary;
              borderColor = colors.primary;
              textColor = '#fff';
            }

            return (
              <Pressable
                key={cellKey}
                onPress={() => handleDayPress(day)}
                disabled={!day}
                style={({ pressed }) => {
                  let currentOpacity = 0;
                  if (day) {
                    currentOpacity = cellOpacity;
                    if (pressed) {
                      currentOpacity = 0.8;
                    }
                  }
                  return [
                    styles.dayCell,
                    {
                      backgroundColor,
                      borderColor,
                      opacity: currentOpacity,
                    },
                  ];
                }}>
                <Text style={[styles.dayNumber, { color: textColor }]}>
                  {day}
                </Text>
                {hasActivity && totalActivity > 0 && (
                  <View style={[styles.activityIndicator, { backgroundColor: colors.primary }]}>
                    <Text style={styles.activityCount}>{totalActivity}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Health Tips */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('healthTipToday')}
        </Text>
        <View style={[styles.tipCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Text style={[styles.tipIcon, { color: colors.primary }]}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: colors.primary }]}>
              {t('dailyHydration')}
            </Text>
            <Text style={[styles.tipText, { color: colors.text }]}>
              {t('hydrationDesc')}
            </Text>
          </View>
        </View>
      </View>

      {/* Featured Section */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('mainFeatures')}
        </Text>
        <View style={styles.featuresContainer}>
          {features.map((feature) => (
            <Pressable
              key={feature.title}
              onPress={() => handleFeaturePress(feature.title)}
              style={({ pressed }) => [
                styles.featureCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}>
              <View style={[styles.featureGradient, { backgroundColor: colors.primary }]}>
                <Text style={styles.featureEmoji}>{feature.icon}</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: colors.icon }]}>
                  {feature.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Spacing */}
      <View style={{ height: 30 }} />
    </ScrollView>

    {/* Day Details Modal */}
    <Modal
      animationType="slide"
      transparent={true}
      visible={dayModalVisible}
      onRequestClose={() => setDayModalVisible(false)}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedDay} de {getMonthName()}
            </Text>
            <Pressable
              onPress={() => setDayModalVisible(false)}
              style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalBody}>
            {selectedDay && dayActivityMap[selectedDay] ? (
              <>
                {dayActivityMap[selectedDay].routines > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={[styles.activitySectionTitle, { color: colors.primary }]}>{t('routines')} ({dayActivityMap[selectedDay].routines})</Text>
                    {routinesData.map((routine: any) => {
                      const year = new Date().getFullYear();
                      const month = new Date().getMonth();
                      const dayDate = new Date(year, month, selectedDay);
                      const dayOfWeek = dayDate.getDay();
                      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                      
                      const hasDay = routine.days?.some((d: any) => d.day_of_week === dayIndex);
                      return hasDay ? (
                        <View key={routine.id} style={[styles.activityItem, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                          <Text style={{ color: colors.primary, fontWeight: '600' }}>{routine.name}</Text>
                          {routine.description && <Text style={{ color: colors.icon, fontSize: 12 }}>{routine.description}</Text>}
                        </View>
                      ) : null;
                    })}
                  </View>
                )}
                {dayActivityMap[selectedDay].events > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={[styles.activitySectionTitle, { color: colors.secondary }]}>{t('events')} ({dayActivityMap[selectedDay].events})</Text>
                    {eventsData.map((event: any) => {
                      if (event.timestamp) {
                        const eventDate = new Date(event.timestamp);
                        const year = new Date().getFullYear();
                        const month = new Date().getMonth();
                        
                        if (eventDate.getDate() === selectedDay && eventDate.getMonth() === month && eventDate.getFullYear() === year) {
                          return (
                            <View key={event.id} style={[styles.activityItem, { backgroundColor: colors.secondaryLight, borderColor: colors.secondary }]}>
                              <Text style={{ color: colors.secondary, fontWeight: '600' }}>{event.name}</Text>
                              <Text style={{ color: colors.icon, fontSize: 12 }}>{new Date(event.timestamp).toLocaleTimeString()}</Text>
                            </View>
                          );
                        }
                      }
                      return null;
                    })}
                  </View>
                )}
              </>
            ) : (
              <Text style={[styles.noEventsText, { color: colors.icon }]}>
                {t('noEvents')}
              </Text>
            )}
          </ScrollView>
          <Pressable
            onPress={() => {
              setDayModalVisible(false);
              router.push('/(tabs)/events');
            }}
            style={({ pressed }) => [
              styles.modalButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 },
            ]}>
            <Text style={styles.modalButtonText}>{t('addEvent')}</Text>
          </Pressable>
        </View>
      </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 0,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGreeting: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: -24,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6366F1',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  statSubtext: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
    opacity: 0.7,
  },
  chartCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 180,
    gap: 8,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  barLabels: {
    minHeight: 24,
    justifyContent: 'center',
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  bar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 10,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  weekDay: {
    width: '14.28%',
    aspectRatio: 1,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 11,
    marginBottom: 4,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  featuresContainer: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  featureGradient: {
    width: 64,
    height: 64,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
    backgroundColor: '#6366F1',
  },
  featureEmoji: {
    fontSize: 32,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  tipCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tipIcon: {
    fontSize: 32,
    marginTop: 2,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  statBoxPressed: {
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  modalBody: {
    marginBottom: 20,
  },
  noEventsText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  activityIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  activitySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  activityItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  reportCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  reportSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  reportRoutineSelector: {
    marginTop: 8,
    marginBottom: 10,
  },
  reportRoutineChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  reportStatsGrid: {
    marginTop: 14,
    marginBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportStatChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: '31%',
  },
  reportStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  reportStatValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  reportEmptyState: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
  },
  reportChartBlock: {
    marginTop: 14,
  },
  reportChartTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  reportChart: {
    borderRadius: 12,
  },
});
