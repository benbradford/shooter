import type { LuaEngine } from 'wasmoon';
import type { Command } from './types';

export function registerEffectsAPI(lua: LuaEngine, commandQueue: Command[]): void {
  lua.global.set('createEffect', (effectName: string, args: Record<string, unknown>) => {
    commandQueue.push({ type: 'createEffect', effectName, args });
  });
}
