import type { LuaEngine } from 'wasmoon';
import { type Command, DIRECTION_MAP } from './types';

export function registerEntityAPI(lua: LuaEngine, commandQueue: Command[]): void {
  lua.global.set('entity', (entityId: string) => {
    return {
      look: (direction: string) => {
        const dir = DIRECTION_MAP[direction];
        if (dir === undefined) {
          throw new Error(`[LuaRuntime] entity('${entityId}').look: invalid direction '${direction}'`);
        }
        commandQueue.push({ type: 'entityLook', entityId, direction: dir });
      },
      moveTo: (col: number, row: number, speed: number) => {
        commandQueue.push({ type: 'entityMoveTo', entityId, col, row, speed });
      },
      playAnim: (animKey: string, repeatType: string) => {
        commandQueue.push({ type: 'entityPlayAnim', entityId, animKey, repeatType: repeatType ?? 'once' });
      },
    };
  });

  lua.global.set('spawn', (spawnerName: string, entityId: string, args: Record<string, unknown>) => {
    commandQueue.push({ type: 'spawn', spawnerName, entityId, args: args ?? {} });
  });

  lua.global.set('kill', (entityId: string) => {
    commandQueue.push({ type: 'kill', entityId });
  });
}
