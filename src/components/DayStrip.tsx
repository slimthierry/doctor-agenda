import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../theme';
import { addDays, dayNumber, isToday, weekdayShort } from '../utils/date';

interface Props {
  selected: string;
  onSelect: (date: string) => void;
  /** Nombre de jours affichés autour de la date sélectionnée (défaut : semaine) */
  days?: number;
}

export default function DayStrip({ selected, onSelect, days = 7 }: Props) {
  const anchor = days === 7 ? weekAnchor(selected) : addDays(selected, -Math.floor(days / 2));
  const list = Array.from({ length: days }, (_, i) => addDays(anchor, i));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {list.map(iso => {
        const active = iso === selected;
        const today = isToday(iso);
        return (
          <Pressable
            key={iso}
            onPress={() => onSelect(iso)}
            style={[styles.day, active && styles.dayActive]}
          >
            <Text style={[styles.wd, active && styles.wdActive]}>{weekdayShort(iso)}</Text>
            <Text style={[styles.num, active && styles.numActive]}>{dayNumber(iso)}</Text>
            {today && <View style={[styles.dot, active && styles.dotActive]} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function weekAnchor(iso: string): string {
  const base = new Date(`${iso}T00:00:00`);
  const dow = (base.getDay() + 6) % 7;
  return addDays(iso, -dow);
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  day: {
    width: 52,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 2,
  },
  dayActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  wd: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  wdActive: { color: colors.white },
  num: { fontSize: 18, fontWeight: '700', color: colors.text },
  numActive: { color: colors.white },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  dotActive: { backgroundColor: colors.white },
});
