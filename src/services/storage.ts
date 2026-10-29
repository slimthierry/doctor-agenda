import AsyncStorage from '@react-native-async-storage/async-storage';

import { Appointment, AvailabilityRule, Establishment, Settings } from '../types';

const KEY = {
  appointments: '@doctor-agenda/appointments',
  establishments: '@doctor-agenda/establishments',
  settings: '@doctor-agenda/settings',
  availability: '@doctor-agenda/availability',
} as const;

export const DEFAULT_SETTINGS: Settings = {
  doctorName: 'Dr',
  reminderLeadMin: 60,
  autoReminders: true,
  serverUrl: 'http://localhost:4400',
  doctorApiKey: 'demo-key-kpatcha',
};

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silencieux : les données restent en mémoire
  }
}

export function loadAppointments(): Promise<Appointment[]> {
  return read<Appointment[]>(KEY.appointments, []);
}

export function saveAppointments(list: Appointment[]): Promise<void> {
  return write(KEY.appointments, list);
}

export function loadEstablishments(): Promise<Establishment[]> {
  return read<Establishment[]>(KEY.establishments, []);
}

export function saveEstablishments(list: Establishment[]): Promise<void> {
  return write(KEY.establishments, list);
}

export function loadSettings(): Promise<Settings> {
  return read<Settings>(KEY.settings, DEFAULT_SETTINGS);
}

export function saveSettings(s: Settings): Promise<void> {
  return write(KEY.settings, s);
}

export function loadAvailability(): Promise<AvailabilityRule[]> {
  return read<AvailabilityRule[]>(KEY.availability, []);
}

export function saveAvailability(rules: AvailabilityRule[]): Promise<void> {
  return write(KEY.availability, rules);
}
