import { Direction } from '../../../constants/Direction';
import { Animation } from '../../../systems/animation/Animation';

const DIR_TO_KNIGHT: Record<Direction, string> = {
  [Direction.Right]: 'east',
  [Direction.DownRight]: 'east',
  [Direction.Up]: 'north',
  [Direction.UpRight]: 'north',
  [Direction.UpLeft]: 'north',
  [Direction.Down]: 'south',
  [Direction.DownLeft]: 'south',
  [Direction.Left]: 'west',
  [Direction.None]: 'south',
};

const IDLE_FRAMES: Record<string, string[]> = {
  east: ['0'], north: ['1'], south: ['2'], west: ['3'],
};

const WALK_FRAMES: Record<string, string[]> = {
  east: ['8', '9', '10', '11', '12', '13', '14', '15'],
  north: ['16', '17', '18', '19', '20', '21', '22', '23'],
  south: ['24', '25', '26', '27', '28', '29', '30', '31'],
  west: ['32', '33', '34', '35', '36', '37', '38', '39'],
};

const FRAME_DURATION_S = 0.1;

export function createKnightAnimationMap(): Map<string, Animation> {
  const animMap = new Map<string, Animation>();

  for (const dir of Object.values(Direction)) {
    if (typeof dir !== 'number') continue;
    const knightDir = DIR_TO_KNIGHT[dir as Direction];
    animMap.set(`idle_${dir}`, new Animation(IDLE_FRAMES[knightDir], 'static', FRAME_DURATION_S));
    animMap.set(`walk_${dir}`, new Animation(WALK_FRAMES[knightDir], 'repeat', FRAME_DURATION_S * 2));
  }

  animMap.set('arms_stretched', new Animation(['40', '41', '42', '43', '44'], 'once', FRAME_DURATION_S));
  animMap.set('crouch_forward', new Animation(['48', '49', '50', '51', '52'], 'once', FRAME_DURATION_S));
  animMap.set('crouch_reverse', new Animation(['52', '51', '50', '49', '48'], 'once', FRAME_DURATION_S));

  return animMap;
}
