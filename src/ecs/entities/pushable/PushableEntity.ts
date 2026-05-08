import { Entity } from '../../Entity';
import { Depth } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { GridCellBlocker } from '../../components/movement/GridCellBlocker';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { PushableComponent } from '../../components/pushable/PushableComponent';
import type { Grid } from '../../../systems/grid/Grid';
import { SoundManager } from '../../../systems/SoundManager';

export type CreatePushableProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  texture: string;
  pushEnabled: boolean;
  doesPersist: boolean;
  singlePushOnly: boolean;
  entityId: string;
  originalCol: number;
  originalRow: number;
};

export function createPushableEntity(props: CreatePushableProps): Entity {
  const { scene, col, row, grid, texture, entityId, originalCol, originalRow } = props;
  const entity = new Entity(entityId);
  entity.tags.add('pushable');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const textureObj = scene.textures.get(texture);
  const frame = textureObj.get(0);
  const scale = grid.cellSize / Math.max(frame.width, frame.height);

  const transform = entity.add(new TransformComponent(x, y, 0, scale));
  const sprite = entity.add(new SpriteComponent(scene, texture, transform));
  sprite.sprite.setOrigin(0.5, 0.5);
  sprite.sprite.setDepth(Depth.pushable);
  sprite.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

  const shadow = entity.add(new ShadowComponent(scene, { scale: 1, offsetX: 0, offsetY: 0 }));
  shadow.init();

  const COLLISION_SIZE = grid.cellSize;

  entity.add(new GridPositionComponent(col, row, {
    offsetX: 0, offsetY: 0, width: COLLISION_SIZE, height: COLLISION_SIZE
  }));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new GridCellBlocker());

  const spawnCell = grid.getCell(col, row);
  const layer = spawnCell ? grid.getLayer(spawnCell) : 0;

  const pushable = entity.add(new PushableComponent({
    grid,
    pushEnabled: props.pushEnabled,
    doesPersist: props.doesPersist,
    singlePushOnly: props.singlePushOnly,
    spawnCol: originalCol,
    spawnRow: originalRow,
    layer,
    soundManager: SoundManager.getInstance(),
  }));
  pushable.initPosition(col, row);

  entity.add(new CollisionComponent({
    box: { offsetX: -COLLISION_SIZE / 2, offsetY: -COLLISION_SIZE / 2, width: COLLISION_SIZE, height: COLLISION_SIZE },
    collidesWith: ['player_projectile', 'enemy_projectile'],
    onHit: (other) => {
      if (other.tags.has('player_projectile') || other.tags.has('enemy_projectile')) {
        scene.time.delayedCall(0, () => other.destroy());
      }
    }
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    ShadowComponent,
    GridPositionComponent,
    GridCollisionComponent,
    GridCellBlocker,
    PushableComponent,
    CollisionComponent,
  ]);

  return entity;
}
