import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppointmentCard from '../components/AppointmentCard';
import Chip from '../components/Chip';
import DayStrip from '../components/DayStrip';
import { dayStats, defaultRules } from '../domain';
import { useStore } from '../store/StoreContext';
import { colors, radius, shadow } from '../theme';
import { RootStackParamList } from '../types';
import { addDays, formatLongDate, isToday, todayISO } from '../utils/date';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AgendaScreen() {
  const navigation = useNavigation<Nav>();
  const { appointmentsOn, appointments, establishments, availability, settings } = useStore();

  const [date, setDate] = useState(todayISO());
  const [filterId, setFilterId] = useState<string | undefined>();

  const all = useMemo(() => appointmentsOn(date), [appointmentsOn, date]);
  const list = useMemo(
    () => (filterId ? all.filter(a => a.establishmentId === filterId) : all),
    [all, filterId]
  );

  const rules = useMemo(
    () => (availability.length > 0 ? availability : defaultRules()),
    [availability]
  );
  const stats = useMemo(
    () => dayStats(appointments, date, rules, filterId),
    [appointments, date, rules, filterId]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>
            {settings.doctorName ? `${settings.doctorName}` : 'Agenda'}
          </Text>
          <Text style={styles.title}>Mon agenda</Text>
        </View>
        <Pressable
          style={styles.todayBtn}
          onPress={() => setDate(todayISO())}
          accessibilityLabel="Aller à aujourd'hui"
          accessibilityRole="button"
        >
          <Ionicons name="today-outline" size={14} color={colors.primary} />
          <Text style={styles.todayText}>{isToday(date) ? "Aujourd'hui" : 'Aujourd’hui'}</Text>
        </Pressable>
      </View>

      <DayStrip selected={date} onSelect={setDate} days={7} />

      <View style={styles.dateRow}>
        <Pressable
          onPress={() => setDate(addDays(date, -1))}
          hitSlop={8}
          accessibilityLabel="Jour précédent"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.dateLabel}>{formatLongDate(date)}</Text>
        <Pressable
          onPress={() => setDate(addDays(date, 1))}
          hitSlop={8}
          accessibilityLabel="Jour suivant"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.filters}>
        <Chip label="Tous" active={!filterId} onPress={() => setFilterId(undefined)} />
        {establishments.map(est => (
          <Chip
            key={est.id}
            label={est.name}
            color={est.color}
            active={filterId === est.id}
            onPress={() => setFilterId(est.id)}
          />
        ))}
      </View>

      <View style={styles.statsRow}>
        <Stat label="RDV du jour" value={stats.total} bg={colors.white} />
        <Stat
          label="Confirmés"
          value={stats.confirmed}
          bg={colors.successSoft}
          fg={colors.success}
        />
        <Stat
          label="À confirmer"
          value={stats.pending}
          bg={colors.warningSoft}
          fg={colors.warning}
        />
        <Stat
          label="Occupation"
          value={stats.occupancy === null ? '—' : `${stats.occupancy}%`}
          bg={colors.primarySoft}
          fg={colors.primary}
        />
      </View>

      <FlatList
        data={list}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AppointmentCard
            appointment={item}
            onPress={() => navigation.navigate('AppointmentDetail', { id: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={44} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>Aucun rendez-vous</Text>
            <Text style={styles.emptyText}>
              Touchez + pour planifier un rendez-vous à cette date.
            </Text>
          </View>
        }
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        onPress={() => navigation.navigate('NewAppointment', { date })}
        accessibilityLabel="Nouveau rendez-vous"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  bg,
  fg = colors.text,
}: {
  label: string;
  value: number | string;
  bg: string;
  fg?: string;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  hello: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  todayText: { color: colors.primary, fontWeight: '700', fontSize: 12.5 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  dateLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  stat: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10.5, color: colors.textMuted, marginTop: 2 },
  list: { padding: 16, paddingBottom: 110 },
  empty: { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.fab,
  },
});
