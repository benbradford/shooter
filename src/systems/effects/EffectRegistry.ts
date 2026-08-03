import type GameScene from '../../scenes/GameScene';

export type EffectArgs = Record<string, unknown>;
export type EffectHandler = (scene: GameScene, args: EffectArgs) => Promise<void>;

const registry = new Map<string, EffectHandler>();

export function registerEffect(name: string, handler: EffectHandler): void {
  registry.set(name, handler);
}

export function getEffectHandler(name: string): EffectHandler | undefined {
  return registry.get(name);
}
