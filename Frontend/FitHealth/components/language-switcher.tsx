import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import i18n from 'i18next';

export default function LanguageSwitcher() {
  const changeLang = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => changeLang('es')}>
        <Text style={styles.text}>🇪🇸 ES</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => changeLang('en')}>
        <Text style={styles.text}>🇬🇧 EN</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => changeLang('cs')}>
        <Text style={styles.text}>🇨🇿 CZ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});