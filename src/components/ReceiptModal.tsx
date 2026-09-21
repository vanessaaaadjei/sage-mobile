import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

type Props = {
  payload: string | null;
  printerName: string;
  onClose(): void;
};

export function ReceiptModal({ payload, printerName, onClose }: Props) {
  if (!payload) return null;
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Sent to {printerName}</Text>
          <ScrollView style={styles.paper} contentContainerStyle={styles.paperContent}>
            <Text style={styles.mono}>{payload}</Text>
          </ScrollView>
          <Pressable style={styles.primary} onPress={onClose}>
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16, 24, 40, 0.55)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    maxHeight: '85%',
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  paper: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
  paperContent: { padding: spacing.lg },
  mono: { fontFamily: 'monospace', fontSize: 12, color: colors.text, lineHeight: 18 },
  primary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
});
