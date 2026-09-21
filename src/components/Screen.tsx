import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';
import { SyncIndicator } from './SyncIndicator';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onIndicatorPress?: () => void;
  onSignOut?: () => void;
};

export function Screen({ title, subtitle, children, onIndicatorPress, onSignOut }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.actions}>
          <SyncIndicator onPress={onIndicatorPress} />
          {onSignOut ? (
            <Pressable onPress={onSignOut} accessibilityLabel="Sign out" hitSlop={8}>
              <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerText: { flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
