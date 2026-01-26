import type { Entity } from './Entity';

export interface Component {
  entity: Entity;
  update?(delta: number): void;
  onDestroy?(): void;
}
