import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '../../components/Screen';
import { usePos } from '../../state/PosProvider';
import { colors, radius, spacing } from '../../theme';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const {
    rep,
    online,
    setOnline,
    snapshot,
    lastSync,
    syncError,
    storageBackend,
    printer,
    setPrinter,
    syncNow,
    signOut,
    resetDemoData,
    pendingCount,
  } = usePos();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="Settings" subtitle={`${rep?.name ?? ''} · ${rep?.depot ?? ''}`}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connectivity</Text>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.rowLabel}>Network</Text>
                <Text style={styles.hint}>Simulate losing coverage on the route</Text>
              </View>
              <Switch value={online} onValueChange={setOnline} />
            </View>
            <Row label="Queued orders" value={String(pendingCount)} />
            <Row label="Last delta pull" value={snapshot.lastPulledAt ? new Date(snapshot.lastPulledAt).toLocaleString() : 'never'} />
            <Row label="Last push" value={snapshot.lastPushedAt ? new Date(snapshot.lastPushedAt).toLocaleString() : 'never'} />
            {lastSync ? (
              <Row
                label="Last result"
                value={`${lastSync.pulled.products} products · ${lastSync.pushed.accepted} posted · ${lastSync.pushed.duplicate} deduped`}
              />
            ) : null}
            {syncError ? <Text style={styles.error}>{syncError}</Text> : null}
            <Pressable style={styles.primary} onPress={syncNow}>
              <Text style={styles.primaryText}>Sync now</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bluetooth thermal printer</Text>
            <Row label="Device" value={printer.name} />
            <Row label="Address" value={printer.address} />
            <View style={styles.paperRow}>
              {[58, 80].map((width) => (
                <Pressable
                  key={width}
                  style={[styles.paperChip, printer.paper === width && styles.paperChipActive]}
                  onPress={() => setPrinter({ ...printer, paper: width as 58 | 80 })}>
                  <Text style={[styles.paperText, printer.paper === width && styles.paperTextActive]}>{width}mm</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Device</Text>
            <Row label="Encrypted local store" value={storageBackend} />
            <Row label="Van" value={rep?.vanCode ?? '—'} />
            <Row label="OTP channel" value="Direct SIM GSM (no data)" />
            <Pressable style={styles.secondary} onPress={resetDemoData}>
              <Text style={styles.secondaryText}>Clear local caches</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => {
                signOut();
                router.replace('/');
              }}>
              <Text style={styles.secondaryText}>Sign out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowLabel: { fontSize: 14, color: colors.textMuted },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.text, flexShrink: 1, textAlign: 'right' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { fontSize: 12, color: colors.textMuted },
  error: { color: colors.danger, fontSize: 13 },
  primary: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { marginTop: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  secondaryText: { color: colors.text, fontWeight: '700' },
  paperRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  paperChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  paperChipActive: { backgroundColor: colors.primary },
  paperText: { fontWeight: '700', color: colors.textMuted },
  paperTextActive: { color: '#fff' },
});
