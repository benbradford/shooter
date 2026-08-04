import type GameScene from '../../scenes/GameScene';

export type SpawnArgs = Record<string, unknown>;
export type SpawnHandler = (scene: GameScene, entityId: string, args: SpawnArgs) => Promise<void>;

const registry = new Map<string, SpawnHandler>();

export function registerSpawner(name: string, handler: SpawnHandler): void {
  registry.set(name, handler);
}

export function getSpawnHandler(name: string): SpawnHandler | undefined {
  return registry.get(name);
}
