import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import { useAuth } from '@/context/auth-context';

export default function EditProfileScreen() {
  const { user, token } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [secondLastName, setSecondLastName] = useState(user?.second_last_name || '');

  const save = async () => {
    await fetch('http://YOUR_API/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        second_last_name: secondLastName,
      }),
    });
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="First name"
        value={firstName}
        onChangeText={setFirstName}
      />

      <TextInput
        placeholder="Last name"
        value={lastName}
        onChangeText={setLastName}
      />

      <TextInput
        placeholder="Second last name"
        value={secondLastName}
        onChangeText={setSecondLastName}
      />

      <Button title="Save" onPress={save} />
    </View>
  );
}