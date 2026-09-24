import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePos } from '../state/PosProvider';
import { colors, spacing, typography } from '../theme';
import { SyncIndicator } from './SyncIndicator';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onIndicatorPress?: () => void;
  onSignOut?: () => void;
  onBack?: () => void;
};

export function Screen({ title, subtitle, children, onIndicatorPress, onSignOut, onBack }: Props) {
  const { rep } = usePos();
  const meta = onBack
    ? (subtitle ?? 'Back')
    : [rep?.vanCode ? `Van ${rep.vanCode}` : null, rep?.depot, subtitle].filter(Boolean).join(' · ') || 'Van POS';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.leading}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityLabel="Back"
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
          ) : null}
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {meta}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <SyncIndicator onPress={onIndicatorPress} />
          {onSignOut ? (
            <Pressable
              onPress={onSignOut}
              accessibilityLabel="Sign out"
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  leading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  back: { marginLeft: -4, padding: 2 },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  title: { ...typography.title, fontSize: 17, lineHeight: 22 },
  subtitle: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.65 },
});
