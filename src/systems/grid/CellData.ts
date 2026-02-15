import type { Entity } from '../../ecs/Entity';

export type CellProperty = 'platform' | 'wall' | 'stairs' | 'path';

export type CellData = {
  layer: number;
  properties: Set<CellProperty>;
  occupants: Set<Entity>;
  backgroundTexture?: string;
};
