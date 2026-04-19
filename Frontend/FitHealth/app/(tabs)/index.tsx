import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';


export default function HomeScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { t } = useTranslation(); // translation
  

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          {t('greeting', { username: user?.username })} 👋
        </Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>
          {t('welcome')}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.primary }]}>📊 Tu Resumen</Text>
        <Text style={[styles.cardText, { color: colors.text }]}>
          Registra tus rutinas, eventos de salud y chatea con tu doctor para mantener un seguimiento completo.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.secondary }]}>🏋️ Rutinas</Text>
        <Text style={[styles.cardText, { color: colors.text }]}>
          Crea rutinas combinando ejercicios y dieta para alcanzar tus objetivos.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.primary }]}>📅 Eventos</Text>
        <Text style={[styles.cardText, { color: colors.text }]}>
          Registra datos biométricos, consumo de agua, actividad física, alimentación y peso.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.secondary }]}>💬 Chat Médico</Text>
        <Text style={[styles.cardText, { color: colors.text }]}>
          Comunícate directamente con tu doctor para resolver dudas sobre tu salud.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
