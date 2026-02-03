import type { Entity } from '../../ecs/Entity';

export type CellProperty = 'platform' | 'wall' | 'stairs';

export type CellData = {
  properties: Set<CellProperty>;
  occupants: Set<Entity>;
  backgroundTexture?: string;
};
