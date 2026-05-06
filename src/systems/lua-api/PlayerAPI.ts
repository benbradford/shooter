import type { LuaEngine } from 'wasmoon';
import type GameScene from '../../scenes/GameScene';
import { GridPositionComponent } from '../../ecs/components/movement/GridPositionComponent';
import { TransformComponent } from '../../ecs/components/core/TransformComponent';
import { WalkComponent } from '../../ecs/components/movement/WalkComponent';
import { Direction, dirFromDelta } from '../../constants/Direction';
import { type Command, DIRECTION_MAP, DIRECTION_TO_STRING } from './types';

export function registerPlayerAPI(lua: LuaEngine, scene: GameScene, commandQueue: Command[]): void {
  const playerEntity = scene.entityManager.getFirst('player');
  const playerGridPos = playerEntity?.get(GridPositionComponent);
  const playerTransform = playerEntity?.get(TransformComponent);
  const playerWalk = playerEntity?.get(WalkComponent);
  const playerDirection = playerWalk ? DIRECTION_TO_STRING[playerWalk.lastDir] : 'down';

  const player = {
    col: playerGridPos?.currentCell.col ?? 0,
    row: playerGridPos?.currentCell.row ?? 0,
    x: playerTransform?.x ?? 0,
    y: playerTransform?.y ?? 0,
    direction: playerDirection,
    name: () => 'Player',
    moveTo: (col: number, row: number, speed: number) => {
      commandQueue.push({ type: 'moveTo', col, row, speed });
    },
    look: (direction: string) => {
      commandQueue.push({ type: 'look', direction });
    },
    teleportTo: (col: number, row: number) => {
      commandQueue.push({ type: 'teleportTo', col, row });
    },
    punch: (direction: string) => {
      const dir = DIRECTION_MAP[direction];
      if (dir === undefined) {
        throw new Error(`[LuaRuntime] Invalid direction for punch: ${direction}`);
      }
      commandQueue.push({ type: 'punch', direction: dir });
    },
    playAnim: (animName: string, repeatType: string, direction?: string, startFrame?: number, endFrame?: number) => {
      const dir = direction ? DIRECTION_MAP[direction] : Direction.Down;
      if (dir === undefined) {
        throw new Error(`[LuaRuntime] Invalid direction for playAnim: ${direction}`);
      }
      const animKey = `${animName}_${dir}`;
      commandQueue.push({ type: 'playerPlayAnim', animKey, repeatType: repeatType ?? 'once', startFrame, endFrame });
    }
  };
  lua.global.set('player', player);

  lua.global.set('calculateDirection', (fromX: number, fromY: number, toX: number, toY: number): string => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    return DIRECTION_TO_STRING[dirFromDelta(dx, dy)] ?? 'down';
  });

  lua.global.set('celebrate', () => {
    const dirs = ['down', 'down_left', 'left', 'up_left', 'up', 'up_right', 'right', 'down_right', 'down'];
    const SPIN_DELAY_MS = 30;
    commandQueue.push({ type: 'playerPlayAnim', animKey: `powerup_${DIRECTION_MAP['down']}`, repeatType: 'once', startFrame: 0, endFrame: 5 });
    for (let i = 1; i < dirs.length; i++) {
      commandQueue.push({ type: 'wait', ms: SPIN_DELAY_MS });
      commandQueue.push({ type: 'playerPlayAnim', animKey: `powerup_${DIRECTION_MAP[dirs[i]]}`, repeatType: 'once', startFrame: 5, endFrame: 5 });
    }
  });
}
