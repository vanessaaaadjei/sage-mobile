import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { Button } from './Button';

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
          <View style={styles.handle} />
          <Text style={styles.title}>Receipt</Text>
          <Text style={styles.sub}>Sent to {printerName}</Text>
          <ScrollView style={styles.paper} contentContainerStyle={styles.paperContent}>
            <Text style={styles.mono}>{payload}</Text>
          </ScrollView>
          <Button label="Done" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16, 24, 40, 0.55)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
    maxHeight: '85%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  title: typography.heading,
  sub: { ...typography.caption, marginTop: -spacing.sm },
  paper: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
  paperContent: { padding: spacing.lg },
  mono: { fontFamily: 'monospace', fontSize: 12, color: colors.text, lineHeight: 18 },
});
