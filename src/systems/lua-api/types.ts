import { Direction } from '../../constants/Direction';

export type Command =
  | { type: 'wait'; ms: number }
  | { type: 'say'; name: string; text: string; speed: number; timeout: number; backgroundColor: string; textColor: string }
  | { type: 'moveTo'; col: number; row: number; speed: number }
  | { type: 'look'; direction: string }
  | { type: 'npcLook'; npcId: string; direction: Direction }
  | { type: 'spendCoins'; amount: number }
  | { type: 'obtainCoins'; amount: number }
  | { type: 'fadeOut'; durationMs: number }
  | { type: 'fadeIn'; durationMs: number }
  | { type: 'npcPlayAnim'; npcId: string; animKey: string; repeatType: string }
  | { type: 'teleportTo'; col: number; row: number }
  | { type: 'punch'; direction: Direction }
  | { type: 'playerPlayAnim'; animKey: string; repeatType: string; startFrame?: number; endFrame?: number }
  | { type: 'raiseEvent'; eventName: string }
  | { type: 'showSpecialItem'; itemType: string }
  | { type: 'hideSpecialItem' }
  | { type: 'createEffect'; effectName: string; args: Record<string, unknown> };

export const DIRECTION_MAP: Record<string, Direction> = {
  'down': Direction.Down,
  'up': Direction.Up,
  'left': Direction.Left,
  'right': Direction.Right,
  'up_left': Direction.UpLeft,
  'up_right': Direction.UpRight,
  'down_left': Direction.DownLeft,
  'down_right': Direction.DownRight,
};

export const DIRECTION_TO_STRING: Record<Direction, string> = Object.fromEntries(
  Object.entries(DIRECTION_MAP).map(([k, v]) => [v, k])
) as Record<Direction, string>;
