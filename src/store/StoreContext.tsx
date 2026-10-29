import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  aggregatePatients,
  buildUpdatePatch,
  conflictsWith,
  createAppointment,
  pendingPushReminders,
} from '../domain';
import {
  fetchAvailability,
  fetchMe,
  fromServer,
  isServerConfigured,
  pullAppointments,
  pushAppointments,
  putAvailability,
  toServer,
} from '../services/api';
import { scheduleReminder } from '../services/notifications';
import {
  loadAppointments,
  loadAvailability,
  loadEstablishments,
  loadSettings,
  saveAppointments,
  saveAvailability as persistAvailability,
  saveEstablishments,
  saveSettings,
  DEFAULT_SETTINGS,
} from '../services/storage';
import {
  Appointment,
  AvailabilityRule,
  Establishment,
  NewAppointmentInput,
  PatientSummary,
  Settings,
  SyncResult,
} from '../types';
import { addDays, todayISO } from '../utils/date';
import { palette } from '../theme';

interface StoreValue {
  ready: boolean;
  appointments: Appointment[];
  establishments: Establishment[];
  settings: Settings;
  syncing: boolean;
  availability: AvailabilityRule[];
  saveAvailability: (rules: AvailabilityRule[]) => Promise<void>;
  addAppointment: (data: NewAppointmentInput) => Appointment;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  removeAppointment: (id: string) => void;
  addEstablishment: (name: string, address?: string, color?: string) => Establishment;
  removeEstablishment: (id: string) => boolean;
  updateSettings: (patch: Partial<Settings>) => void;
  loadDemoData: () => void;
  syncNow: () => Promise<SyncResult>;
  appointmentsOn: (date: string, establishmentId?: string) => Appointment[];
  patients: PatientSummary[];
}

const StoreContext = createContext<StoreValue | null>(null);

const SEED_ESTABLISHMENTS: Establishment[] = [
  { id: 'est-cabinet', name: 'Cabinet médical – Lomé', address: 'Lomé, Togo', color: palette[0] },
  { id: 'est-chu', name: 'CHU de Lomé', address: 'Tokoin, Lomé', color: palette[1] },
  { id: 'est-clinique', name: 'Clinique de Rappotemé', address: 'Agoè, Lomé', color: palette[5] },
];

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [syncing, setSyncing] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityRule[]>([]);
  const appointmentsRef = useRef<Appointment[]>([]);

  const dismissedRemindersRef = useRef<Set<string>>(new Set());
  const autoScheduledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const [a, e, s, av] = await Promise.all([
        loadAppointments(),
        loadEstablishments(),
        loadSettings(),
        loadAvailability(),
      ]);
      const retro = a.map(x => ({ ...x, updatedAt: x.updatedAt ?? x.createdAt }));
      appointmentsRef.current = retro;
      setAppointments(retro);
      setEstablishments(e.length ? e : SEED_ESTABLISHMENTS);
      if (!e.length) await saveEstablishments(SEED_ESTABLISHMENTS);
      setSettings(s);
      setAvailability(av);
      setReady(true);
    })();
  }, []);

  const commitAppointments = useCallback((list: Appointment[]) => {
    appointmentsRef.current = list;
    setAppointments(list);
    void saveAppointments(list);
  }, []);

  const persistEstablishments = useCallback((list: Establishment[]) => {
    setEstablishments(list);
    void saveEstablishments(list);
  }, []);

  const saveAvailability = useCallback<StoreValue['saveAvailability']>(
    async rules => {
      setAvailability(rules);
      void persistAvailability(rules);
      if (isServerConfigured(settings)) {
        try {
          await putAvailability(settings.serverUrl!.trim(), settings.doctorApiKey!.trim(), rules);
        } catch {
          // local-first : l'echec serveur ne doit pas perdre les regles locales
        }
      }
    },
    [settings]
  );

  const addAppointment = useCallback<StoreValue['addAppointment']>(
    data => {
      const clash = conflictsWith(appointmentsRef.current, {
        date: data.date,
        time: data.time,
        durationMin: data.durationMin,
      });
      if (clash) {
        throw new Error("Ce créneau vient d'être pris, choisissez-en un autre.");
      }
      const appt = createAppointment(data, new Date().toISOString());
      commitAppointments([...appointmentsRef.current, appt]);
      return appt;
    },
    [commitAppointments]
  );

  const updateAppointment = useCallback<StoreValue['updateAppointment']>(
    (id, patch) => {
      const current = appointmentsRef.current.find(a => a.id === id);
      if (!current) return;
      const slot = {
        date: patch.date ?? current.date,
        time: patch.time ?? current.time,
        durationMin: patch.durationMin ?? current.durationMin,
      };
      if ((patch.date ?? patch.time ?? patch.durationMin) !== undefined) {
        const moved =
          slot.date !== current.date ||
          slot.time !== current.time ||
          slot.durationMin !== current.durationMin;
        if (moved && conflictsWith(appointmentsRef.current, slot, id)) {
          throw new Error('Le nouveau créneau entre en conflit avec un rendez-vous existant.');
        }
      } else if (patch.reminderId === undefined && current.reminderId) {
        dismissedRemindersRef.current.add(id);
      }
      const next = { ...current, ...buildUpdatePatch(current, patch, new Date().toISOString()) };
      commitAppointments(
        appointmentsRef.current.map(a => (a.id === id ? (next as Appointment) : a))
      );
    },
    [commitAppointments]
  );

  const removeAppointment = useCallback<StoreValue['removeAppointment']>(
    id => {
      commitAppointments(appointmentsRef.current.filter(a => a.id !== id));
    },
    [commitAppointments]
  );

  const addEstablishment = useCallback<StoreValue['addEstablishment']>(
    (name, address, color) => {
      const est: Establishment = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        address,
        color: color || palette[establishments.length % palette.length],
      };
      persistEstablishments([...establishments, est]);
      return est;
    },
    [establishments, persistEstablishments]
  );

  const updateSettings = useCallback<StoreValue['updateSettings']>(patch => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const removeEstablishment = useCallback<StoreValue['removeEstablishment']>(
    id => {
      const activeCount = appointmentsRef.current.filter(
        a => a.establishmentId === id && a.status !== 'canceled'
      ).length;
      if (activeCount > 0) return false;
      persistEstablishments(establishments.filter(e => e.id !== id));
      if (settings.defaultEstablishmentId === id) {
        updateSettings({ defaultEstablishmentId: undefined });
      }
      return true;
    },
    [establishments, persistEstablishments, settings.defaultEstablishmentId, updateSettings]
  );

  const loadDemoData = useCallback(() => {
    const today = todayISO();
    const tomorrow = addDays(today, 1);
    const now = new Date().toISOString();
    const createDemo = (
      patientName: string,
      patientPhone: string,
      establishmentId: string,
      date: string,
      time: string,
      durationMin: number,
      reason: string,
      status: Appointment['status']
    ): Appointment => {
      const appt = createAppointment(
        { patientName, patientPhone, establishmentId, date, time, durationMin, reason },
        now
      );
      appt.status = status;
      return appt;
    };
    const demo = [
      createDemo(
        'Afi SODJI',
        '+22890000001',
        establishments[0]?.id ?? 'est-cabinet',
        today,
        '08:30',
        30,
        'Consultation de suivi',
        'confirmed'
      ),
      createDemo(
        'Koffi AMEGAN',
        '+22890000002',
        establishments[0]?.id ?? 'est-cabinet',
        today,
        '10:00',
        20,
        'Première consultation',
        'draft'
      ),
      createDemo(
        'Mensah WAFA',
        '+22890000003',
        establishments[1]?.id ?? 'est-chu',
        tomorrow,
        '09:30',
        45,
        'Bilan annuel',
        'confirmed'
      ),
    ];
    commitAppointments([...appointmentsRef.current, ...demo]);
  }, [establishments, commitAppointments]);

  const syncNow = useCallback<StoreValue['syncNow']>(async () => {
    if (!isServerConfigured(settings)) {
      return {
        ok: false,
        pushed: 0,
        pulled: 0,
        message: "Renseignez l'URL du serveur et la clé médecin dans les réglages.",
      };
    }
    const base = settings.serverUrl!.trim();
    const key = settings.doctorApiKey!.trim();

    setSyncing(true);
    try {
      const local = appointmentsRef.current.map(a => ({
        ...a,
        updatedAt: a.updatedAt ?? a.createdAt,
      }));
      const pushRes = await pushAppointments(base, key, local.map(toServer));

      const pullRes = await pullAppointments(
        base,
        key,
        settings.lastSyncAt ?? '1970-01-01T00:00:00.000Z'
      );

      let nextSettings = { ...settings };

      let serverRules: AvailabilityRule[] | null = null;
      try {
        serverRules = await fetchAvailability(base, key);
      } catch {
        serverRules = null;
      }
      if (serverRules) {
        setAvailability(serverRules);
        void persistAvailability(serverRules);
      }

      try {
        const me = await fetchMe(base, key);
        nextSettings = { ...nextSettings, doctorSlug: me.doctor.slug };
      } catch {
        // non bloquant : le lien reste utilisable avec le slug saisi dans les reglages
      }

      const map = new Map<string, Appointment>(local.map(a => [a.id, a]));
      for (const s of pullRes.appointments) {
        const incoming = fromServer(s);
        const current = map.get(incoming.id);
        if (!current) {
          map.set(incoming.id, incoming);
          continue;
        }
        const currentU = current.updatedAt ?? current.createdAt;
        const incomingU = incoming.updatedAt ?? incoming.createdAt;
        if (incomingU > currentU) map.set(incoming.id, incoming);
      }
      commitAppointments([...map.values()]);

      nextSettings = { ...nextSettings, lastSyncAt: pullRes.server_time };
      setSettings(nextSettings);
      void saveSettings(nextSettings);

      const pushed = pushRes.created + pushRes.updated + pushRes.kept;
      return {
        ok: true,
        pushed,
        pulled: pullRes.appointments.length,
        message: `Synchro OK — ${pushed} envoyé(s), ${pullRes.appointments.length} reçu(s).`,
      };
    } catch (e) {
      console.error('Sync error:', e);
      const message = e instanceof Error ? e.message : 'Échec de la synchro';
      if (message.includes('fetch') || message.includes('network')) {
        return {
          ok: false,
          pushed: 0,
          pulled: 0,
          message: "Erreur de connexion. Vérifiez votre réseau et l'URL du serveur.",
        };
      }
      if (message.includes('401') || message.includes('403')) {
        return {
          ok: false,
          pushed: 0,
          pulled: 0,
          message: 'Clé API invalide. Vérifiez vos identifiants.',
        };
      }
      if (message.includes('404')) {
        return { ok: false, pushed: 0, pulled: 0, message: 'URL du serveur introuvable.' };
      }
      return { ok: false, pushed: 0, pulled: 0, message };
    } finally {
      setSyncing(false);
    }
  }, [settings, commitAppointments]);

  const appointmentsOn = useCallback(
    (date: string, establishmentId?: string) =>
      appointments
        .filter(a => a.date === date)
        .filter(a => !establishmentId || a.establishmentId === establishmentId)
        .sort((x, y) => x.time.localeCompare(y.time)),
    [appointments]
  );

  const patients = useMemo<PatientSummary[]>(() => aggregatePatients(appointments), [appointments]);

  useEffect(() => {
    if (!ready || settings.autoReminders === false) return;
    const targets = pendingPushReminders(appointments, {
      leadMin: settings.reminderLeadMin,
      nowMs: Date.now(),
    });
    void (async () => {
      for (const appt of targets) {
        const key = `${appt.id}:${settings.reminderLeadMin}`;
        if (autoScheduledRef.current.has(key) || dismissedRemindersRef.current.has(appt.id)) {
          continue;
        }
        autoScheduledRef.current.add(key);
        const reminderId = await scheduleReminder(appt, settings);
        if (reminderId) {
          updateAppointment(appt.id, { reminderId });
        } else {
          autoScheduledRef.current.delete(key);
        }
      }
    })();
  }, [ready, appointments, settings, updateAppointment]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      appointments,
      establishments,
      settings,
      syncing,
      availability,
      saveAvailability,
      addAppointment,
      updateAppointment,
      removeAppointment,
      addEstablishment,
      removeEstablishment,
      updateSettings,
      loadDemoData,
      syncNow,
      appointmentsOn,
      patients,
    }),
    [
      ready,
      appointments,
      establishments,
      settings,
      syncing,
      availability,
      saveAvailability,
      addAppointment,
      updateAppointment,
      removeAppointment,
      addEstablishment,
      removeEstablishment,
      updateSettings,
      loadDemoData,
      syncNow,
      appointmentsOn,
      patients,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans StoreProvider');
  return ctx;
}
