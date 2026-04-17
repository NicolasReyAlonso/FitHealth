import { StyleSheet, Text, View, ScrollView, Pressable, Modal } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import api from '@/services/api';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [routines, setRoutines] = useState(0);
  const [events, setEvents] = useState(0);
  const [weekStats, setWeekStats] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const fetchStats = async () => {
    try {
      const routinesRes = await api.get('/routines/');
      const eventsRes = await api.get('/events/');
      
      const routinesData = routinesRes.data || [];
      const eventsData = eventsRes.data || [];
      
      setRoutines(routinesData.length);
      setEvents(eventsData.length);
      
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
      
      // Contar rutinas recurrentes por día de la semana
      routinesData.forEach((routine: any) => {
        if (routine.days && Array.isArray(routine.days)) {
          routine.days.forEach((routineDay: any) => {
            // day_of_week: 0=Lunes, 6=Domingo
            if (routineDay.day_of_week >= 0 && routineDay.day_of_week <= 6) {
              weekData[routineDay.day_of_week]++;
            }
          });
        }
      });
      
      // Contar eventos que caen en esta semana
      eventsData.forEach((event: any) => {
        if (event.timestamp) {
          const eventDate = new Date(event.timestamp);
          console.log('Event:', event.name, 'Timestamp:', event.timestamp, 'Parsed date:', eventDate);
          console.log('Monday:', mondayOfWeek, 'Sunday:', sundayOfWeek);
          console.log('Is in range?', eventDate >= mondayOfWeek && eventDate <= sundayOfWeek);
          
          if (eventDate >= mondayOfWeek && eventDate <= sundayOfWeek) {
            const dayOfWeek = eventDate.getDay();
            const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            weekData[dayIndex]++;
            console.log('✅ Event counted on day', dayOfWeek, 'index', dayIndex);
          }
        }
      });
      
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

  const features = [
    {
      icon: '📊',
      title: 'Tu Resumen',
      description: 'Registra tus rutinas, eventos de salud y chatea con tu doctor',
    },
    {
      icon: '🏋️',
      title: 'Rutinas',
      description: 'Crea rutinas combinando ejercicios y dieta para tus objetivos',
    },
    {
      icon: '📅',
      title: 'Eventos',
      description: 'Registra datos biométricos, agua, actividad y peso',
    },
    {
      icon: '💬',
      title: 'Chat Médico',
      description: 'Comunícate directamente con tu doctor para resolver dudas',
    },
  ];

  const maxStat = Math.max(...weekStats);
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom'];

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
          ¡Hola, {user?.username}! 👋
        </Text>
        <Text style={styles.heroSubtitle}>
          Bienvenido a tu espacio de salud
        </Text>
        <View style={[styles.avatarPlaceholder, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <Text style={styles.avatarText}>
            {user?.username?.charAt(0).toUpperCase() || '👤'}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Pressable
          onPress={() => handleStatPress('routines')}
          style={({ pressed }) => [
            styles.statBox,
            { backgroundColor: colors.primaryLight },
            pressed && styles.statBoxPressed,
          ]}>
          <Text style={styles.statNumber}>{routines}</Text>
          <Text style={[styles.statLabel, { color: colors.primary }]}>Rutinas</Text>
          <Text style={[styles.statSubtext, { color: colors.primary }]}>activas</Text>
        </Pressable>
        <Pressable
          onPress={() => handleStatPress('events')}
          style={({ pressed }) => [
            styles.statBox,
            { backgroundColor: colors.secondaryLight },
            pressed && styles.statBoxPressed,
          ]}>
          <Text style={styles.statNumber}>{events}</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Eventos</Text>
          <Text style={[styles.statSubtext, { color: colors.secondary }]}>registrados</Text>
        </Pressable>
        <Pressable
          onPress={() => handleStatPress('events')}
          style={({ pressed }) => [
            styles.statBox,
            { backgroundColor: `${colors.accent}15` },
            pressed && styles.statBoxPressed,
          ]}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={[styles.statLabel, { color: colors.accent }]}>Kilómetros</Text>
          <Text style={[styles.statSubtext, { color: colors.accent }]}>esta semana</Text>
        </Pressable>
      </View>




      {/* Weekly Activity Chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>📊 Actividad de esta semana</Text>
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
            const cellKey = day !== null ? `day-${day}` : `empty-${Math.random()}`;
            return (
              <Pressable
                key={cellKey}
                onPress={() => handleDayPress(day)}
                disabled={day === null}
                style={({ pressed }) => [
                  styles.dayCell,
                  {
                    backgroundColor: isToday ? colors.primary : colors.gray50,
                    borderColor: isToday ? colors.primary : colors.border,
                    opacity: day === null ? 0 : pressed && day !== null ? 0.8 : 1,
                  },
                ]}>
                <Text style={[styles.dayNumber, { color: isToday ? '#fff' : colors.text }]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Health Tips */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Consejo de salud hoy
        </Text>
        <View style={[styles.tipCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Text style={[styles.tipIcon, { color: colors.primary }]}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: colors.primary }]}>
              Hidratación diaria
            </Text>
            <Text style={[styles.tipText, { color: colors.text }]}>
              Bebe al menos 2 litros de agua al día para mantener tu cuerpo hidratado y saludable.
            </Text>
          </View>
        </View>
      </View>

      {/* Featured Section */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Características principales
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
              Eventos - {selectedDay} de {getMonthName()}
            </Text>
            <Pressable
              onPress={() => setDayModalVisible(false)}
              style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.noEventsText, { color: colors.icon }]}>
              Pulsa el botón "Eventos" para agregar registros del día {selectedDay}
            </Text>
          </View>
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
            <Text style={styles.modalButtonText}>Ver Eventos</Text>
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
});
