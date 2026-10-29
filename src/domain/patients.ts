import { Appointment, PatientSummary } from '../types';

export function normalizePhone(phone?: string): string {
  const trimmed = (phone ?? '').trim();
  if (!trimmed) return '';
  let digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) {
    digits = `+${digits.slice(2)}`;
  }
  return digits;
}

export function patientKey(appointment: Appointment): string {
  const phone = normalizePhone(appointment.patientPhone);
  if (phone) return phone;
  return appointment.patientName.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function aggregatePatients(appointments: Appointment[]): PatientSummary[] {
  const map = new Map<string, PatientSummary>();
  for (const a of appointments) {
    if (a.status === 'canceled') continue;
    const key = patientKey(a);
    const existing = map.get(key);
    if (existing) {
      existing.visits += 1;
      if (a.date > existing.lastDate) {
        existing.lastDate = a.date;
        existing.name = a.patientName;
        const phone = (a.patientPhone ?? '').trim();
        if (phone) existing.phone = phone;
      }
    } else {
      map.set(key, {
        id: key,
        name: a.patientName,
        phone: (a.patientPhone ?? '').trim(),
        visits: 1,
        lastDate: a.date,
      });
    }
  }
  return [...map.values()].sort((x, y) => y.lastDate.localeCompare(x.lastDate));
}
