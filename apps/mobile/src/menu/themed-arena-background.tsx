import { Canvas } from '@shopify/react-native-skia';
import { useCallback } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import type { CanvasSize } from '@/game/rendering/types';
import { useGameTheme } from '@/game/themes/game-theme-provider';

export function ThemedArenaBackground() {
  const { palette, renderers } = useGameTheme();
  const { Arena } = renderers;
  const canvasSize = useSharedValue<CanvasSize>({ width: 0, height: 0 });
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;

      canvasSize.value = { width, height };
    },
    [canvasSize],
  );

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: palette.arena }]}
      onLayout={handleLayout}
    >
      <Canvas style={styles.canvas}>
        <Arena canvasSize={canvasSize} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});
