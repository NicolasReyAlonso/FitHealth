import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '@/services/api';
import { useAuth } from '@/context/auth-context';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/toast-context';
import { useClosureOverlay } from '@/hooks/use-closure-overlay';

import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { profileStyles as styles } from '@/styles/profile-styles';
import { useColors } from '@/hooks/use-colors';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const colors = useColors();
  const toast = useToast();
  const { component: closureOverlay, show: showClosure } = useClosureOverlay();
  const { user, logout, setUser } = useAuth();
  const [uploadingImage, setUploadingImage] = React.useState(false);

  
  const pickImage = async () => {
    // Solicita permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Necesitamos permisos para acceder a tus fotos');
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
        
        // Mostrar confirmación de cierre
        showClosure(
          `¡Foto actualizada!`,
          `Tu perfil se ve genial`
        );
      } catch (err) {
         toast.error('No se pudo subir la foto');
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
        
        <TouchableOpacity style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          onPress={pickImage} activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="change profile picture"
          accessibilityHint="opens image gallery"
        >
          {uploadingImage ? (
             <ActivityIndicator size="large" color="#fff" 
             accessibilityLabel="uploading profile image"/>
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
          <Text style={styles.roleText}
          accessibilityLabel={
            user?.role === 'doctor'
              ? t('doctor')
              : t('patient')
          }>
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
          <Text style={[styles.infoIcon, { color: colors.primary }]}>📅</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('language')}</Text>
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between' }}>
            <TouchableOpacity 
              style={[styles.langBtn, i18n.language?.startsWith('es') && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => i18n.changeLanguage('es')}
              accessibilityRole="button"
              accessibilityLabel="change language to Spanish"
            >
              <Text style={{ color: i18n.language?.startsWith('es') ? '#fff' : colors.text, fontWeight: 'bold' }}>🇪🇸 {t('spanish')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.langBtn, i18n.language?.startsWith('en') && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => i18n.changeLanguage('en')}
              accessibilityRole="button"
              accessibilityLabel="change language to English"
            >
              <Text style={{ color: i18n.language?.startsWith('en') ? '#fff' : colors.text, fontWeight: 'bold' }}>🇬🇧 {t('english')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.langBtn, i18n.language?.startsWith('de') && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => i18n.changeLanguage('de')}
              accessibilityRole="button"
              accessibilityLabel="change language to German"
            >
              <Text style={{ color: i18n.language?.startsWith('de') ? '#fff' : colors.text, fontWeight: 'bold' }}>🇩🇪 {t('german')}</Text>
            </TouchableOpacity>
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
          <Text style={[styles.infoLabel, { color: colors.icon }]}>{t('settings.preferred_language')}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {t(`common.${user?.preferred_language}`)}
          </Text>
        </View>


        <TouchableOpacity style={[styles.infoCard, { backgroundColor: colors.edit, borderColor: colors.border }]}
            onPress={() => router.push('/edit_profile')}
            accessibilityRole="button"
            accessibilityLabel="edit profile"
          >
          <Text style={[styles.infoLabel, { color: colors.icon }]}>✏️ {t('profile.edit_profile')}</Text>
        </TouchableOpacity>

      </View>

      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: '#EF4444' }]}
        onPress={handleLogout}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="logout"
      >
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>{t('logout')}</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />

      {/* Closure Overlay */}
      {closureOverlay}
    </ScrollView>
  );
}
