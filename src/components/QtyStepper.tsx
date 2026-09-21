import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

type Props = {
  value: number;
  max?: number;
  onChange(value: number): void;
};

export function QtyStepper({ value, max, onChange }: Props) {
  const canIncrease = max === undefined || value < max;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="Decrease quantity"
        style={[styles.button, value <= 0 && styles.buttonDisabled]}
        onPress={() => onChange(Math.max(0, value - 1))}>
        <Text style={styles.buttonText}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        accessibilityLabel="Increase quantity"
        style={[styles.button, !canIncrease && styles.buttonDisabled]}
        disabled={!canIncrease}
        onPress={() => onChange(value + 1)}>
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 3,
    gap: spacing.xs,
  },
  button: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { fontSize: 17, fontWeight: '700', color: colors.primary, lineHeight: 20 },
  value: { minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.text },
});
