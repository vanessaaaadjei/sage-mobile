import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
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
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityLabel="Back" style={styles.iconButton}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.headerText}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.actions}>
          <SyncIndicator onPress={onIndicatorPress} />
          {onSignOut ? (
            <Pressable onPress={onSignOut} accessibilityLabel="Sign out" style={styles.iconButton}>
              <Ionicons name="log-out-outline" size={20} color={colors.text} />
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: typography.title,
  subtitle: typography.overline,
});
