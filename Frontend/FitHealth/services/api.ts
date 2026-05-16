import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Override en runtime con EXPO_PUBLIC_API_HOST en .env (p.ej. la IP de tu LAN para móvil físico)
const LAN_HOST = process.env.EXPO_PUBLIC_API_HOST || '10.214.2.207';
const PORT = process.env.EXPO_PUBLIC_API_PORT || '8000';

const getBaseUrl = () => {
  if (Platform.OS === 'web') return `http://localhost:${PORT}`;
  if (Platform.OS === 'android') return `http://10.0.2.2:${PORT}`; // emulador Android
  return `http://${LAN_HOST}:${PORT}`; // iOS simulador / dispositivo físico
};

const getWsUrl = () => getBaseUrl().replace(/^http/, 'ws');

export const API_BASE_URL = getBaseUrl();
export const WS_BASE_URL = getWsUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
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
