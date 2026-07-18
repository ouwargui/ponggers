import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
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
import { useGameTheme } from '@/game/themes/game-theme-provider';
import type { RallyCounterRendererProps } from '@/game/themes/types';

const COUNTER_SIZE = 44;
const CENTER_LINE_CLEARANCE = 82;

export function NeonRallyCounter({ hitCount }: RallyCounterRendererProps) {
  const { effects, palette } = useGameTheme();
  const [displayedHitCount, setDisplayedHitCount] = useState(0);
  const renderedHitCount = useSharedValue(0);
  const opacity = useSharedValue(0);
  const popScale = useSharedValue(1);
  const updateDisplayedHitCount = useCallback((value: number) => {
    setDisplayedHitCount(value);
  }, []);

  useAnimatedReaction(
    () => hitCount.value,
    (currentHitCount, previousHitCount) => {
      if (currentHitCount < RALLY_COUNTER_VISIBLE_FROM) {
        opacity.value = withTiming(0, { duration: 140 });
        return;
      }

      if (currentHitCount === previousHitCount) {
        return;
      }

      scheduleOnRN(updateDisplayedHitCount, currentHitCount);
      renderedHitCount.value = currentHitCount;
      opacity.value = withTiming(1, { duration: 100 });
      popScale.value = 0.78;
      popScale.value = withSequence(
        withSpring(isRallyMilestone(currentHitCount) ? 1.5 : 1.24, {
          damping: 10,
          stiffness: 320,
        }),
        withSpring(1, { damping: 12, stiffness: 240 }),
      );
    },
  );

  const animatedStyle = useAnimatedStyle(() => {
    const baseScale = getRallyCounterBaseScale(renderedHitCount.value);

    return {
      opacity: opacity.value,
      transform: [
        { translateY: -CENTER_LINE_CLEARANCE },
        { scale: baseScale * popScale.value },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, animatedStyle]}
    >
      <Text
        style={[
          styles.label,
          { color: palette.ball.core },
          effects.textGlow(palette.ball.glow, 7),
        ]}
      >
        {displayedHitCount}×
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: 12,
    width: COUNTER_SIZE,
    height: COUNTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
