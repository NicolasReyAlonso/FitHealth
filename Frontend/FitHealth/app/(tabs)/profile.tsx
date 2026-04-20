import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '@/services/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth-context';
import { useTranslation } from 'react-i18next';


export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, logout, setUser } = useAuth();
  const [uploadingImage, setUploadingImage] = React.useState(false);

  
  const pickImage = async () => {
    // Solicita permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lo sentimos', 'Necesitamos permisos para acceder a tus fotos');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.2, // Baja calidad para no saturar SQLite / base64
      base64: true, // Obtenemos el render en texto para el guardado directo
    });

    if (!result.canceled && result.assets[0].base64 && user?.id) {
      setUploadingImage(true);
      try {
        const base64Prefix = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        // Actualizamos usuario en database
        const res = await api.patch(`/users/${user.id}`, { profile_picture: base64Prefix });
        
        // Refrescamos app context
        setUser({
          ...user,
          profile_picture: res.data.profile_picture
        });
      } catch (err) {
         Alert.alert('Error', 'No se pudo subir la foto');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('sureLogout'))) {
        logout();
      }
    } else {
      Alert.alert(t('logout'), t('sureLogout'), [
        { text: t('cancel') },
        { text: t('exit'), style: 'destructive', onPress: logout },
      ]);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        
        <TouchableOpacity style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={pickImage} activeOpacity={0.8}>
          {uploadingImage ? (
             <ActivityIndicator size="large" color="#fff" />
          ) : user?.profile_picture ? (
             <Image source={{ uri: user.profile_picture }} style={{ width: 120, height: 120, borderRadius: 60 }} />
          ) : (
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={styles.roleText}>
            {user?.role === 'doctor' ? `🩺 ${t('doctor')}` : `🏃 ${t('patient')}`}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('information')}</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoLeft}>
            <Text style={[styles.infoLabel, { color: colors.icon }]}>{t('status')}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.is_active ? `✅ ${t('activeStatus')}` : `❌ ${t('inactiveStatus')}`}
            </Text>
          </View>
          <Text style={[styles.infoIcon, { color: colors.primary }]}>💚</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoLeft}>
            <Text style={[styles.infoLabel, { color: colors.icon }]}>{t('memberSince')}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
            </Text>
          </View>
          <Text style={[styles.infoIcon, { color: colors.accent }]}>📅</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('language')}</Text>
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between' }}>
            <TouchableOpacity 
              style={[styles.langBtn, i18n.language?.startsWith('es') && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => i18n.changeLanguage('es')}
            >
              <Text style={{ color: i18n.language?.startsWith('es') ? '#fff' : colors.text, fontWeight: 'bold' }}>🇪🇸 {t('spanish')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.langBtn, i18n.language?.startsWith('en') && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => i18n.changeLanguage('en')}
            >
              <Text style={{ color: i18n.language?.startsWith('en') ? '#fff' : colors.text, fontWeight: 'bold' }}>🇬🇧 {t('english')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.langBtn, i18n.language?.startsWith('de') && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => i18n.changeLanguage('de')}
            >
              <Text style={{ color: i18n.language?.startsWith('de') ? '#fff' : colors.text, fontWeight: 'bold' }}>🇩🇪 {t('german')}</Text>
            </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: colors.danger }]}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>{t('logout')}</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 0,
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 32,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: { 
    color: '#fff', 
    fontSize: 52, 
    fontWeight: '800' 
  },
  username: { 
    fontSize: 32, 
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
    color: '#FFFFFF',
  },
  email: { 
    fontSize: 16, 
    marginTop: 2,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  roleBadge: { 
    marginTop: 20, 
    borderRadius: 24, 
    paddingHorizontal: 20, 
    paddingVertical: 10 
  },
  roleText: { 
    fontSize: 14, 
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: { 
    paddingHorizontal: 20, 
    gap: 14, 
    marginBottom: 32 
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: { 
    borderRadius: 16, 
    padding: 20, 
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  infoLeft: {
    flex: 1,
  },
  infoLabel: { 
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoValue: { 
    fontSize: 16, 
    fontWeight: '700' 
  },
  infoIcon: {
    fontSize: 28,
  },
  logoutButton: { 
    marginHorizontal: 20, 
    borderRadius: 14, 
    padding: 18, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutIcon: {
    fontSize: 20,
  },
  logoutText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  langBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
