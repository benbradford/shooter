import type { Entity } from '../../ecs/Entity';

export type CellProperty = 'wall' | 'elevated' | 'stairs';

export type CellData = {
  properties: Set<CellProperty>;
  occupants: Set<Entity>;
  backgroundTexture?: string;
};
