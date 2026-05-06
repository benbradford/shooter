import type { LuaEngine } from 'wasmoon';
import { WorldStateManager } from '../WorldStateManager';
import type { Command } from './types';

export function registerWorldAPI(lua: LuaEngine, commandQueue: Command[]): void {
  lua.global.set('setFlag', (name: string, value: string | number) => {
    WorldStateManager.getInstance().setFlag(name, value);
  });

  lua.global.set('getFlag', (name: string): string => {
    return WorldStateManager.getInstance().getFlag(name) ?? '';
  });

  lua.global.set('saveState', () => {
    void WorldStateManager.getInstance().saveToFile();
  });

  lua.global.set('isFlagCondition', (name: string, condition: string, value: string | number): boolean => {
    const validConditions = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte'];
    if (!validConditions.includes(condition)) {
      console.error(`[LuaRuntime] Invalid condition: ${condition}`);
      return false;
    }
    return WorldStateManager.getInstance().isFlagCondition(name, condition as 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte', value);
  });

  lua.global.set('raiseEvent', (eventName: string) => {
    commandQueue.push({ type: 'raiseEvent', eventName });
  });
}
