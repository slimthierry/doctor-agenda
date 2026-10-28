import { Appointment, AvailabilityRule, Settings } from '../types';

/** Format d'un rendez-vous tel que renvoyé par l'agenda central (snake_case). */
export interface ServerAppointment {
  id: string;
  doctor_id?: string;
  establishment_id: string;
  patient_name: string;
  patient_phone: string | null;
  date: string;
  time: string;
  duration_min: number;
  reason: string | null;
  status: Appointment['status'];
  source?: 'app' | 'connector' | 'patient';
  created_at?: string;
  updated_at: string;
  series_id?: string | null;
  reminder_sent_at?: string | null;
}

interface PushResponse {
  created: number;
  updated: number;
  kept: number;
  server_time: string;
}

interface PullResponse {
  appointments: ServerAppointment[];
  server_time: string;
}

interface ServerRule {
  id: string;
  doctor_id?: string;
  establishment_id?: string | null;
  weekday: number;
  start: string;
  end: string;
}

interface BookingInfoResponse {
  doctor: { id: string; name: string; email: string; slug: string };
  establishments: Array<{
    id: string;
    name: string;
    address: string | null;
    color: string;
    connector_key: string;
    created_at: string;
  }>;
}

interface AvailabilityResponse {
  rules: ServerRule[];
}

interface AppointmentInput {
  id: string;
  establishment_id: string;
  patient_name: string;
  patient_phone: string | null;
  date: string;
  time: string;
  duration_min: number;
  reason: string | null;
  status: Appointment['status'];
  source?: 'app' | 'connector' | 'patient';
  created_at?: string;
  updated_at: string;
  series_id?: string | null;
  reminder_sent_at?: string | null;
}

function normalizeBase(base: string): string {
  return base.trim().replace(/\/+$/, '');
}

async function request<T>(
  base: string,
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${normalizeBase(base)}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      ...(init.headers ?? {}),
    },
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  if (!res.ok) {
    const msg =
      (body as { error?: string } | undefined)?.error ??
      `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export function toServer(a: Appointment): AppointmentInput {
  return {
    id: a.id,
    establishment_id: a.establishmentId,
    patient_name: a.patientName,
    patient_phone: a.patientPhone ?? null,
    date: a.date,
    time: a.time,
    duration_min: a.durationMin,
    reason: a.reason ?? null,
    status: a.status,
    source: 'app',
    created_at: a.createdAt,
    updated_at: a.updatedAt ?? a.createdAt,
    series_id: a.seriesId ?? null,
    reminder_sent_at: a.reminderSentAt ?? null,
  };
}

export function fromServer(s: ServerAppointment): Appointment {
  return {
    id: s.id,
    patientName: s.patient_name,
    patientPhone: s.patient_phone ?? undefined,
    establishmentId: s.establishment_id,
    date: s.date,
    time: s.time,
    durationMin: s.duration_min,
    reason: s.reason ?? undefined,
    status: s.status,
    seriesId: s.series_id ?? undefined,
    reminderSentAt: s.reminder_sent_at ?? undefined,
    createdAt: s.created_at ?? s.updated_at,
    updatedAt: s.updated_at,
  };
}

export function pushAppointments(
  base: string,
  apiKey: string,
  appointments: AppointmentInput[],
): Promise<PushResponse> {
  return request<PushResponse>(base, apiKey, '/api/sync/appointments', {
    method: 'POST',
    body: JSON.stringify({ appointments }),
  });
}

export function pullAppointments(
  base: string,
  apiKey: string,
  since: string,
): Promise<PullResponse> {
  return request<PullResponse>(
    base,
    apiKey,
    `/api/sync/appointments?since=${encodeURIComponent(since)}`,
  );
}

export function fetchMe(
  base: string,
  apiKey: string,
): Promise<{ doctor: { name: string; slug: string } }> {
  return request<{ doctor: { name: string; slug: string } }>(
    base,
    apiKey,
    '/api/me',
  );
}

export function fetchAvailability(
  base: string,
  apiKey: string,
): Promise<AvailabilityRule[]> {
  return request<AvailabilityResponse>(base, apiKey, '/api/availability').then((r) =>
    r.rules.map((rule) => ({
      id: rule.id,
      establishmentId: rule.establishment_id ?? undefined,
      weekday: rule.weekday,
      start: rule.start,
      end: rule.end,
    })),
  );
}

export function putAvailability(
  base: string,
  apiKey: string,
  rules: AvailabilityRule[],
): Promise<AvailabilityResponse> {
  return request<AvailabilityResponse>(base, apiKey, '/api/availability', {
    method: 'PUT',
    body: JSON.stringify({
      rules: rules.map((r) => ({
        establishment_id: r.establishmentId ?? null,
        weekday: r.weekday,
        start: r.start,
        end: r.end,
      })),
    }),
  });
}

export function fetchBookingInfo(
  base: string,
  apiKey: string,
  slug: string,
): Promise<BookingInfoResponse> {
  return request<BookingInfoResponse>(base, apiKey, `/booking/${encodeURIComponent(slug)}`);
}

export function isServerConfigured(s: Settings): boolean {
  return Boolean(s.serverUrl?.trim() && s.doctorApiKey?.trim());
}
