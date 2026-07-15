import { BALL_SERVE_VELOCITY_X, BALL_SERVE_VELOCITY_Y } from '@/game/constants';
import type { BallState } from '@/game/engine/types';

export const PRIMARY_BALL_ID = 'primary-ball';

type ServeDirection = {
  horizontal: 'left' | 'right';
  vertical: 'top' | 'bottom';
};

export function createServe({
  horizontal = 'right',
  vertical = 'bottom',
}: Partial<ServeDirection> = {}): BallState {
  'worklet';

  return {
    id: PRIMARY_BALL_ID,
    position: { x: 0.5, y: 0.5 },
    velocity: {
      x:
        horizontal === 'right' ? BALL_SERVE_VELOCITY_X : -BALL_SERVE_VELOCITY_X,
      y: vertical === 'bottom' ? BALL_SERVE_VELOCITY_Y : -BALL_SERVE_VELOCITY_Y,
    },
  };
}
