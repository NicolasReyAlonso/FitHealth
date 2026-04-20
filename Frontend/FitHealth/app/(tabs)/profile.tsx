import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { profileStyles as styles } from '@/styles/profile-styles';
import { useColors } from '@/hooks/use-colors';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const colors = useColors();
  const { user, logout } = useAuth();
  const { t } = useTranslation(); // translation

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
            {user?.role === 'doctor' ? `🩺 ${t('profile.doctor')}` : `🏃 ${t('profile.patient')}`}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.icon }]}>{t('profile.status')}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {user?.is_active ? '✅ ' + t('profile.active') : '❌ ' + t('profile.inactive')}
          </Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.icon }]}>{t('profile.member_since')}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
          </Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.icon }]}>{t('profile.name')}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {/* {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'} */}
              {user?.first_name} {user?.last_name} {user?.second_last_name}
          </Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.icon }]}>{t('profile.birthday')}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {user?.birthday ? new Date(user.birthday).toLocaleDateString() : t('common.not_provided')}
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.icon }]}>{t('profile.notes')}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.notes}
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.icon }]}>{t('profile.preferred_language')}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {t(`common.${user?.preferred_language}`)}
          </Text>
        </View>


        <TouchableOpacity style={[styles.infoCard, { backgroundColor: colors.edit, borderColor: colors.border }]}
            onPress={() => router.push('/edit_profile')}>
          <Text style={[styles.infoLabel, { color: colors.icon }]}>✏️ {t('profile.edit_profile')}</Text>
        </TouchableOpacity>

      </View>


      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
