import {
  Easing,
  type SharedValue,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { BallImpactEvent, PaddleState } from '@/game/engine/types';
import {
  getPaddleImpactPose,
  getPaddleMotionPose,
  getPaddleSettlePose,
  PASSIVE_PADDLE_SETTLE_VELOCITY,
} from '@/game/presentation/paddle-presentation';

const MOTION_SETTLE_SPRING = {
  damping: 8,
  mass: 0.55,
  stiffness: 190,
};
const MOTION_IDLE_DELAY_MS = 72;
const IMPACT_RECOVERY_SPRING = {
  damping: 12,
  mass: 0.42,
  stiffness: 290,
};

export type PaddlePresentationState = {
  motionScaleX: SharedValue<number>;
  motionScaleY: SharedValue<number>;
  impactScaleX: SharedValue<number>;
  impactScaleY: SharedValue<number>;
  shakeX: SharedValue<number>;
  shakeY: SharedValue<number>;
  glowOffsetX: SharedValue<number>;
  glowPulse: SharedValue<number>;
};

type UsePaddlePresentationOptions = {
  interactionActive: SharedValue<boolean>;
  interactionSequence: SharedValue<number>;
  locallyControlled: boolean;
};

export function usePaddlePresentation(
  paddle: SharedValue<PaddleState>,
  lastImpact: SharedValue<BallImpactEvent | null>,
  {
    interactionActive,
    interactionSequence,
    locallyControlled,
  }: UsePaddlePresentationOptions,
): PaddlePresentationState {
  const motionScaleX = useSharedValue(1);
  const motionScaleY = useSharedValue(1);
  const impactScaleX = useSharedValue(1);
  const impactScaleY = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const glowOffsetX = useSharedValue(0);
  const glowPulse = useSharedValue(1);

  useAnimatedReaction(
    () => ({
      interactionActive: interactionActive.value,
      interactionSequence: interactionSequence.value,
      velocityX: paddle.value.velocityX,
    }),
    (current, previous) => {
      const currentSpeed = Math.abs(current.velocityX);
      const previousSpeed = Math.abs(previous?.velocityX ?? 0);
      let settlePose = getPaddleSettlePose(current.velocityX);
      let settleDelay: number;

      if (locallyControlled) {
        const receivedMovementUpdate =
          previous !== null &&
          current.interactionSequence !== previous.interactionSequence;
        const releasedInteraction =
          previous?.interactionActive === true && !current.interactionActive;

        if (!receivedMovementUpdate && !releasedInteraction) {
          return;
        }

        if (receivedMovementUpdate) {
          const pose = getPaddleMotionPose(current.velocityX);
          motionScaleX.value = pose.scaleX;
          motionScaleY.value = pose.scaleY;
          glowOffsetX.value = pose.glowOffsetX;
          settleDelay = MOTION_IDLE_DELAY_MS;
        } else {
          settleDelay = 0;
        }
      } else if (currentSpeed >= PASSIVE_PADDLE_SETTLE_VELOCITY) {
        const pose = getPaddleMotionPose(current.velocityX);
        motionScaleX.value = pose.scaleX;
        motionScaleY.value = pose.scaleY;
        glowOffsetX.value = pose.glowOffsetX;
        return;
      } else if (
        previousSpeed >= PASSIVE_PADDLE_SETTLE_VELOCITY &&
        currentSpeed < PASSIVE_PADDLE_SETTLE_VELOCITY
      ) {
        settlePose = getPaddleSettlePose(previous?.velocityX ?? 0);
        settleDelay = 0;
      } else {
        return;
      }

      motionScaleX.value = withDelay(
        settleDelay,
        withSequence(
          withTiming(settlePose.scaleX, {
            duration: 55,
            easing: Easing.out(Easing.quad),
          }),
          withSpring(1, MOTION_SETTLE_SPRING),
        ),
      );
      motionScaleY.value = withDelay(
        settleDelay,
        withSequence(
          withTiming(settlePose.scaleY, {
            duration: 55,
            easing: Easing.out(Easing.quad),
          }),
          withSpring(1, MOTION_SETTLE_SPRING),
        ),
      );
      glowOffsetX.value = withDelay(
        settleDelay,
        withSpring(0, {
          damping: 7,
          mass: 0.55,
          stiffness: 170,
        }),
      );
    },
  );

  useAnimatedReaction(
    () => lastImpact.value,
    (impact, previousImpact) => {
      if (
        impact?.surface !== 'paddle' ||
        impact.playerId !== paddle.value.id ||
        (previousImpact &&
          impact.tick === previousImpact.tick &&
          impact.ballId === previousImpact.ballId &&
          impact.playerId === previousImpact.playerId)
      ) {
        return;
      }

      const pose = getPaddleImpactPose(impact);
      const impactTiming = {
        duration: 28,
        easing: Easing.out(Easing.quad),
      };

      impactScaleX.value = withSequence(
        withTiming(pose.scaleX, impactTiming),
        withSpring(1, IMPACT_RECOVERY_SPRING),
      );
      impactScaleY.value = withSequence(
        withTiming(pose.scaleY, impactTiming),
        withSpring(1, IMPACT_RECOVERY_SPRING),
      );
      shakeX.value = withSequence(
        withTiming(pose.shakeX, impactTiming),
        withTiming(-pose.shakeX * 0.45, { duration: 34 }),
        withSpring(0, IMPACT_RECOVERY_SPRING),
      );
      shakeY.value = withSequence(
        withTiming(pose.shakeY, impactTiming),
        withTiming(-pose.shakeY * 0.3, { duration: 38 }),
        withSpring(0, IMPACT_RECOVERY_SPRING),
      );
      glowPulse.value = withSequence(
        withTiming(pose.glowPulse, { duration: 22 }),
        withSpring(1, { damping: 11, mass: 0.5, stiffness: 210 }),
      );
    },
  );

  return {
    motionScaleX,
    motionScaleY,
    impactScaleX,
    impactScaleY,
    shakeX,
    shakeY,
    glowOffsetX,
    glowPulse,
  };
}
