import { Appointment, NewAppointmentInput } from '../types';

export function newAppointmentId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newSeriesId(): string {
  return `ser-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createAppointment(input: NewAppointmentInput, nowISO: string): Appointment {
  return {
    ...input,
    id: newAppointmentId(),
    status: 'draft',
    createdAt: nowISO,
    updatedAt: nowISO,
  };
}

export function slotChanged(current: Appointment, patch: Partial<Appointment>): boolean {
  return (
    (patch.date !== undefined && patch.date !== current.date) ||
    (patch.time !== undefined && patch.time !== current.time) ||
    (patch.durationMin !== undefined && patch.durationMin !== current.durationMin)
  );
}

export function buildUpdatePatch(
  current: Appointment,
  patch: Partial<Appointment>,
  nowISO: string
): Partial<Appointment> {
  const base = { ...patch, updatedAt: nowISO };
  if (!slotChanged(current, patch)) return base;
  return { ...base, reminderSentAt: undefined, reminderId: undefined };
}
