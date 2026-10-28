import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius } from '../theme';

interface SlotProps {
  time: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

export default function Slot({
  time,
  active = false,
  disabled = false,
  onPress,
  accessibilityLabel,
}: SlotProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.slot, active && styles.slotActive, disabled && styles.slotDisabled]}
      accessibilityLabel={accessibilityLabel || `Créneau ${time}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
    >
      <Text
        style={[
          styles.slotText,
          active && styles.slotTextActive,
          disabled && styles.slotTextDisabled,
        ]}
      >
        {time}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: 74,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotDisabled: { backgroundColor: colors.graySoft, borderColor: colors.graySoft },
  slotText: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  slotTextActive: { color: colors.white },
  slotTextDisabled: { color: colors.textFaint, textDecorationLine: 'line-through' },
});
