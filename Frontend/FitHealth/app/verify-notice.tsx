import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function VerifyNoticeScreen() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (countdown <= 0) {
      router.replace('/login');
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, router]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={styles.icon}>✉️</Text>
        <Text style={[styles.title, { color: colors.primary }]}>¡Revisa tu correo!</Text>
        
        <Text style={[styles.message, { color: colors.text }]}>
          Te hemos enviado un enlace de confirmación. Por favor, revisa tu bandeja de entrada (y la carpeta de spam o correo no deseado) y haz clic en el enlace para verificar tu cuenta.
        </Text>

        <Text style={[styles.subMessage, { color: colors.danger }]}>
          No podrás iniciar sesión hasta que confirmes tu correo.
        </Text>

        <Text style={[{ marginBottom: 20, textAlign: 'center', fontWeight: 'bold', color: colors.text }]}>
          Redirigiendo al inicio de sesión en {countdown} segundos...
        </Text>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Ir al Iniciar Sesión ahora</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  subMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
