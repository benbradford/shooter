import type { LuaEngine } from 'wasmoon';
import type GameScene from '../../scenes/GameScene';
import { TransformComponent } from '../../ecs/components/core/TransformComponent';
import { WalkComponent } from '../../ecs/components/movement/WalkComponent';
import { NPCIdleComponent } from '../../ecs/entities/npc/NPCIdleComponent';
import { NPCInteractionComponent } from '../../ecs/entities/npc/NPCInteractionComponent';
import { dirFromDelta } from '../../constants/Direction';
import { type Command, DIRECTION_MAP, DIRECTION_TO_STRING } from './types';

export function registerNpcAPI(lua: LuaEngine, scene: GameScene, commandQueue: Command[], npcId?: string): void {
  if (!npcId) return;

  const playerEntity = scene.entityManager.getFirst('player');
  const playerTransform = playerEntity?.get(TransformComponent);
  const playerWalk = playerEntity?.get(WalkComponent);
  const playerDirection = playerWalk ? DIRECTION_TO_STRING[playerWalk.lastDir] : 'down';

  const npcEntity = scene.entityManager.getByType('npc').find(e => e.id === npcId);
  const npcIdleComp = npcEntity?.get(NPCIdleComponent);
  const npcInteractionComp = npcEntity?.get(NPCInteractionComponent);
  const npcTransform = npcEntity?.get(TransformComponent);
  const currentDirection = npcIdleComp ? DIRECTION_TO_STRING[npcIdleComp.getDirection()] : 'down';
  const activeInteraction = npcInteractionComp?.getActiveInteraction();

  let storedNpcDirection: string | null = null;
  let storedPlayerDirection: string | null = null;

  const npc = {
    col: activeInteraction?.col ?? 0,
    row: activeInteraction?.row ?? 0,
    x: npcTransform?.x ?? 0,
    y: npcTransform?.y ?? 0,
    direction: currentDirection,
    name: () => (npcEntity as any)?.npcName ?? 'NPC',
    look: (direction: string) => {
      const dir = DIRECTION_MAP[direction];
      if (dir === undefined) {
        throw new Error(`[LuaRuntime] Invalid direction: ${direction}`);
      }
      commandQueue.push({ type: 'npcLook', npcId, direction: dir });
    },
    playAnim: (animKey: string, repeatType: string) => {
      commandQueue.push({ type: 'npcPlayAnim', npcId, animKey, repeatType: repeatType ?? 'once' });
    }
  };
  lua.global.set('npc', npc);

  lua.global.set('faceEachOther', () => {
    commandQueue.push({ type: 'wait', ms: 16 });

    storedNpcDirection = currentDirection;
    storedPlayerDirection = playerDirection;

    const npcToPlayerDir = DIRECTION_TO_STRING[dirFromDelta(
      (playerTransform?.x ?? 0) - (npcTransform?.x ?? 0),
      (playerTransform?.y ?? 0) - (npcTransform?.y ?? 0)
    )] ?? 'down';

    const playerToNpcDir = DIRECTION_TO_STRING[dirFromDelta(
      (npcTransform?.x ?? 0) - (playerTransform?.x ?? 0),
      (npcTransform?.y ?? 0) - (playerTransform?.y ?? 0)
    )] ?? 'down';

    commandQueue.push({ type: 'look', direction: playerToNpcDir });
    commandQueue.push({ type: 'npcLook', npcId, direction: DIRECTION_MAP[npcToPlayerDir]! });
  });

  lua.global.set('restoreDirections', () => {
    if (storedPlayerDirection) {
      commandQueue.push({ type: 'look', direction: storedPlayerDirection });
    }
    if (storedNpcDirection) {
      commandQueue.push({ type: 'npcLook', npcId, direction: DIRECTION_MAP[storedNpcDirection]! });
    }
  });
}
