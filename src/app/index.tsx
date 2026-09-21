import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { usePos } from '../state/PosProvider';
import { colors, radius, shadow, spacing, typography } from '../theme';

export default function SignInScreen() {
  const { ready, rep, signIn } = usePos();
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
    <View style={styles.root}>
      <SafeAreaView style={styles.hero} edges={['top']}>
        <View style={styles.heroInner}>
          <View style={styles.logo}>
            <Ionicons name="storefront" size={26} color={colors.primary} />
          </View>
          <Text style={styles.brand}>Van POS</Text>
          <Text style={styles.tagline}>Sell on the route. Sync when you&apos;re back.</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.sub}>Sign in with your rep ID and PIN.</Text>

          <View style={styles.field}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="Rep ID"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Rep ID"
            />
          </View>
          <View style={styles.field}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="number-pad"
              placeholder="PIN"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="PIN"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Sign in" icon="arrow-forward" onPress={submit} loading={busy} disabled={!ready} style={styles.submit} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  hero: { backgroundColor: colors.primary },
  heroInner: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.xxl + spacing.lg, gap: spacing.sm },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  brand: { ...typography.display, color: colors.textOnPrimary },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  body: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: -radius.xl,
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    ...shadow.card,
  },
  heading: typography.heading,
  sub: { ...typography.caption, marginTop: -spacing.sm, marginBottom: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  input: { flex: 1, paddingVertical: spacing.md + 2, fontSize: 16, color: colors.text },
  error: { color: colors.danger, fontSize: 13 },
  submit: { marginTop: spacing.sm },
});
