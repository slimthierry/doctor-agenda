import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

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
import { Appointment, AvailabilityRule, Establishment, PatientSummary, Settings, SyncResult } from '../types';
import { addDays, todayISO } from '../utils/date';
import { colors, palette } from '../theme';

interface StoreValue {
  ready: boolean;
  appointments: Appointment[];
  establishments: Establishment[];
  settings: Settings;
  syncing: boolean;
  availability: AvailabilityRule[];
  saveAvailability: (rules: AvailabilityRule[]) => Promise<void>;
  addAppointment: (data: Omit<Appointment, 'id' | 'createdAt' | 'status' | 'updatedAt'>) => Appointment;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  removeAppointment: (id: string) => void;
  addEstablishment: (name: string, address?: string, color?: string) => Establishment;
  removeEstablishment: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  loadDemoData: () => void;
  syncNow: () => Promise<SyncResult>;
  appointmentsOn: (date: string, establishmentId?: string) => Appointment[];
  patients: PatientSummary[];
}

const StoreContext = createContext<StoreValue | null>(null);

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

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

  useEffect(() => {
    (async () => {
      const [a, e, s, av] = await Promise.all([
        loadAppointments(),
        loadEstablishments(),
        loadSettings(),
        loadAvailability(),
      ]);
      // Rétrocompat : les anciens RDV n'ont pas updatedAt
      setAppointments(a.map((x) => ({ ...x, updatedAt: x.updatedAt ?? x.createdAt })));
      setEstablishments(e.length ? e : SEED_ESTABLISHMENTS);
      if (!e.length) await saveEstablishments(SEED_ESTABLISHMENTS);
      setSettings(s);
      setAvailability(av);
      setReady(true);
    })();
  }, []);

  const persistAppointments = useCallback((list: Appointment[]) => {
    setAppointments(list);
    void saveAppointments(list);
  }, []);

  const persistEstablishments = useCallback((list: Establishment[]) => {
    setEstablishments(list);
    void saveEstablishments(list);
  }, []);

  const saveAvailability = useCallback<StoreValue['saveAvailability']>(async (rules) => {
    setAvailability(rules);
    void persistAvailability(rules);
    if (isServerConfigured(settings)) {
      try {
        await putAvailability(settings.serverUrl!.trim(), settings.doctorApiKey!.trim(), rules);
      } catch {
        // local-first : l'echec serveur ne doit pas perdre les regles locales
      }
    }
  }, [settings]);

  const addAppointment = useCallback<StoreValue['addAppointment']>(
    (data) => {
      const now = new Date().toISOString();
      const appt: Appointment = {
        ...data,
        id: uid(),
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      };
      setAppointments((prev) => {
        const next = [...prev, appt];
        void saveAppointments(next);
        return next;
      });
      return appt;
    },
    [],
  );

  const updateAppointment = useCallback<StoreValue['updateAppointment']>(
    (id, patch) => {
      setAppointments((prev) => {
        const next = prev.map((a) =>
          a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a,
        );
        void saveAppointments(next);
        return next;
      });
    },
    [],
  );

  const removeAppointment = useCallback<StoreValue['removeAppointment']>(
    (id) => {
      setAppointments((prev) => {
        const next = prev.filter((a) => a.id !== id);
        void saveAppointments(next);
        return next;
      });
    },
    [],
  );

  const addEstablishment = useCallback<StoreValue['addEstablishment']>(
    (name, address, color) => {
      const est: Establishment = {
        id: uid(),
        name,
        address,
        color: color || palette[establishments.length % palette.length],
      };
      persistEstablishments([...establishments, est]);
      return est;
    },
    [establishments, persistEstablishments],
  );

  const removeEstablishment = useCallback<StoreValue['removeEstablishment']>(
    (id) => {
      persistEstablishments(establishments.filter((e) => e.id !== id));
    },
    [establishments, persistEstablishments],
  );

  const updateSettings = useCallback<StoreValue['updateSettings']>(
    (patch) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        void saveSettings(next);
        return next;
      });
    },
    [],
  );

  const loadDemoData = useCallback(() => {
    const today = todayISO();
    const tomorrow = addDays(today, 1);
    const demo: Appointment[] = [
      {
        id: uid(),
        patientName: 'Afi SODJI',
        patientPhone: '+22890000001',
        establishmentId: establishments[0]?.id ?? 'est-cabinet',
        date: today,
        time: '08:30',
        durationMin: 30,
        reason: 'Consultation de suivi',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      },
      {
        id: uid(),
        patientName: 'Koffi AMEGAN',
        patientPhone: '+22890000002',
        establishmentId: establishments[0]?.id ?? 'est-cabinet',
        date: today,
        time: '10:00',
        durationMin: 20,
        reason: 'Première consultation',
        status: 'draft',
        createdAt: new Date().toISOString(),
      },
      {
        id: uid(),
        patientName: 'Mensah WAFA',
        patientPhone: '+22890000003',
        establishmentId: establishments[1]?.id ?? 'est-chu',
        date: tomorrow,
        time: '09:30',
        durationMin: 45,
        reason: 'Bilan annuel',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      },
    ];
    persistAppointments([...appointments, ...demo]);
  }, [appointments, establishments, persistAppointments]);

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
      // 1. Pousser l'état local (upsert idempotent côté serveur)
      const local = appointments.map((a) => ({
        ...a,
        updatedAt: a.updatedAt ?? a.createdAt,
      }));
      const pushRes = await pushAppointments(base, key, local.map(toServer));

      // 2. Tirer les changements serveur depuis la dernière synchro
      const pullRes = await pullAppointments(
        base,
        key,
        settings.lastSyncAt ?? '1970-01-01T00:00:00.000Z',
      );

      // 2b. Tirer les disponibilités serveur (miroir du local-first)
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

      // 2c. Memoriser le slug public du médecin (lien /b/{slug} de reservation patient)
      try {
        const me = await fetchMe(base, key);
        const nextSettings = { ...settings, doctorSlug: me.doctor.slug };
        setSettings(nextSettings);
        void saveSettings(nextSettings);
      } catch {
        // non bloquant : le lien reste utilisable avec le slug saisi dans les reglages
      }

      // 3. Fusion last-write-wins sur updatedAt
      const map = new Map<string, Appointment>(local.map((a) => [a.id, a]));
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
      const merged = [...map.values()];
      setAppointments(merged);
      void saveAppointments(merged);

      // 4. Mémoriser la date de synchro
      const nextSettings = { ...settings, lastSyncAt: pullRes.server_time };
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
        return { ok: false, pushed: 0, pulled: 0, message: 'Erreur de connexion. Vérifiez votre réseau et l\'URL du serveur.' };
      }
      if (message.includes('401') || message.includes('403')) {
        return { ok: false, pushed: 0, pulled: 0, message: 'Clé API invalide. Vérifiez vos identifiants.' };
      }
      if (message.includes('404')) {
        return { ok: false, pushed: 0, pulled: 0, message: 'URL du serveur introuvable.' };
      }
      return { ok: false, pushed: 0, pulled: 0, message };
    } finally {
      setSyncing(false);
    }
  }, [appointments, settings]);

  const appointmentsOn = useCallback(
    (date: string, establishmentId?: string) =>
      appointments
        .filter((a) => a.date === date)
        .filter((a) => !establishmentId || a.establishmentId === establishmentId)
        .sort((x, y) => x.time.localeCompare(y.time)),
    [appointments],
  );

  const patients = useMemo<PatientSummary[]>(() => {
    const map = new Map<string, PatientSummary>();
    for (const a of appointments) {
      const phone = (a.patientPhone ?? '').trim();
      const key = phone || a.patientName.trim();
      const existing = map.get(key);
      if (existing) {
        existing.visits += 1;
        if (a.date > existing.lastDate) {
          existing.lastDate = a.date;
          existing.name = a.patientName;
        }
      } else {
        map.set(key, {
          id: key,
          name: a.patientName,
          phone,
          visits: 1,
          lastDate: a.date,
        });
      }
    }
    return [...map.values()].sort((x, y) => y.lastDate.localeCompare(x.lastDate));
  }, [appointments]);

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
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans StoreProvider');
  return ctx;
}

export function statusMeta(status: Appointment['status']) {
  switch (status) {
    case 'confirmed':
      return { label: 'Confirmé', bg: colors.successSoft, fg: colors.success };
    case 'done':
      return { label: 'Terminé', bg: colors.infoSoft, fg: colors.info };
    case 'canceled':
      return { label: 'Annulé', bg: colors.dangerSoft, fg: colors.danger };
    default:
      return { label: 'À confirmer', bg: colors.warningSoft, fg: colors.warning };
  }
}
