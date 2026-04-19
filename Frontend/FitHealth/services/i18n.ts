import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

const resources = {
  en: {
    translation: {
      profile: "Profile",
      myRoutines: "🏋️ My Routines",
      orgTraining: "Organize your training",
      language: "Language",
      english: "English",
      spanish: "Spanish",
      german: "German",
      logout: "Log out",
      routines: "Routines",
      myEvents: "My Events",
      registerHealth: "Register and track your health",
      events: "Events",
      chatTitle: "💬 Chat",
      commDoctor: "Communicate with your doctor",
      chat: "Chat",
      settings: "Settings",
      home: "Home",
      hello: "Hello",
      welcomeMsg: "Welcome to your health space",
      active: "active",
      registered: "registered",
      kilometers: "Kilometers",
      thisWeek: "this week",
      activityThisWeek: "Activity this week",
      healthTipToday: "Health tip today",
      dailyHydration: "Daily hydration",
      hydrationDesc: "Drink at least 2 liters of water a day to keep your body hydrated and healthy.",
      mainFeatures: "Main features",
      yourSummary: "Your Summary",
      summaryDesc: "Track your routines, health events, and chat with your doctor",
      routinesDesc: "Create routines combining exercises and diet for your goals",
      eventsDesc: "Record biometric data, water, activity, and weight",
      chatDesc: "Communicate directly with your doctor to resolve doubts",
      addEvent: "Add event",
      noEvents: "No routines or events for this day",
      cancel: "Cancel",
      exit: "Exit",
      status: "Status",
      activeStatus: "Active",
      inactiveStatus: "Inactive",
      memberSince: "Member since",
      patient: "Patient",
      doctor: "Doctor",
      information: "Information",
      sureLogout: "Are you sure you want to log out?"
    }
  },
  es: {
    translation: {
      profile: "Perfil",
      myRoutines: "🏋️ Mis Rutinas",
      orgTraining: "Organiza tu entrenamiento",
      language: "Idioma",
      english: "Inglés",
      spanish: "Español",
      german: "Alemán",
      logout: "Cerrar sesión",
      routines: "Rutinas",
      myEvents: "Mis Eventos",
      registerHealth: "Registra y controla tu salud",
      events: "Eventos",
      chatTitle: "💬 Chat",
      commDoctor: "Comunícate con tu doctor",
      chat: "Chat",
      settings: "Ajustes",
      home: "Inicio",
      hello: "¡Hola",
      welcomeMsg: "Bienvenido a tu espacio de salud",
      active: "activas",
      registered: "registrados",
      kilometers: "Kilómetros",
      thisWeek: "esta semana",
      activityThisWeek: "Actividad de esta semana",
      healthTipToday: "Consejo de salud hoy",
      dailyHydration: "Hidratación diaria",
      hydrationDesc: "Bebe al menos 2 litros de agua al día para mantener tu cuerpo hidratado y saludable.",
      mainFeatures: "Características principales",
      yourSummary: "Tu Resumen",
      summaryDesc: "Registra tus rutinas, eventos de salud y chatea con tu doctor",
      routinesDesc: "Crea rutinas combinando ejercicios y dieta para tus objetivos",
      eventsDesc: "Registra datos biométricos, agua, actividad y peso",
      chatDesc: "Comunícate directamente con tu doctor para resolver dudas",
      addEvent: "Agregar evento",
      noEvents: "No hay rutinas ni eventos para este día",
      cancel: "Cancelar",
      exit: "Salir",
      status: "Estado",
      activeStatus: "Activo",
      inactiveStatus: "Inactivo",
      memberSince: "Miembro desde",
      patient: "Paciente",
      doctor: "Doctor",
      information: "Información",
      sureLogout: "¿Seguro que quieres salir?"
    }
  },
  de: {
    translation: {
      profile: "Profil",
      myRoutines: "🏋️ Meine Routinen",
      orgTraining: "Organisiere dein Training",
      language: "Sprache",
      english: "Englisch",
      spanish: "Spanisch",
      german: "Deutsch",
      logout: "Abmelden",
      routines: "Routinen",
      myEvents: "Meine Termine",
      registerHealth: "Erfasse und kontrolliere deine Gesundheit",
      events: "Termine",
      chatTitle: "💬 Chat",
      commDoctor: "Kommuniziere mit deinem Arzt",
      chat: "Chat",
      settings: "Einstellungen",
      home: "Startseite",
      hello: "Hallo",
      welcomeMsg: "Willkommen in deinem Gesundheitsbereich",
      active: "aktiv",
      registered: "registriert",
      kilometers: "Kilometer",
      thisWeek: "diese Woche",
      activityThisWeek: "Aktivität diese Woche",
      healthTipToday: "Gesundheitstipp heute",
      dailyHydration: "Tägliche Hydratation",
      hydrationDesc: "Trinke mindestens 2 Liter Wasser pro Tag, um deinen Körper hydratisiert und gesund zu halten.",
      mainFeatures: "Haupteigenschaften",
      yourSummary: "Deine Zusammenfassung",
      summaryDesc: "Verfolge deine Routinen, Gesundheitsereignisse und chatte mit deinem Arzt",
      routinesDesc: "Erstelle Routinen aus Übungen und Ernährung für deine Ziele",
      eventsDesc: "Erfasse biometrische Daten, Wasser, Aktivität und Gewicht",
      chatDesc: "Kommuniziere direkt mit deinem Arzt, um Zweifel zu klären",
      addEvent: "Termin hinzufügen",
      noEvents: "Keine Routinen oder Termine für diesen Tag",
      cancel: "Abbrechen",
      exit: "Verlassen",
      status: "Status",
      activeStatus: "Aktiv",
      inactiveStatus: "Inaktiv",
      memberSince: "Mitglied seit",
      patient: "Patient",
      doctor: "Arzt",
      information: "Informationen",
      sureLogout: "Bist du sicher, dass du dich abmelden möchtest?"
    }
  }
};

const STORE_LANGUAGE_KEY = 'settings.lang';

const languageDetectorPlugin = {
  type: 'languageDetector',
  async: true,
  init: () => {},
  detect: async function (callback: (lang: string) => void) {
    try {
      await AsyncStorage.getItem(STORE_LANGUAGE_KEY).then((language) => {
        if (language) {
          return callback(language);
        } else {
          return callback(Localization.locale.split('-')[0] || 'en');
        }
      });
    } catch (error) {
      console.log('Error reading language', error);
    }
  },
  cacheUserLanguage: async function (language: string) {
    try {
      await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
    } catch (error) {
      console.log('Error saving language', error);
    }
  }
};

i18n
  .use(languageDetectorPlugin)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    compatibilityJSON: 'v3',
    react: {
      useSuspense: false
    }
  });

export default i18n;
