import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Product } from '../core/types';
import { colors, radius } from '../theme';

type Props = { product: Product; size?: number };

function ProductImageComponent({ product, size = 56 }: Props) {
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
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={product.id}
      transition={0}
      priority="low"
      onError={() => setFailed(true)}
    />
  );
}

export const ProductImage = memo(ProductImageComponent);

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceMuted },
  placeholder: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
});
