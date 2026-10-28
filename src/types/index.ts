export type AppointmentStatus = 'draft' | 'confirmed' | 'done' | 'canceled';

export interface Establishment {
  id: string;
  name: string;
  address?: string;
  color: string;
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
  /** Dernière synchro réussie (ISO) */
  lastSyncAt?: string;
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
};

export type TabParamList = {
  Agenda: undefined;
  Establishments: undefined;
  Settings: undefined;
};
