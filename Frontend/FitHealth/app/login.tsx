import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Real-time validation states
  const [emailErrorValidation, setEmailErrorValidation] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) {
      setEmailErrorValidation('El email es obligatorio');
    } else if (!emailRegex.test(text)) {
      setEmailErrorValidation('Formato de email inválido');
    } else {
      setEmailErrorValidation(null);
    }
  };

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }
    if (emailErrorValidation) {
      setError('Corrige los errores antes de continuar');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError(err.response.data.detail || 'Por favor, verifica tu correo antes de iniciar sesión.');
      } else {
        setError('Email o contraseña incorrectos');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🏃‍♂️</Text>
          <Text style={styles.title}>FitHealth</Text>
          <Text style={styles.subtitle}>Tu salud, tu control</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Iniciar Sesión</Text>

          <TextInput
            style={[styles.input, emailErrorValidation ? { borderColor: '#D32F2F', borderWidth: 1 } : {}]}
            placeholder="Email"
            placeholderTextColor="#8E9AAF"
            value={email}
            onChangeText={validateEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {emailErrorValidation && <Text style={{ color: '#D32F2F', fontSize: 12, marginBottom: 10, marginTop: -15 }}>{emailErrorValidation}</Text>}

          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Contraseña"
              placeholderTextColor="#8E9AAF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={24} 
                color="#8E9AAF" 
              />
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')} style={styles.linkContainer}>
            <Text style={styles.linkText}>
              ¿No tienes cuenta?{' '}
              <Text style={styles.linkBold}>Regístrate</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  subtitle: {
    fontSize: 16,
    color: '#388E3C',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
    backgroundColor: '#F1F8E9',
    color: '#1B5E20',
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 0, 
  },
  passwordInput: {
    paddingRight: 50, // space for the eye icon
    marginBottom: 14,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
    zIndex: 1,
  },
  button: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#546E7A',
    fontSize: 14,
  },
  linkBold: {
    color: '#1565C0',
    fontWeight: '700',
  },
});
