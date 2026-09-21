import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePos } from '../state/PosProvider';
import { colors, radius, spacing } from '../theme';

export default function SignInScreen() {
  const { ready, rep, signIn, online, setOnline, storageBackend } = usePos();
  const [username, setUsername] = useState('kwame.mensah');
  const [pin, setPin] = useState('1234');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (rep) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(username.trim(), pin.trim());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.brand}>
          <Text style={styles.brandMark}>VAN POS</Text>
          <Text style={styles.brandSub}>Sage ERP field sales terminal</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Rep ID</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            accessibilityLabel="Rep ID"
          />
          <Text style={styles.label}>PIN</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="number-pad"
            accessibilityLabel="PIN"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={[styles.primary, (busy || !ready) && styles.disabled]} disabled={busy || !ready} onPress={submit}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Sign in</Text>}
          </Pressable>
          <Text style={styles.hint}>
            The PIN is checked on the device; connect an auth endpoint to validate it against the depot.
          </Text>
        </View>

        <View style={styles.connectivity}>
          <View>
            <Text style={styles.connectivityLabel}>Network</Text>
            <Text style={styles.connectivityValue}>{online ? 'Connected' : 'No coverage'}</Text>
          </View>
          <Switch value={online} onValueChange={setOnline} />
        </View>
        <Text style={styles.footer}>Local store: {storageBackend}</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.xl, maxWidth: 520, width: '100%', alignSelf: 'center' },
  brand: { gap: spacing.xs },
  brandMark: { fontSize: 32, fontWeight: '800', color: colors.primary, letterSpacing: 2 },
  brandSub: { fontSize: 14, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  primary: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.5 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
  connectivity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  connectivityLabel: { fontSize: 12, color: colors.textMuted },
  connectivityValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  footer: { textAlign: 'center', fontSize: 12, color: colors.textMuted },
});
