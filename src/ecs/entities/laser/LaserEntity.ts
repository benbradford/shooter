import type Phaser from 'phaser';
import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { GridCellBlocker } from '../../components/movement/GridCellBlocker';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { LaserBeamComponent } from '../../components/laser/LaserBeamComponent';
import { Depth } from '../../../constants/DepthConstants';
import type { Grid } from '../../../systems/grid/Grid';
import type { EntityManager } from '../../EntityManager';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';

export type CreateLaserProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  entityId: string;
  angle: number;
  flagName: string;
  blockedAreaManager?: BlockedAreaManager;
  entityManager: EntityManager;
};

export function createLaserEntity(props: CreateLaserProps): Entity {
  const { scene, col, row, grid, entityId } = props;
  const entity = new Entity(entityId);
  entity.tags.add('laser');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const textureObj = scene.textures.get('laser_base');
  const frame = textureObj.get(0);
  const scale = grid.cellSize / Math.max(frame.width, frame.height);

  const angle = Number.isFinite(props.angle) ? props.angle : 0;

  const transform = entity.add(new TransformComponent(x, y, 0, scale));
  const sprite = entity.add(new SpriteComponent(scene, 'laser_base', transform));
  sprite.sprite.setDepth(Depth.breakable);
  sprite.sprite.setRotation((angle - 90) * Math.PI / 180);

  const collisionSize = grid.cellSize;
  entity.add(new GridPositionComponent(col, row, {
    offsetX: 0, offsetY: 0, width: collisionSize, height: collisionSize
  }));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new GridCellBlocker());

  entity.add(new CollisionComponent({
    box: { offsetX: -collisionSize / 2, offsetY: -collisionSize / 2, width: collisionSize, height: collisionSize },
    collidesWith: ['player_projectile', 'enemy_projectile'],
    onHit: (other) => {
      if (other.tags.has('player_projectile') || other.tags.has('enemy_projectile')) {
        scene.time.delayedCall(0, () => other.destroy());
      }
    }
  }));

  const spawnCell = grid.getCell(col, row);
  const layer = spawnCell ? grid.getLayer(spawnCell) : 0;

  entity.add(new LaserBeamComponent({
    scene,
    grid,
    angle,
    flagName: props.flagName,
    layer,
    blockedAreaManager: props.blockedAreaManager,
    entityManager: props.entityManager,
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    GridPositionComponent,
    GridCollisionComponent,
    GridCellBlocker,
    CollisionComponent,
    LaserBeamComponent,
  ]);

  return entity;
}
