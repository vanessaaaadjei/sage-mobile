import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import type { Product } from '../core/types';
import { colors, radius } from '../theme';

type Props = { product: Product; size?: number };

export function ProductImage({ product, size = 56 }: Props) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: radius.sm };

  if (!product.imageUrl || failed) {
    return (
      <View style={[styles.placeholder, box]}>
        <Ionicons name="cube-outline" size={size * 0.45} color={colors.textMuted} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: product.imageUrl }}
      style={[styles.image, box]}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceMuted },
  placeholder: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
});
