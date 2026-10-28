import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Chip from '../components/Chip';
import DayStrip from '../components/DayStrip';
import Slot from '../components/Slot';
import { useStore } from '../store/StoreContext';
import { colors, radius, shadow } from '../theme';
import { RootStackParamList } from '../types';
import { addDays, addMonths, fromISO, minutesOf, todayISO } from '../utils/date';
import { defaultRules, freeSlots, overlaps } from '../utils/slots';
import { validateAppointmentForm } from '../utils/validation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'NewAppointment'>;

const DURATIONS = [15, 20, 30, 45, 60];

export default function NewAppointmentScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { establishments, appointments, settings, availability, patients, addAppointment } = useStore();

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [date, setDate] = useState(params?.date ?? todayISO());
  const [time, setTime] = useState<string | null>(null);
  const [durationMin, setDurationMin] = useState(30);
  const [establishmentId, setEstablishmentId] = useState(
    settings.defaultEstablishmentId ?? establishments[0]?.id ?? '',
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const knownPatients = useMemo(() => {
    const q = patientPhone.trim().toLowerCase();
    if (q.length < 3) return [];
    return patients
      .filter((p) => p.phone.includes(q) || p.name.toLowerCase().includes(patientName.trim().toLowerCase()))
      .slice(0, 5);
  }, [patients, patientName, patientPhone]);
  const [recur, setRecur] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none');
  const [occurrences, setOccurrences] = useState(4);
  const seriesId = useMemo(
    () => (recur === 'none' ? undefined : `ser-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
    [recur],
  );

  const rules = useMemo(
    () => availability.length > 0 ? availability : defaultRules(),
    [availability],
  );

  const dayAppointments = useMemo(
    () =>
      appointments.filter(
        (a) => a.date === date && (a.status ?? 'confirmed') !== 'canceled',
      ),
    [appointments, date],
  );

  const slots = useMemo(() => {
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const isToday = date === todayISO();
    const free = freeSlots({
      rules,
      appointments: dayAppointments,
      date,
      durationMin,
      establishmentId,
      nowMinutes: isToday ? nowMin : undefined,
    });
    const nowTotal = isToday ? nowMin : Number.MAX_SAFE_INTEGER;
    return free.map((time) => ({
      time,
      disabled: minutesOf(time) <= nowTotal,
    }));
  }, [rules, dayAppointments, date, durationMin, establishmentId]);

  async function onSave() {
    const error = validateAppointmentForm({
      patientName,
      patientPhone,
      date,
      time,
      establishmentId,
    });

    if (error) {
      setError(error.message);
      return;
    }

    if (time) {
      const clash = dayAppointments.some(
        (a) => overlaps(minutesOf(time), durationMin, minutesOf(a.time), a.durationMin),
      );
      if (clash) {
        setError("Ce créneau vient d'être pris, choisissez-en un autre.");
        return;
      }
    }

    const seriesDates: string[] = [];
    if (recur === 'weekly' || recur === 'biweekly') {
      const step = recur === 'weekly' ? 7 : 14;
      for (let k = 0; k < occurrences; k++) seriesDates.push(addDays(date, k * step));
    } else if (recur === 'monthly') {
      for (let k = 0; k < occurrences; k++) seriesDates.push(addMonths(date, k));
    } else if (recur === 'none') {
      seriesDates.push(date);
    }

    const createdDates: string[] = [];
    const skipped: string[] = [];
    for (const d of seriesDates) {
      const ok = !dayAppointments.some(
        (a) => a.date === d && overlaps(minutesOf(time ?? '00:00'), durationMin, minutesOf(a.time), a.durationMin),
      );
      if (ok) {
        createdDates.push(d);
      } else {
        skipped.push(d);
      }
    }

    setSaving(true);
    try {
      const targetDates = createdDates.length > 0 ? createdDates : [date];
      for (const d of targetDates) {
        addAppointment({
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim() || undefined,
          establishmentId,
          date: d,
          time: time!,
          durationMin,
          reason: reason.trim() || undefined,
          seriesId,
        });
      }
      if (recur === 'none') {
        Alert.alert('Rendez-vous créé', `${patientName.trim()} — ${date} à ${time}`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert(
          'Série créée',
          `${createdDates.length}/${seriesDates.length} créneau(x) programmé(s) sur ${occurrences} occurrence(s).` +
            (skipped.length > 0 ? ` ${skipped.length} ignoré(s) (conflit).` : ''),
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur lors de la création';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Patient</Text>
        <TextInput
          style={styles.input}
          placeholder="Nom et prénom du patient"
          placeholderTextColor={colors.textFaint}
          value={patientName}
          onChangeText={(t) => {
            setPatientName(t);
            setError(null);
          }}
        />
        <TextInput
          style={styles.input}
          placeholder="Téléphone (pour les rappels WhatsApp/SMS)"
          placeholderTextColor={colors.textFaint}
          keyboardType="phone-pad"
          value={patientPhone}
          onChangeText={setPatientPhone}
        />

        {knownPatients.length > 0 && (
          <View style={styles.patientList}>
            <Text style={styles.label}>Patients connus</Text>
            <FlatList
              data={knownPatients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setPatientName(item.name);
                    setPatientPhone(item.phone);
                  }}
                  style={({ pressed }) => [styles.patientRow, pressed && styles.pressed]}
                  accessibilityLabel={`Patient ${item.name}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.patientRowName}>{item.name}</Text>
                  <Text style={styles.patientRowPhone}>{item.phone}</Text>
                </Pressable>
              )}
              style={styles.patientFlat}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        <Text style={styles.label}>Établissement</Text>
        <View style={styles.wrap}>
          {establishments.map((est) => (
            <Chip
              key={est.id}
              label={est.name}
              color={est.color}
              active={est.id === establishmentId}
              onPress={() => setEstablishmentId(est.id)}
              accessibilityLabel={`Établissement ${est.name}`}
            />
          ))}
        </View>

        <Text style={styles.label}>Date</Text>
        <DayStrip selected={date} onSelect={setDate} days={14} />

        <Text style={[styles.label, { marginTop: 18 }]}>Créneau</Text>
        <View style={styles.wrap}>
          {slots.map(({ time: t, disabled }) => (
            <Slot
              key={t}
              time={t}
              active={t === time}
              disabled={disabled}
              onPress={() => {
                setTime(t);
                setError(null);
              }}
            />
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 18 }]}>Récurrent</Text>
        <View style={styles.wrap}>
          {(
            [
              ['none', 'Une fois'],
              ['weekly', 'Hebdo'],
              ['biweekly', 'Bimensuel'],
              ['monthly', 'Mensuel'],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              color={colors.primary}
              active={recur === value}
              onPress={() => setRecur(value)}
              accessibilityLabel={`Récurrence ${label}`}
            />
          ))}
        </View>
        {recur !== 'none' && (
          <>
            <Text style={[styles.label, { marginTop: 18 }]}>Occurrences</Text>
            <View style={styles.wrap}>
              {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                <Chip
                  key={n}
                  label={`${n}`}
                  color={colors.primary}
                  active={occurrences === n}
                  onPress={() => setOccurrences(n)}
                  accessibilityLabel={`Occurrences ${n}`}
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Durée</Text>
        <View style={styles.wrap}>
          {DURATIONS.map((d) => (
            <Chip
              key={d}
              label={`${d} min`}
              active={d === durationMin}
              onPress={() => setDurationMin(d)}
              accessibilityLabel={`Durée ${d} minutes`}
            />
          ))}
        </View>

        <Text style={styles.label}>Motif (facultatif)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Consultation, suivi, bilan…"
          placeholderTextColor={colors.textFaint}
          multiline
          value={reason}
          onChangeText={setReason}
        />

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }, saving && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={saving}
          accessibilityLabel="Créer le rendez-vous"
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="checkmark" size={20} color={colors.white} />
          )}
          <Text style={styles.saveText}>
            {saving ? 'Création...' : 'Créer le rendez-vous'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 10,
  },
  textarea: { height: 88, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: 10,
    marginTop: 16,
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  patientList: { marginTop: 16 },
  patientFlat: { maxHeight: 220 },
  patientRow: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  patientRowName: { fontSize: 14, fontWeight: '700', color: colors.text },
  patientRowPhone: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  pressed: { opacity: 0.75 },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    ...shadow.card,
  },
  saveText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
