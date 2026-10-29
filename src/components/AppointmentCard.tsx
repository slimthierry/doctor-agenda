import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow } from '../theme';
import { Appointment } from '../types';
import { statusMeta } from '../domain';
import { useStore } from '../store/StoreContext';
import { formatDuration } from '../utils/date';

interface Props {
  appointment: Appointment;
  onPress: () => void;
}

export default function AppointmentCard({ appointment, onPress }: Props) {
  const { establishments } = useStore();
  const est = establishments.find(e => e.id === appointment.establishmentId);
  const meta = statusMeta(appointment.status);
  const canceled = appointment.status === 'canceled';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.timeCol, { borderLeftColor: est?.color ?? colors.primary }]}>
        <Text style={[styles.time, canceled && styles.strike]}>{appointment.time}</Text>
        <Text style={styles.dur}>{formatDuration(appointment.durationMin)}</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, canceled && styles.strike]} numberOfLines={1}>
          {appointment.patientName}
        </Text>
        {!!appointment.reason && (
          <Text style={styles.reason} numberOfLines={1}>
            {appointment.reason}
          </Text>
        )}
        <View style={styles.metaRow}>
          {!!est && (
            <View style={styles.estRow}>
              <View style={[styles.estDot, { backgroundColor: est.color }]} />
              <Text style={styles.est} numberOfLines={1}>
                {est.name}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.badge, { backgroundColor: meta.bg }]}>
        <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
      </View>

      {!!appointment.patientPhone && (
        <Ionicons name="logo-whatsapp" size={16} color={colors.primary} style={styles.wa} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 12,
    gap: 10,
    marginBottom: 10,
    ...shadow.card,
  },
  pressed: { opacity: 0.75 },
  timeCol: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    minWidth: 62,
    gap: 2,
  },
  time: { fontSize: 15, fontWeight: '800', color: colors.text },
  dur: { fontSize: 11, color: colors.textFaint },
  body: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  reason: { fontSize: 12, color: colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  estRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  estDot: { width: 7, height: 7, borderRadius: 4 },
  est: { fontSize: 11, color: colors.textMuted, flexShrink: 1 },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 10.5, fontWeight: '700' },
  wa: { marginRight: 2 },
  strike: { textDecorationLine: 'line-through', color: colors.textFaint },
});
