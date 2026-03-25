import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';

export default function VerifyNoticeScreen() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.icon}>✉️</Text>
        <Text style={styles.title}>¡Revisa tu correo!</Text>
        
        <Text style={styles.message}>
          Te hemos enviado un enlace de confirmación. Por favor, revisa tu bandeja de entrada (y la carpeta de spam o correo no deseado) y haz clic en el enlace para verificar tu cuenta.
        </Text>

        <Text style={styles.subMessage}>
          No podrás iniciar sesión hasta que confirmes tu correo.
        </Text>

        <Text style={{ color: '#1B5E20', marginBottom: 20, textAlign: 'center', fontWeight: 'bold' }}>
          Redirigiendo al inicio de sesión en {countdown} segundos...
        </Text>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.replace('/login')}
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
    backgroundColor: '#E8F5E9',
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
    color: '#1B5E20',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  subMessage: {
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#1E88E5',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
