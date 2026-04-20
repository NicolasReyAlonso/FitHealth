import React, { useEffect, useState } from 'react';
import { View, TextInput, Text, Button, Pressable } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { profileStyles as styles } from '@/styles/profile-styles';
import { useColors } from '@/hooks/use-colors';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import i18n from '@/i18n';


import api from '@/services/api';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);
  const { t } = useTranslation(); // translation
  const navigation = useNavigation();
  
  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('profile.edit_profile'),
    });
  }, [t]);


  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [secondLastName, setSecondLastName] = useState(user?.second_last_name || '');
  const [birthday, setBirthday] = useState<Date | null>(
    user?.birthday ? new Date(user.birthday) : null
  );
  const [notes, setNotes] = useState(user?.notes || '');
  const [language, setLanguage] = useState(user?.preferred_language ?? 'es');

  const save = async () => {
  
    if (!user) return;

    const res = await api.patch(`/users/${user.id}`, {
      first_name: firstName,
      last_name: lastName,
      second_last_name: secondLastName,
      birthday: birthday ? birthday.toISOString().split('T')[0] : null,
      notes,
      preferred_language: language,
    });

    setUser(res.data); // update UI instantly
    i18n.changeLanguage(language);
    router.replace('/profile'); // redirect to profile
  };

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  return (
    <View style={[styles.section, { backgroundColor: colors.background }]}>
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput style={[styles.infoValue, { color: colors.text }]}
          placeholder={t('profile.first_name')}
          placeholderTextColor={colors.placeholder}
          value={firstName}
          onChangeText={setFirstName}
        />

        <TextInput style={[styles.infoValue, { color: colors.text }]}
          placeholder={t('profile.last_name')}
          placeholderTextColor={colors.placeholder}
          value={lastName}
          onChangeText={setLastName}
        />

          <TextInput style={[styles.infoValue, { color: colors.text }]}
          placeholder={t('profile.second_last_name')}
          placeholderTextColor={colors.placeholder}
          value={secondLastName}
          onChangeText={setSecondLastName}
        />
      </View>
      <View>
        <View style={[styles.infoCard, {
          backgroundColor: colors.card,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          }]}>
          <Text style={[styles.infoLabel, { color: colors.icon }]}>{t('profile.birthday')}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {birthday ? birthday.toLocaleDateString() : t('common.not_provided')}
          </Text>
          <Pressable style={[styles.infoCard, { backgroundColor: colors.edit, borderColor: colors.border, padding: 5, margin: 0 }]} onPress={() => setShowPicker(prev => !prev)}>
            <Text style={[styles.infoLabel, { color: colors.icon }]}>✏️ {t('profile.set_birthday')}</Text>
          </Pressable>
        </View>


        {showPicker && (
          Platform.OS === 'web' ? (
            <input
              type="date"
              style={{
                padding: 4,
                fontSize: 14,
                width: 150,
                borderRadius: 6,
                border: '1px solid #ccc',
                marginLeft: 'auto',                
              }}
              value={birthday ? birthday.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const value = e.target.value;

                if (!value) {
                  setBirthday(null);
                } else {
                  setBirthday(new Date(value));
                }
                setShowPicker(false); // auto close
              }}
            />
          ) : (
            <DateTimePicker
              value={birthday || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowPicker(false);
                if (selectedDate) setBirthday(selectedDate);
              }}
            />
          )
        )}
      </View>
 
       <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput style={[styles.infoValue, { color: colors.text, width: '100%' }]}
          placeholder={t('profile.notes')}
          placeholderTextColor={colors.placeholder}
          value={notes}
          onChangeText={setNotes}
        />
      </View>
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoLabel, { color: colors.icon }]}>
          {t('settings.preferred_language')}
        </Text>

        <Picker
          selectedValue={language}
          onValueChange={(value) => setLanguage(value)}
          style={{ color: 'black', width: 150 }}
        >
          <Picker.Item label="🇪🇸 Español" value="es" />
          <Picker.Item label="🇬🇧 English" value="en" />
          <Picker.Item label="🇨🇿 Čeština" value="cs" />
        </Picker>

      </View>
      <Button title={t('common.save')} onPress={save} />
    </View>
  );
}