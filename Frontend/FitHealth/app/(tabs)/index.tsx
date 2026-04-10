import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import api from '@/services/api';

export default function HomeScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [routines, setRoutines] = useState(0);
  const [events, setEvents] = useState(0);
  const [weekStats, setWeekStats] = useState([0, 0, 0, 0, 0, 0, 0]);

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
      
      // Calcular eventos de los últimos 7 días
      const today = new Date();
      const weekData = [0, 0, 0, 0, 0, 0, 0]; // Lun, Mar, Mié, Jue, Vie, Sab, Dom
      
      eventsData.forEach((event: any) => {
        if (event.date) {
          const eventDate = new Date(event.date);
          const dayOfWeek = eventDate.getDay();
          // Convertir: domingo=0 → domingo=6, lunes=1 → lunes=0
          const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          
          // Solo contar si es de esta semana
          const diffDays = Math.floor((today.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) {
            weekData[adjustedDay]++;
          }
        }
      });
      
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
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
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
        <View style={[styles.statBox, { backgroundColor: colors.primaryLight }]}>
          <Text style={styles.statNumber}>{routines}</Text>
          <Text style={[styles.statLabel, { color: colors.primary }]}>Rutinas</Text>
          <Text style={[styles.statSubtext, { color: colors.primary }]}>activas</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.secondaryLight }]}>
          <Text style={styles.statNumber}>{events}</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Eventos</Text>
          <Text style={[styles.statSubtext, { color: colors.secondary }]}>registrados</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: `${colors.accent}15` }]}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={[styles.statLabel, { color: colors.accent }]}>Kilómetros</Text>
          <Text style={[styles.statSubtext, { color: colors.accent }]}>esta semana</Text>
        </View>
      </View>

      {/* Weekly Activity Chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>📊 Actividad de esta semana</Text>
        <View style={styles.chartContainer}>
          {weekStats.map((value, index) => {
            const dayLabel = dayLabels[index];
            return (
              <View key={dayLabel} style={styles.barWrapper}>
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
              </View>
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
              <View
                key={cellKey}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: isToday ? colors.primary : colors.gray50,
                    borderColor: isToday ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.dayNumber, { color: isToday ? '#fff' : colors.text }]}>
                  {day}
                </Text>
              </View>
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
});
