import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Chip from '../components/Chip';
import { useStore } from '../store/StoreContext';
import { colors, radius, shadow } from '../theme';
import { AvailabilityRule, RootStackParamList } from '../types';
import { defaultRules } from '../utils/slots';
import { minutesOf } from '../utils/date';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let m = 7 * 60; m <= 22 * 60; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
})();

export default function AvailabilityScreen() {
  const navigation = useNavigation<Nav>();
  const { availability, saveAvailability } = useStore();
  const [rules, setRules] = useState<AvailabilityRule[]>(
    availability.length > 0 ? availability : defaultRules()
  );
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const rows = useMemo(() => {
    const map = new Map<number, AvailabilityRule>();
    for (const r of rules) map.set(r.weekday, r);
    return Array.from({ length: 7 }, (_, i) => map.get(i)).filter((r): r is AvailabilityRule =>
      Boolean(r)
    );
  }, [rules]);

  function patch(weekday: number, field: 'start' | 'end', value: string) {
    setRules(prev => prev.map(r => (r.weekday === weekday ? { ...r, [field]: value } : r)));
  }

  function toggleClosed(weekday: number) {
    setRules(prev => prev.map(r => (r.weekday === weekday ? { ...r, end: r.start } : r)));
  }

  async function onSave() {
    for (const r of rules) {
      if (r.start >= r.end) {
        if (r.start === r.end) continue;
        return;
      }
      if (minutesOf(r.end) - minutesOf(r.start) < 30) {
        return;
      }
    }
    setSaving(true);
    try {
      await saveAvailability(rules);
      setSavedFlash(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mes horaires</Text>
        <Text style={styles.hint}>
          Les créneaux proposés dans l&apos;appli respectent ces plages. Sans horaire configuré,
          l&apos;app utilise le mode par défaut (lun–sam 08:00–18:00).
        </Text>

        <View style={styles.card}>
          {rows.map(r => (
            <View key={r.weekday} style={styles.row}>
              <View style={styles.rowHead}>
                <Text style={styles.day}>{WEEKDAYS[r.weekday]}</Text>
                <Pressable
                  onPress={() => toggleClosed(r.weekday)}
                  accessibilityLabel={`Jour ${WEEKDAYS[r.weekday]} ${r.end > r.start ? 'ouvert' : 'fermé'}`}
                  accessibilityRole="button"
                >
                  <Chip
                    label={r.end > r.start ? 'Ouvert' : 'Fermé'}
                    color={colors.primary}
                    active={r.end > r.start}
                    onPress={() => toggleClosed(r.weekday)}
                  />
                </Pressable>
              </View>
              <View style={styles.times}>
                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>Début</Text>
                  <View style={styles.chips}>
                    {TIME_OPTIONS.map(t => (
                      <Pressable
                        key={t}
                        onPress={() => patch(r.weekday, 'start', t)}
                        style={[styles.chip, r.start === t && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, r.start === t && styles.chipTextActive]}>
                          {t}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>Fin</Text>
                  <View style={styles.chips}>
                    {TIME_OPTIONS.map(t => (
                      <Pressable
                        key={t}
                        onPress={() => patch(r.weekday, 'end', t)}
                        style={[styles.chip, r.end === t && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, r.end === t && styles.chipTextActive]}>
                          {t}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={saving}
          accessibilityLabel="Sauvegarder les horaires"
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="checkmark" size={20} color={colors.white} />
          )}
          <Text style={styles.saveText}>
            {saving ? 'Sauvegarde...' : savedFlash ? 'Sauvegardé' : 'Sauvegarder'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    gap: 16,
    ...shadow.card,
  },
  row: { gap: 10 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  day: { fontSize: 15, fontWeight: '800', color: colors.text },
  times: { flexDirection: 'row', gap: 12 },
  timeCol: { flex: 1, gap: 4 },
  timeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textFaint,
    textTransform: 'uppercase',
  },
  chips: { flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  chipTextActive: { color: colors.white },
  footer: {
    padding: 16,
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
