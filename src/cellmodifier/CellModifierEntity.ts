import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { CellModifierComponent, type CellModification } from '../ecs/components/core/CellModifierComponent';
import type { Grid } from '../systems/grid/Grid';

export type CreateCellModifierEntityProps = {
  grid: Grid;
  scene: Phaser.Scene;
  entityId: string;
  cellsToModify: CellModification[];
}

export function createCellModifierEntity(props: CreateCellModifierEntityProps): Entity {
  const { grid, scene, entityId, cellsToModify } = props;
  
  const entity = new Entity(entityId);
  entity.tags.add('cell_modifier');

  entity.add(new TransformComponent(0, 0, 0, 1));
  entity.add(new CellModifierComponent({
    cellsToModify,
    grid,
    scene
  }));

  entity.setUpdateOrder([
    TransformComponent,
    CellModifierComponent
  ]);

  return entity;
}
