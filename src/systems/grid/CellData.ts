import type { Entity } from '../../ecs/Entity';

export type CellProperty = 'platform' | 'wall' | 'stairs' | 'path' | 'water' | 'blocked' | 'bridge';

export type CellData = {
  layer: number;
  properties: Set<CellProperty>;
  occupants: Set<Entity>;
  backgroundTexture?: string;
};
