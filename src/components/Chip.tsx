import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../theme';

interface ChipProps {
  label: string;
  active?: boolean;
  color?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

export default function Chip({
  label,
  active = false,
  color,
  onPress,
  accessibilityLabel,
}: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {!!color && <View style={[styles.chipDot, { backgroundColor: color }]} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 220,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.white },
});
