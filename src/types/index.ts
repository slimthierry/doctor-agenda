export type AppointmentStatus = 'draft' | 'confirmed' | 'done' | 'canceled';

export interface Establishment {
  id: string;
  name: string;
  address?: string;
  color: string;
}

export interface AvailabilityRule {
  id: string;
  establishmentId?: string;
  weekday: number; // 0 = dimanche … 6 = samedi (même convention backend)
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone?: string;
  establishmentId: string;
  /** Date ISO : YYYY-MM-DD */
  date: string;
  /** Heure : HH:mm */
  time: string;
  durationMin: number;
  reason?: string;
  status: AppointmentStatus;
  /** Identifiant de série pour les RDV récurrents */
  seriesId?: string;
  /** Rappel serveur déjà envoyé (RFC-3339) — remis à null si le RDV bouge */
  reminderSentAt?: string;
  reminderId?: string;
  createdAt: string;
  /** Dernière modification (synchro last-write-wins) */
  updatedAt?: string;
}

export interface Settings {
  doctorName: string;
  defaultEstablishmentId?: string;
  /** Délai du rappel push avant le rendez-vous (minutes) */
  reminderLeadMin: number;
  /** URL de l'agenda central (ex. http://localhost:4400) */
  serverUrl?: string;
  /** Clé API médecin (header X-Api-Key) */
  doctorApiKey?: string;
  /** Slug public du médecin (pour le lien /b/{slug}) */
  doctorSlug?: string;
  /** Dernière mise à jour des disponibilités (ISO) */
  availabilityUpdatedAt?: string;
  /** Dernière synchro réussie (ISO) */
  lastSyncAt?: string;
}

export interface PatientSummary {
  id: string;
  name: string;
  phone: string;
  visits: number;
  lastDate: string;
}

export interface SyncResult {
  ok: boolean;
  pushed: number;
  pulled: number;
  message: string;
}

export type RootStackParamList = {
  Tabs: undefined;
  NewAppointment: { date?: string } | undefined;
  AppointmentDetail: { id: string };
  Availability: undefined;
  PatientDetail: { id: string };
};

export type TabParamList = {
  Agenda: undefined;
  Establishments: undefined;
  Patients: undefined;
  Settings: undefined;
};
