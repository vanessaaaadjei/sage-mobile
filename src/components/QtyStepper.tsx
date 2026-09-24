import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

type Props = {
  value: number;
  max?: number;
  onChange(value: number): void;
  /** Shown under the field, e.g. unit name. */
  unit?: string;
};

function clamp(raw: number, max?: number) {
  if (!Number.isFinite(raw) || raw < 0) return 0;
  const whole = Math.floor(raw);
  if (max !== undefined) return Math.min(whole, max);
  return whole;
}

export function QtyStepper({ value, max, onChange, unit }: Props) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (next: string) => {
    if (next.trim() === '') {
      setText('0');
      onChange(0);
      return;
    }
    const parsed = clamp(Number(next), max);
    setText(String(parsed));
    if (parsed !== value) onChange(parsed);
  };

  const stockLabel =
    max === undefined ? null : max <= 0 ? 'Out of stock' : `${max} available${unit ? ` · ${unit}` : ''}`;

  return (
    <View style={styles.block} accessibilityLabel={`Quantity ${value}${max !== undefined ? `, ${max} available` : ''}`}>
      <Text style={styles.label}>Qty</Text>
      <TextInput
        style={[styles.input, max !== undefined && max <= 0 && styles.inputDisabled]}
        value={text}
        onChangeText={(next) => {
          const digits = next.replace(/[^\d]/g, '');
          setText(digits);
          if (digits === '') return;
          const parsed = clamp(Number(digits), max);
          if (parsed !== value) onChange(parsed);
        }}
        onBlur={() => commit(text)}
        onSubmitEditing={() => commit(text)}
        keyboardType="number-pad"
        selectTextOnFocus
        returnKeyType="done"
        maxLength={4}
        editable={max === undefined || max > 0}
        accessibilityLabel="Quantity"
      />
      {stockLabel ? (
        <Text style={[styles.stock, max !== undefined && max <= 0 && styles.stockEmpty]} numberOfLines={1}>
          {stockLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    width: 88,
    alignItems: 'stretch',
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  inputDisabled: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
  stock: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'left',
    lineHeight: 14,
  },
  stockEmpty: {
    color: colors.danger,
  },
});
