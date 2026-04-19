import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { profileStyles as styles } from '@/styles/profile-styles';
import { useColors } from '@/hooks/use-colors';

import api from '@/services/api';
import { router } from 'expo-router';

export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const colors = useColors();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [secondLastName, setSecondLastName] = useState(user?.second_last_name || '');
  
  const save = async () => {
    if (!user) return;

    const res = await api.patch(`/users/${user.id}`, {
      first_name: firstName,
      last_name: lastName,
      second_last_name: secondLastName,
    });

    setUser(res.data); // update UI instantly
    router.replace('/profile'); // redirect to profile
  };

  return (
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

      <Button title="Save" onPress={save} />
    </View>
  );
}