import { minutesOf, todayISO } from '../utils/date';

export interface ValidationError {
  field: string;
  message: string;
}

export interface AppointmentDraftInput {
  patientName: string;
  patientPhone?: string;
  date: string;
  time: string | null;
  durationMin?: number;
  establishmentId: string;
}

export interface DraftValidationContext {
  nowDate: string;
  nowMinutes: number;
}

export function validatePatientName(name: string): ValidationError | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return { field: 'patientName', message: 'Le nom du patient est requis.' };
  }
  if (trimmed.length < 2) {
    return { field: 'patientName', message: 'Le nom doit contenir au moins 2 caractères.' };
  }
  return null;
}

export function validatePhone(phone: string): ValidationError | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const phoneRegex = /^\+?[0-9\s\-]{8,}$/;
  if (!phoneRegex.test(trimmed)) {
    return { field: 'patientPhone', message: 'Numéro de téléphone invalide.' };
  }
  return null;
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

export function validateTime(time: string | null): ValidationError | null {
  if (!time) {
    return { field: 'time', message: 'Choisissez un créneau horaire.' };
  }
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timeRegex.test(time)) {
    return { field: 'time', message: "Format d'heure invalide." };
  }
  return null;
}

export function validateAppointmentDraft(
  data: AppointmentDraftInput,
  ctx: DraftValidationContext
): ValidationError[] {
  const errors: ValidationError[] = [];

  const nameError = validatePatientName(data.patientName);
  if (nameError) errors.push(nameError);

  const phoneError = validatePhone(data.patientPhone ?? '');
  if (phoneError) errors.push(phoneError);

  if (!data.date) {
    errors.push({ field: 'date', message: 'La date est requise.' });
  } else if (!isValidISODate(data.date)) {
    errors.push({ field: 'date', message: 'Date invalide.' });
  } else if (data.date < ctx.nowDate) {
    errors.push({ field: 'date', message: 'Impossible de créer un rendez-vous dans le passé.' });
  }

  const timeError = validateTime(data.time);
  if (timeError) {
    errors.push(timeError);
  } else if (data.time && data.date === ctx.nowDate && minutesOf(data.time) <= ctx.nowMinutes) {
    errors.push({ field: 'time', message: "L'heure est déjà passée pour aujourd'hui." });
  }

  if (!data.establishmentId) {
    errors.push({ field: 'establishmentId', message: 'Choisissez un établissement.' });
  }

  const duration = data.durationMin ?? 30;
  if (duration < 5 || duration > 240) {
    errors.push({ field: 'durationMin', message: 'La durée doit être entre 5 et 240 minutes.' });
  }

  return errors;
}

export function validateAppointmentForm(data: {
  patientName: string;
  patientPhone?: string;
  date: string;
  time: string | null;
  establishmentId: string;
}): ValidationError | null {
  const now = new Date();
  const errors = validateAppointmentDraft(data, {
    nowDate: todayISO(),
    nowMinutes: now.getHours() * 60 + now.getMinutes(),
  });
  return errors[0] ?? null;
}
