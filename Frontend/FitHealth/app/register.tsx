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
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  
  // Real-time validation errors
  const [emailErrorValidation, setEmailErrorValidation] = useState<string | null>(null);
  const [usernameErrorValidation, setUsernameErrorValidation] = useState<string | null>(null);
  const [passwordErrorValidation, setPasswordErrorValidation] = useState<string | null>(null);
  const [confirmPasswordErrorValidation, setConfirmPasswordErrorValidation] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) setEmailErrorValidation('El email es obligatorio');
    else if (!emailRegex.test(text)) setEmailErrorValidation('Formato de email inválido');
    else setEmailErrorValidation(null);
  };

  const validateUsername = (text: string) => {
    setUsername(text);
    if (!text) setUsernameErrorValidation('El nombre de usuario es obligatorio');
    else if (text.length < 3) setUsernameErrorValidation('Mínimo 3 caracteres');
    else setUsernameErrorValidation(null);
  };

  const validatePassword = (text: string) => {
    setPassword(text);
    if (!text) setPasswordErrorValidation('La contraseña es obligatoria');
    else if (text.length < 6) setPasswordErrorValidation('La contraseña debe tener al menos 6 caracteres');
    else setPasswordErrorValidation(null);

    // Validate confirmation against the new password
    if (confirmPassword && text !== confirmPassword) {
      setConfirmPasswordErrorValidation('Las contraseñas no coinciden');
    } else if (confirmPassword && text === confirmPassword) {
      setConfirmPasswordErrorValidation(null);
    }
  };

  const validateConfirmPassword = (text: string) => {
    setConfirmPassword(text);
    if (!text) setConfirmPasswordErrorValidation('Confirma tu contraseña');
    else if (text !== password) setConfirmPasswordErrorValidation('Las contraseñas no coinciden');
    else setConfirmPasswordErrorValidation(null);
  };

  const handleRegister = async () => {
    setError(null);
    
    // Check if any fields are empty 
    if (!email || !username || !password || !confirmPassword) {
      setError('Por favor completa todos los campos');
      return;
    }
    
    // Refuse submission if there remain real-time errors
    if (emailErrorValidation || usernameErrorValidation || passwordErrorValidation || confirmPasswordErrorValidation) {
      setError('Corrige los errores antes de continuar');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), username.trim(), password, role);
      // Tras registrar con éxito, vamos a la pantalla de aviso.
      router.replace('/verify-notice');
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('No se pudo crear la cuenta. Verifica tus datos.');
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
          <Text style={styles.subtitle}>Crea tu cuenta</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Registro</Text>

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

          <TextInput
            style={[styles.input, usernameErrorValidation ? { borderColor: '#D32F2F', borderWidth: 1 } : {}]}
            placeholder="Nombre de usuario"
            placeholderTextColor="#8E9AAF"
            value={username}
            onChangeText={validateUsername}
            autoCapitalize="none"
          />
          {usernameErrorValidation && <Text style={{ color: '#D32F2F', fontSize: 12, marginBottom: 10, marginTop: -15 }}>{usernameErrorValidation}</Text>}

          <TextInput
            style={[styles.input, passwordErrorValidation ? { borderColor: '#D32F2F', borderWidth: 1 } : {}]}
            placeholder="Contraseña"
            placeholderTextColor="#8E9AAF"
            value={password}
            onChangeText={validatePassword}
            secureTextEntry
          />
          {passwordErrorValidation && <Text style={{ color: '#D32F2F', fontSize: 12, marginBottom: 10, marginTop: -15 }}>{passwordErrorValidation}</Text>}

          <TextInput
            style={[styles.input, confirmPasswordErrorValidation ? { borderColor: '#D32F2F', borderWidth: 1 } : {}]}
            placeholder="Confirmar contraseña"
            placeholderTextColor="#8E9AAF"
            value={confirmPassword}
            onChangeText={validateConfirmPassword}
            secureTextEntry
          />
          {confirmPasswordErrorValidation && <Text style={{ color: '#D32F2F', fontSize: 12, marginBottom: 10, marginTop: -15 }}>{confirmPasswordErrorValidation}</Text>}

          {/* Role selector */}
          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>Soy:</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[styles.roleButton, role === 'patient' && styles.roleButtonActive]}
                onPress={() => setRole('patient')}
              >
                <Text style={[styles.roleButtonText, role === 'patient' && styles.roleButtonTextActive]}>
                  Paciente
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleButton, role === 'doctor' && styles.roleButtonActive]}
                onPress={() => setRole('doctor')}
              >
                <Text style={[styles.roleButtonText, role === 'doctor' && styles.roleButtonTextActive]}>
                  Doctor
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Crear Cuenta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.linkContainer}>
            <Text style={styles.linkText}>
              ¿Ya tienes cuenta?{' '}
              <Text style={styles.linkBold}>Inicia Sesión</Text>
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
    marginBottom: 32,
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
  roleContainer: {
    marginBottom: 14,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#C8E6C9',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#1565C0',
    backgroundColor: '#E3F2FD',
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E9AAF',
  },
  roleButtonTextActive: {
    color: '#1565C0',
  },
  button: {
    backgroundColor: '#2E7D32',
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
