import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { minutesOf, timeSlots, todayISO } from '../utils/date';
import { validateAppointmentForm } from '../utils/validation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'NewAppointment'>;

const DURATIONS = [15, 20, 30, 45, 60];

export default function NewAppointmentScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { establishments, appointments, settings, addAppointment } = useStore();

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

  const taken = useMemo(() => {
    return new Set(
      appointments
        .filter(
          (a) =>
            a.date === date &&
            a.establishmentId === establishmentId &&
            a.status !== 'canceled',
        )
        .map((a) => a.time),
    );
  }, [appointments, date, establishmentId]);

  const slots = useMemo(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const isFutureDay = date > todayISO();
    return timeSlots(7, 18, 30).map((t) => ({
      time: t,
      disabled: taken.has(t) || (!isFutureDay && date === todayISO() && minutesOf(t) <= nowMin),
    }));
  }, [taken, date]);

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

    setSaving(true);
    try {
      addAppointment({
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        establishmentId,
        date,
        time: time!,
        durationMin,
        reason: reason.trim() || undefined,
      });
      Alert.alert('Rendez-vous créé', `${patientName.trim()} — ${date} à ${time}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
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
