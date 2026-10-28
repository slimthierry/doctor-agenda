import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';

import {
  buildReminderMessage,
  cancelReminder,
  scheduleReminder,
  sendSMS,
  sendWhatsApp,
} from '../services/notifications';
import { statusMeta, useStore } from '../store/StoreContext';
import { colors, radius, shadow } from '../theme';
import { RootStackParamList } from '../types';
import { formatDuration, formatLongDate } from '../utils/date';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'AppointmentDetail'>;

export default function AppointmentDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const {
    appointments,
    establishments,
    settings,
    updateAppointment,
    removeAppointment,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const appt = appointments.find((a) => a.id === params.id);

  const seriesId = appt?.seriesId;
  const seriesUpcoming = useMemo(
    () =>
      appointments.filter(
        (a) => a.seriesId === seriesId && a.date > (appt?.date ?? '') && (a.status ?? 'confirmed') !== 'canceled',
      ),
    [appointments, seriesId, appt?.date],
  );

  if (!appt) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Ce rendez-vous n'existe plus.</Text>
      </View>
    );
  }

  const est = establishments.find((e) => e.id === appt.establishmentId);
  const meta = statusMeta(appt.status);
  const message = buildReminderMessage(appt, est, settings);

  async function setStatus(status: 'confirmed' | 'done' | 'canceled') {
    setLoading(true);
    try {
      updateAppointment(appt!.id, { status });
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de modifier le statut.');
    } finally {
      setLoading(false);
    }
  }

  async function onToggleReminder() {
    if (appt!.reminderId) {
      await cancelReminder(appt!.reminderId);
      updateAppointment(appt!.id, { reminderId: undefined });
      Alert.alert('Rappel annulé', 'Le rappel push a été retiré.');
      return;
    }
    const id = await scheduleReminder(appt!, settings);
    if (id) {
      updateAppointment(appt!.id, { reminderId: id });
      Alert.alert(
        'Rappel programmé',
        `Vous serez notifié(e) ${settings.reminderLeadMin} min avant le rendez-vous.`,
      );
    } else {
      Alert.alert(
        'Rappel impossible',
        'Permission de notification refusée ou rendez-vous déjà passé.',
      );
    }
  }

  async function onWhatsApp() {
    if (!appt!.patientPhone) {
      Alert.alert('Téléphone manquant', 'Ajoutez un numéro au rendez-vous.');
      return;
    }
    await sendWhatsApp(appt!.patientPhone!, message);
  }

  async function onSMS() {
    if (!appt!.patientPhone) {
      Alert.alert('Téléphone manquant', 'Ajoutez un numéro au rendez-vous.');
      return;
    }
    await sendSMS(appt!.patientPhone!, message);
  }

  function onDelete() {
    Alert.alert('Supprimer', `Supprimer le rendez-vous de ${appt!.patientName} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await cancelReminder(appt!.reminderId);
          removeAppointment(appt!.id);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: est?.color ?? colors.primary }]}>
          <Text style={styles.heroTime}>{appt.time}</Text>
          <Text style={styles.heroDate}>
            {formatLongDate(appt.date)} • {formatDuration(appt.durationMin)}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.name}>{appt.patientName}</Text>
            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
            </View>
          </View>

          {!!seriesId && (
            <View style={styles.seriesRow}>
              <Ionicons name="repeat-outline" size={14} color={colors.primary} />
              <Text style={styles.seriesText}>Série de rendez-vous</Text>
            </View>
          )}

          {!!appt.patientPhone && (
            <DetailRow icon="call-outline" label="Téléphone" value={appt.patientPhone} />
          )}
          {!!est && (
            <DetailRow
              icon="business-outline"
              label="Établissement"
              value={est.name + (est.address ? ` — ${est.address}` : '')}
            />
          )}
          {!!appt.reason && (
            <DetailRow icon="document-text-outline" label="Motif" value={appt.reason} />
          )}
          {!!appt.reminderSentAt && (
            <DetailRow
              icon="notifications-outline"
              label="Rappel serveur"
              value={`Envoyé le ${new Date(appt.reminderSentAt).toLocaleString('fr-FR')}`}
            />
          )}
          <DetailRow
            icon="notifications-outline"
            label="Rappel push"
            value={
              appt.reminderId
                ? `Programmé (${settings.reminderLeadMin} min avant)`
                : 'Non programmé'
            }
          />
        </View>

        {appt.status !== 'canceled' && appt.status !== 'done' && (
          <View style={styles.actionsRow}>
            {appt.status === 'draft' && (
              <ActionBtn
                icon="checkmark-circle"
                label="Confirmer"
                color={colors.success}
                onPress={() => setStatus('confirmed')}
              />
            )}
            <ActionBtn
              icon="checkmark-done"
              label="Terminé"
              color={colors.info}
              onPress={() => setStatus('done')}
            />
            <ActionBtn
              icon="close-circle"
              label="Annuler"
              color={colors.danger}
              onPress={() => setStatus('canceled')}
            />
          </View>
        )}

        {!!seriesId && seriesUpcoming.length > 0 && (
          <View style={styles.actionsRow}>
            <ActionBtn
              icon="close-circle"
              label="Annuler la série"
              color={colors.danger}
              onPress={async () => {
                setLoading(true);
                try {
                  for (const a of seriesUpcoming) {
                    updateAppointment(a.id, { status: 'canceled' });
                  }
                  Alert.alert('Série annulée', `${seriesUpcoming.length} prochain(s) rendez-vous(s) annulé(s).`);
                } finally {
                  setLoading(false);
                }
              }}
            />
          </View>
        )}

        <Text style={styles.section}>Rappels patient</Text>
        <View style={styles.actionsRow}>
          <ActionBtn
            icon="logo-whatsapp"
            label="WhatsApp"
            color={colors.primary}
            onPress={onWhatsApp}
          />
          <ActionBtn
            icon="chatbubble-ellipses"
            label="SMS"
            color={colors.accent}
            onPress={onSMS}
          />
          <ActionBtn
            icon={appt.reminderId ? 'notifications' : 'notifications-outline'}
            label={appt.reminderId ? 'Retirer' : 'Rappel push'}
            color={colors.warning}
            onPress={onToggleReminder}
          />
        </View>

        <Pressable style={styles.deleteBtn} onPress={onDelete} accessibilityLabel="Supprimer le rendez-vous" accessibilityRole="button">
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.deleteText}>Supprimer le rendez-vous</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={17} color={colors.textMuted} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.75 }]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View style={[styles.actionIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingText: { color: colors.textMuted, fontSize: 15 },
  hero: {
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    ...shadow.card,
  },
  heroTime: { fontSize: 40, fontWeight: '900', color: colors.white },
  heroDate: { fontSize: 14, color: colors.white, fontWeight: '600' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 14,
    gap: 12,
    ...shadow.card,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, flexShrink: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11.5, fontWeight: '700' },
  detailRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  detailLabel: { fontSize: 11, color: colors.textFaint, fontWeight: '700', textTransform: 'uppercase' },
  detailValue: { fontSize: 14.5, color: colors.text, marginTop: 1 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    ...shadow.card,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  seriesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seriesText: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginTop: 22,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingVertical: 12,
  },
  deleteText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
