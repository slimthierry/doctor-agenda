import { Appointment, Settings } from '../types';

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

export function toServer(a: Appointment): ServerAppointment {
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
    createdAt: s.created_at ?? s.updated_at,
    updatedAt: s.updated_at,
  };
}

export function pushAppointments(
  base: string,
  apiKey: string,
  appointments: ServerAppointment[],
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

export function isServerConfigured(s: Settings): boolean {
  return Boolean(s.serverUrl?.trim() && s.doctorApiKey?.trim());
}
