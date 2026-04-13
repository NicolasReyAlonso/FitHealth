import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth-context';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Seguro que quieres cerrar sesión?')) {
        logout();
      }
    } else {
      Alert.alert('Cerrar Sesión', '¿Seguro que quieres salir?', [
        { text: 'Cancelar' },
        { text: 'Salir', style: 'destructive', onPress: logout },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {user?.username?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={[styles.username, { color: colors.text }]}>{user?.username}</Text>
        <Text style={[styles.email, { color: colors.icon }]}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.roleText, { color: colors.primary }]}>
            {user?.role === 'doctor' ? '🩺 Doctor' : '🏃 Paciente'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.icon }]}>Estado</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {user?.is_active ? '✅ Activo' : '❌ Inactivo'}
          </Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.icon }]}>Miembro desde</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
          </Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.icon }]}>Nombre</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {/* {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'} */}
              {user?.first_name} {user?.last_name} {user?.second_last_name}
          </Text>
        </View>
        <TouchableOpacity style={[styles.infoCard, { backgroundColor: colors.edit, borderColor: colors.border }]}
            onPress={() => router.push('/edit_profile')}>
          <Text style={[styles.infoLabel, { color: colors.icon }]}>✏️ Edit profile</Text>
        </TouchableOpacity>

      </View>


      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  username: { fontSize: 24, fontWeight: 'bold' },
  email: { fontSize: 14, marginTop: 4 },
  roleBadge: { marginTop: 8, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  roleText: { fontSize: 14, fontWeight: '600' },
  section: { paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  infoCard: { borderRadius: 14, padding: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  logoutButton: { marginHorizontal: 20, backgroundColor: '#EF5350', borderRadius: 14, padding: 16, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
