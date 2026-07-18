export const HUD_SIDE_AXIS_OFFSET_Y = -61;

export function getCenteredHudTranslateY(elementHeight: number): number {
  return HUD_SIDE_AXIS_OFFSET_Y - elementHeight / 2;
}
