import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePos } from '../state/PosProvider';
import { colors, radius, spacing } from '../theme';

export function SyncIndicator({ onPress }: { onPress?: () => void }) {
  const { online, syncing, pendingCount } = usePos();
  const tone = !online ? 'offline' : pendingCount > 0 ? 'queued' : 'synced';
  const palette = {
    offline: { bg: colors.dangerSoft, fg: colors.danger, label: 'Offline' },
    queued: { bg: colors.warningSoft, fg: colors.warning, label: `${pendingCount} queued` },
    synced: { bg: colors.successSoft, fg: colors.success, label: 'Synced' },
  }[tone];

  return (
    <Pressable onPress={onPress} style={[styles.pill, { backgroundColor: palette.bg }]}>
      {syncing ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View style={[styles.dot, { backgroundColor: palette.fg }]} />
      )}
      <Text style={[styles.label, { color: palette.fg }]}>{syncing ? 'Syncing…' : palette.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 38,
    borderRadius: radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '600' },
});
