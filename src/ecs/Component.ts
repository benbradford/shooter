import type { Entity } from './Entity';

export type Component = {
  entity: Entity;
  update?(delta: number): void;
  onDestroy?(): void;
}
