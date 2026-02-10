import { Direction } from '../../../constants/Direction';

const SPRITE_SCALE = 2;
const BULLET_EMIT_OFFSET_SCALE = 0.5;

export type EmitterOffset = { x: number; y: number };

export const BULLET_DUDE_EMITTER_OFFSETS: Record<Direction, EmitterOffset> = {
  [Direction.Down]: { x: -16 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE, y: 40 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE },
  [Direction.Up]: { x: 10 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE, y: -30 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE },
  [Direction.Left]: { x: -51 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE, y: 0 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE },
  [Direction.Right]: { x: 43 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE, y: 0 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE },
  [Direction.UpLeft]: { x: -25 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE, y: -25 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE },
  [Direction.UpRight]: { x: 22 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE, y: -20 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE },
  [Direction.DownLeft]: { x: -35 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE, y: 22 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE },
  [Direction.DownRight]: { x: 29 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE, y: 21 * SPRITE_SCALE * BULLET_EMIT_OFFSET_SCALE },
  [Direction.None]: { x: 0, y: 0 },
};
