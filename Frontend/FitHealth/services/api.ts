import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  } else if (Platform.OS === 'android') {
    // 10.0.2.2 es el alias localhost para el emulador de Android
    return 'http://10.0.2.2:8000';
  } else {
    // Simulador iOS o dispositivo físico
    return 'http://10.214.2.207:8000';
  }
};

const getWsUrl = () => {
  if (Platform.OS === 'web') {
    return 'ws://localhost:8000';
  } else if (Platform.OS === 'android') {
    return 'ws://10.0.2.2:8000';
  } else {
    return 'ws://10.214.2.207:8000';
  }
};

export const API_BASE_URL = getBaseUrl();
export const WS_BASE_URL = getWsUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true'
  },
});

// Interceptor: add auth token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
