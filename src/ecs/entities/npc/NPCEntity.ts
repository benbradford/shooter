import { Entity } from '../../Entity';
import { Depth } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { NPCIdleComponent } from './NPCIdleComponent';
import { NPCInteractionComponent } from './NPCInteractionComponent';
import type { Direction } from '../../../constants/Direction';
import type { Grid } from '../../../systems/grid/Grid';

export type FlagCondition = {
  readonly name: string;
  readonly condition: string;
  readonly value: string | number;
}

export type NPCInteraction = {
  readonly name: string;
  readonly whenFlagSet?: FlagCondition;
  readonly position?: { readonly col: number; readonly row: number };
}

export type CreateNPCProps = {
  readonly scene: Phaser.Scene;
  readonly grid: Grid;
  readonly entityId: string;
  readonly assets: string;
  readonly col: number;
  readonly row: number;
  readonly direction: Direction;
  readonly interactions: NPCInteraction[];
  readonly scale?: number;
}

export function createNPCEntity(props: CreateNPCProps): Entity {
  const { scene, grid, entityId, assets, col, row, direction, interactions, scale = 1 } = props;
  const entity = new Entity(entityId);
  entity.tags.add('npc');

  const x = col * grid.cellSize + grid.cellSize / 2;
  const y = row * grid.cellSize + grid.cellSize / 2;

  const transform = entity.add(new TransformComponent(x, y, 0, scale));
  const sprite = entity.add(new SpriteComponent(scene, assets, transform));
  sprite.sprite.setDepth(Depth.enemy);
  sprite.sprite.setOrigin(0.5, 0.5);

  entity.add(new NPCIdleComponent(direction, assets));
  entity.add(new NPCInteractionComponent(interactions, col, row));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    NPCIdleComponent,
    NPCInteractionComponent,
  ]);

  return entity;
}
