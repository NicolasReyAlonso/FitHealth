import React, { useState } from 'react';
import { View, TextInput, Text, Button, Pressable } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { profileStyles as styles } from '@/styles/profile-styles';
import { useColors } from '@/hooks/use-colors';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

import api from '@/services/api';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);
  const { t } = useTranslation(); // translation
  

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [secondLastName, setSecondLastName] = useState(user?.second_last_name || '');
  const [birthday, setBirthday] = useState<Date | null>(
    user?.birthday ? new Date(user.birthday) : null
  );
  const [notes, setNotes] = useState(user?.notes || '');

  const save = async () => {
  
    if (!user) return;

    const res = await api.patch(`/users/${user.id}`, {
      first_name: firstName,
      last_name: lastName,
      second_last_name: secondLastName,
      birthday: birthday ? birthday.toISOString().split('T')[0] : null,
    });

    setUser(res.data); // update UI instantly
    router.replace('/profile'); // redirect to profile
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.background }]}>
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput style={[styles.infoValue, { color: colors.text }]}
          placeholder="First name"
          placeholderTextColor={colors.placeholder}
          value={firstName}
          onChangeText={setFirstName}
        />

        <TextInput style={[styles.infoValue, { color: colors.text }]}
          placeholder="Last name"
          placeholderTextColor={colors.placeholder}
          value={lastName}
          onChangeText={setLastName}
        />

          <TextInput style={[styles.infoValue, { color: colors.text }]}
          placeholder="Second last name"
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
          <Text style={[styles.infoLabel, { color: colors.icon }]}>{t('birthday')}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {birthday ? birthday.toLocaleDateString() : t('not_provided')}
          </Text>
          <Pressable style={[styles.infoCard, { backgroundColor: colors.edit, borderColor: colors.border, padding: 5, margin: 0 }]} onPress={() => setShowPicker(prev => !prev)}>
            <Text style={[styles.infoLabel, { color: colors.icon }]}>✏️ {t('pick_birthday')}</Text>
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
        <TextInput style={[styles.infoValue, { color: colors.text }]}
          placeholder={t('note')}
          placeholderTextColor={colors.placeholder}
          value={notes}
          onChangeText={setNotes}
        />
      </View>
      <Button title="Save" onPress={save} />
    </View>
  );
}