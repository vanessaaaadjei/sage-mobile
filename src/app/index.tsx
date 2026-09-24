import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { usePos } from '../state/PosProvider';
import { colors, radius, spacing } from '../theme';

export default function SignInScreen() {
  const { ready, signIn, storageBackend } = usePos();
  const [username, setUsername] = useState('kwame.mensah');
  const [pin, setPin] = useState('1234');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const pinRef = useRef<TextInput>(null);

  const canSubmit = ready && username.trim().length > 0 && pin.trim().length >= 4 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(username.trim(), pin.trim());
      router.replace('/(tabs)');
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
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>EC</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.brand}>Van POS</Text>
            <Text style={styles.tagline}>Ernest Chemists · Route sales</Text>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheet}>
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <View style={styles.formHeader}>
            <Text style={styles.heading}>Sign in</Text>
            <Text style={styles.sub}>Enter your rep credentials to open the van.</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Rep ID</Text>
            <View style={styles.inputShell}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => pinRef.current?.focus()}
                placeholder="rep.id"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Rep ID"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>PIN</Text>
            <View style={styles.inputShell}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                ref={pinRef}
                style={styles.input}
                value={pin}
                onChangeText={(next) => setPin(next.replace(/\D/g, '').slice(0, 8))}
                secureTextEntry={!showPin}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={submit}
                placeholder="••••"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="PIN"
                maxLength={8}
              />
              <Pressable
                onPress={() => setShowPin((value) => !value)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPin ? 'Hide PIN' : 'Show PIN'}>
                <Ionicons
                  name={showPin ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <Button
            label={busy ? 'Signing in…' : 'Sign in'}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
            style={styles.submit}
          />

       
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Text style={styles.footerText}>Works offline. Orders sync when you are back online.</Text>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: {
    backgroundColor: colors.primary,
    paddingBottom: spacing.xl,
  },
  heroInner: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandMark: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textOnPrimary,
    letterSpacing: 0.5,
  },
  heroCopy: { flex: 1, gap: 2 },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textOnPrimary,
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  formHeader: { gap: 6, marginBottom: spacing.sm },
  heading: { fontSize: 20, fontWeight: '600', color: colors.text, letterSpacing: -0.2 },
  sub: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  error: { flex: 1, color: colors.danger, fontSize: 13, fontWeight: '500' },
  submit: { marginTop: spacing.sm },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xs,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  metaText: { fontSize: 12, color: colors.textMuted },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
