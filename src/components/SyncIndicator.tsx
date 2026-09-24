import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePos } from '../state/PosProvider';
import { colors, spacing } from '../theme';

function SyncIndicatorComponent({ onPress }: { onPress?: () => void }) {
  const { online, syncing, pendingCount } = usePos();
  const tone = !online ? 'offline' : pendingCount > 0 ? 'queued' : 'synced';
  const palette = {
    offline: { fg: colors.danger, label: 'Offline' },
    queued: { fg: colors.warning, label: `${pendingCount} queued` },
    synced: { fg: colors.success, label: 'Synced' },
  }[tone];

  return (
    <Pressable onPress={onPress} style={styles.chip} hitSlop={4}>
      {syncing ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : (
        <View style={[styles.dot, { backgroundColor: palette.fg }]} />
      )}
      <Text style={styles.label}>{syncing ? 'Syncing' : palette.label}</Text>
    </Pressable>
  );
}

export const SyncIndicator = memo(SyncIndicatorComponent);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.2 },
});
