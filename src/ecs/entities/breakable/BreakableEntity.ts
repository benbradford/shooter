import { Entity } from '../../Entity';
import { DEPTH_STAIRS } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { GridCellBlocker } from '../../components/movement/GridCellBlocker';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { BreakableComponent } from '../../components/breakable/BreakableComponent';
import { RarityComponent } from '../../components/core/RarityComponent';
import type { Grid } from '../../../systems/grid/Grid';
import type { Rarity } from '../../../constants/Rarity';

export type CreateBreakableProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  texture: string;
  health: number;
  entityId: string;
  rarity: Rarity;
  playerEntity: Entity;
  onSpawnCoin: (x: number, y: number, velocityX: number, velocityY: number, targetY: number) => void;
  onSpawnMedipack: (x: number, y: number) => void;
}

export function createBreakableEntity(props: CreateBreakableProps): Entity {
  const { scene, col, row, grid, texture, health, entityId, rarity, onSpawnCoin, onSpawnMedipack } = props;
  const entity = new Entity(entityId);
  entity.tags.add('breakable');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const targetSize = grid.cellSize * 0.9;
  const textureObj = scene.textures.get(texture);
  const frame = textureObj.get(0);
  const maxDimension = Math.max(frame.width, frame.height);
  const scale = targetSize / maxDimension;

  const transform = entity.add(new TransformComponent(x, y, 0, scale));
  const sprite = entity.add(new SpriteComponent(scene, texture, transform));
  sprite.sprite.setOrigin(0.5, 0.5);
  sprite.sprite.setDepth(DEPTH_STAIRS);

  const COLLISION_SIZE = grid.cellSize * 1;
  const COLLISION_BOX = {
    offsetX: 0,
    offsetY: 0,
    width: COLLISION_SIZE,
    height: COLLISION_SIZE
  };
  const ENTITY_COLLISION_BOX = {
    offsetX: -COLLISION_SIZE / 2,
    offsetY: -COLLISION_SIZE / 2,
    width: COLLISION_SIZE,
    height: COLLISION_SIZE
  };

  entity.add(new GridPositionComponent(col, row, COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new GridCellBlocker());
  entity.add(new RarityComponent(rarity));

  const breakable = entity.add(new BreakableComponent({ maxHealth: health, scene, onSpawnCoin, onSpawnMedipack }));

  entity.add(new CollisionComponent({
    box: ENTITY_COLLISION_BOX,
    collidesWith: ['player_projectile'],
    onHit: (other) => {
      if (other.tags.has('player_projectile')) {
        breakable.takeDamage(10);
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
    BreakableComponent,
    CollisionComponent
  ]);

  return entity;
}
