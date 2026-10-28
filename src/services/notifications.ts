import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { Appointment, Establishment, Settings } from '../types';
import { formatLongDate, fromISO, minutesOf } from '../utils/date';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Programme un rappel push local avant le rendez-vous. */
export async function scheduleReminder(
  appointment: Appointment,
  settings: Settings
): Promise<string | undefined> {
  const granted = await ensureNotificationPermission();
  if (!granted) return undefined;

  const startsAt = fromISO(appointment.date);
  startsAt.setMinutes(minutesOf(appointment.time));
  const triggerAt = startsAt.getTime() - settings.reminderLeadMin * 60_000;
  if (triggerAt <= Date.now()) return undefined;

  const lead =
    settings.reminderLeadMin >= 60
      ? `${Math.round(settings.reminderLeadMin / 60)} h`
      : `${settings.reminderLeadMin} min`;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rendez-vous à venir',
      body: `${appointment.patientName} — ${formatLongDate(appointment.date)} à ${appointment.time} (dans ${lead})`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
    },
  });
}

export async function cancelReminder(reminderId?: string): Promise<void> {
  if (!reminderId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId);
  } catch {
    // déjà annulée
  }
}

export function buildReminderMessage(
  appointment: Appointment,
  establishment?: Establishment,
  settings?: Settings
): string {
  const doctor = settings?.doctorName?.trim() || 'Votre médecin';
  const lieu = establishment ? ` à ${establishment.name}` : '';
  return (
    `Bonjour ${appointment.patientName}, je vous rappelle votre rendez-vous le ` +
    `${formatLongDate(appointment.date)} à ${appointment.time}${lieu} ` +
    `(${appointment.durationMin} min). — ${doctor}`
  );
}

function phoneDigits(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
}

/** Ouvre WhatsApp avec un message de rappel pré-rempli. */
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const num = phoneDigits(phone);
  const url = `whatsapp://send?phone=${num}&text=${encodeURIComponent(message)}`;
  const webUrl = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  try {
    const supported = await Linking.canOpenURL(url);
    await Linking.openURL(supported ? url : webUrl);
    return true;
  } catch {
    return false;
  }
}

/** Ouvre l'application SMS avec un message pré-rempli. */
export async function sendSMS(phone: string, message: string): Promise<boolean> {
  const sep = Platform.OS === 'ios' ? '&' : '?';
  const url = `sms:${phone}${sep}body=${encodeURIComponent(message)}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
