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
import type { RallyCounterRendererProps } from '@/game/themes/types';
import { voltTextGlow } from '@/game/themes/volt/volt-text-glow';
import { voltPalette } from '@/game/themes/volt/volt-tokens';

const CENTER_LINE_CLEARANCE = 84;

export function VoltRallyCounter({ hitCount }: RallyCounterRendererProps) {
  const [displayedHitCount, setDisplayedHitCount] = useState(0);
  const renderedHitCount = useSharedValue(0);
  const opacity = useSharedValue(0);
  const popScale = useSharedValue(1);
  const voltage = useSharedValue(0.35);
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
      voltage.value = withSequence(
        withTiming(1, { duration: 45 }),
        withTiming(0.35, { duration: 180 }),
      );
      popScale.value = 0.82;
      popScale.value = withSequence(
        withSpring(isRallyMilestone(currentHitCount) ? 1.55 : 1.22, {
          damping: 9,
          stiffness: 360,
        }),
        withSpring(1, { damping: 13, stiffness: 270 }),
      );
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: -CENTER_LINE_CLEARANCE },
      {
        scale:
          getRallyCounterBaseScale(renderedHitCount.value) * popScale.value,
      },
    ],
  }));
  const railStyle = useAnimatedStyle(() => ({ opacity: voltage.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, animatedStyle]}
    >
      <Animated.View style={[styles.rail, railStyle]} />
      <View style={styles.copy}>
        <Text style={styles.caption}>CHARGE</Text>
        <Text style={[styles.value, voltTextGlow(voltPalette.ball.glow, 7)]}>
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
    width: 64,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rail: {
    width: 2,
    height: 34,
    backgroundColor: voltPalette.centerLine.glow,
    shadowColor: voltPalette.centerLine.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  copy: {
    marginLeft: 7,
    alignItems: 'flex-start',
  },
  caption: {
    color: voltPalette.centerLine.glow,
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 1.3,
    opacity: 0.6,
  },
  value: {
    color: voltPalette.ball.core,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
