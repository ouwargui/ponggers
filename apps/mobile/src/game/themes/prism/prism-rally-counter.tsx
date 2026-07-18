import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  getRallyCounterBaseScale,
  isRallyMilestone,
  RALLY_COUNTER_VISIBLE_FROM,
} from '@/game/engine/rally';
import { getCenteredHudTranslateY } from '@/game/presentation/hud-layout';
import { prismTextGlow } from '@/game/themes/prism/prism-text-glow';
import {
  PRISM_SPECTRUM,
  prismPalette,
} from '@/game/themes/prism/prism-tokens';
import type { RallyCounterRendererProps } from '@/game/themes/types';

const COUNTER_HEIGHT = 46;
const COUNTER_TRANSLATE_Y = getCenteredHudTranslateY(COUNTER_HEIGHT);

export function PrismRallyCounter({ hitCount }: RallyCounterRendererProps) {
  const [displayedHitCount, setDisplayedHitCount] = useState(0);
  const renderedHitCount = useSharedValue(0);
  const opacity = useSharedValue(0);
  const popScale = useSharedValue(1);
  const flare = useSharedValue(0.32);
  const updateDisplayedHitCount = useCallback((value: number) => {
    setDisplayedHitCount(value);
  }, []);

  useAnimatedReaction(
    () => hitCount.value,
    (currentHitCount, previousHitCount) => {
      if (currentHitCount < RALLY_COUNTER_VISIBLE_FROM) {
        opacity.value = withTiming(0, { duration: 120 });
        return;
      }

      if (currentHitCount === previousHitCount) {
        return;
      }

      scheduleOnRN(updateDisplayedHitCount, currentHitCount);
      renderedHitCount.value = currentHitCount;
      opacity.value = withTiming(1, { duration: 70 });
      flare.value = withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0.32, { duration: 220 }),
      );
      popScale.value = 0.86;
      popScale.value = withSequence(
        withSpring(isRallyMilestone(currentHitCount) ? 1.48 : 1.2, {
          damping: 10,
          stiffness: 340,
        }),
        withSpring(1, { damping: 13, stiffness: 260 }),
      );
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: COUNTER_TRANSLATE_Y },
      {
        scale:
          getRallyCounterBaseScale(renderedHitCount.value) * popScale.value,
      },
    ],
  }));
  const spectrumStyle = useAnimatedStyle(() => ({ opacity: flare.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, animatedStyle]}
    >
      <Animated.View style={[styles.spectrum, spectrumStyle]}>
        {PRISM_SPECTRUM.map((color) => (
          <View key={color} style={[styles.spectrumBand, { backgroundColor: color }]} />
        ))}
      </Animated.View>
      <View style={styles.copy}>
        <Text style={styles.caption}>REFRACTION</Text>
        <Text
          style={[
            styles.value,
            prismTextGlow(prismPalette.centerLine.glow, 8),
          ]}
        >
          {displayedHitCount}×
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: 12,
    width: 78,
    height: COUNTER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spectrum: {
    width: 4,
    height: 36,
    overflow: 'hidden',
    borderRadius: 2,
  },
  spectrumBand: {
    flex: 1,
  },
  copy: {
    marginLeft: 7,
    alignItems: 'flex-start',
  },
  caption: {
    color: prismPalette.centerLine.glow,
    fontSize: 5.5,
    fontWeight: '900',
    letterSpacing: 1.1,
    opacity: 0.72,
  },
  value: {
    color: prismPalette.ball.core,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
