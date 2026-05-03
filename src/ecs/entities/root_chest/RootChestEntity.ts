import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { GridCellBlocker } from '../../components/movement/GridCellBlocker';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { RootChestComponent } from './RootChestComponent';
import { SporeParticleComponent } from './SporeParticleComponent';
import { Depth } from '../../../constants/DepthConstants';
import type { Grid } from '../../../systems/grid/Grid';
import type { EntityManager } from '../../EntityManager';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';

export type CreateRootChestProps = {
  readonly scene: Phaser.Scene;
  readonly col: number;
  readonly row: number;
  readonly grid: Grid;
  readonly entityId: string;
  readonly specialItem: string;
  readonly entityManager: EntityManager;
  readonly eventManager: EventManagerSystem;
  readonly playerEntity: Entity;
};

export function createRootChestEntity(props: CreateRootChestProps): Entity {
  const { scene, col, row, grid, entityId, specialItem, entityManager, eventManager, playerEntity } = props;
  const entity = new Entity(entityId);
  entity.tags.add('root_chest');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const transform = entity.add(new TransformComponent(x, y));
  const sprite = entity.add(new SpriteComponent(scene, 'roots_chest', transform));
  sprite.sprite.setOrigin(0.5, 0.5);
  sprite.sprite.setDepth(Depth.breakable);
  sprite.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

  // Ensure frames exist and set initial frame before scale calculation
  const texture = scene.textures.get('roots_chest');
  if (!texture.has('rc_chest_closed')) {
    texture.add('rc_chest_closed', 0, 182, 175, 384, 264);
  }
  sprite.sprite.setFrame('rc_chest_closed');

  const CHEST_CLOSED_MAX_DIM = 384;
  const CHEST_SCALE_FACTOR = 1.2;
  const scale = (grid.cellSize / CHEST_CLOSED_MAX_DIM) * CHEST_SCALE_FACTOR;
  transform.scale = scale;
  sprite.sprite.setScale(scale);

  const COLLISION_SIZE = grid.cellSize;
  const GRID_BOX = { offsetX: 0, offsetY: 0, width: COLLISION_SIZE, height: COLLISION_SIZE };
  const ENTITY_BOX = { offsetX: -COLLISION_SIZE / 2, offsetY: -COLLISION_SIZE / 2, width: COLLISION_SIZE, height: COLLISION_SIZE };

  entity.add(new GridPositionComponent(col, row, GRID_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new GridCellBlocker());

  const chestComp = entity.add(new RootChestComponent({
    scene, grid, specialItem, entityManager, eventManager, playerEntity,
  }));
  chestComp.init();

  entity.add(new SporeParticleComponent(scene));

  entity.add(new CollisionComponent({
    box: ENTITY_BOX,
    collidesWith: ['player_projectile'],
    onHit: (other) => {
      if (other.tags.has('player_projectile')) {
        const dmg = other.get(DamageComponent);
        chestComp.takeDamage(dmg?.damage ?? 10);
        scene.time.delayedCall(0, () => other.destroy());
      }
    }
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    GridPositionComponent,
    GridCollisionComponent,
    GridCellBlocker,
    RootChestComponent,
    SporeParticleComponent,
    CollisionComponent,
  ]);

  return entity;
}
