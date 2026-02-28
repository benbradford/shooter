import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { RotatingProjectileComponent } from '../../components/visual/RotatingProjectileComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import type { Grid } from '../../../systems/grid/Grid';
import { DEPTH_PROJECTILE_HIGH } from '../../../constants/DepthConstants';

const BONE_SPEED_PX_PER_SEC = 250;
const BONE_MAX_DISTANCE_PX = 300;
const BONE_DAMAGE = 10;
const BONE_SCALE = 0.13;

export type CreateBoneProjectileProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  grid: Grid;
  layer: number;
}

export function createBoneProjectileEntity(props: CreateBoneProjectileProps): Entity {
  const { scene, x, y, dirX, dirY, grid, layer } = props;

  const entity = new Entity('bone_projectile');
  entity.tags.add('enemy_projectile');

  const transform = entity.add(new TransformComponent(x, y, 0, BONE_SCALE));

  const sprite = entity.add(new SpriteComponent(scene, 'bone_small', transform));
  sprite.sprite.setDepth(DEPTH_PROJECTILE_HIGH);

  const shadow = entity.add(new ShadowComponent(scene, { scale: 0.5, offsetX: 0, offsetY: 30 }));
  shadow.init();

  entity.add(new DamageComponent(BONE_DAMAGE));
  entity.add(new RotatingProjectileComponent(dirX));

  entity.add(new ProjectileComponent({
    dirX,
    dirY,
    speed: BONE_SPEED_PX_PER_SEC,
    maxDistance: BONE_MAX_DISTANCE_PX,
    grid,
    startLayer: layer,
    fromTransition: false,
    scene,
    onWallHit: () => {
      scene.time.delayedCall(0, () => entity.destroy());
    },
    onMaxDistance: () => {
      scene.time.delayedCall(0, () => entity.destroy());
    }
  }));

  entity.add(new CollisionComponent({
    box: { offsetX: -8, offsetY: -8, width: 16, height: 16 },
    collidesWith: ['player'],
    onHit: (other) => {
      if (other.tags.has('player')) {
        scene.time.delayedCall(0, () => entity.destroy());
      }
    }
  }));

  entity.setUpdateOrder([
    RotatingProjectileComponent,
    TransformComponent,
    SpriteComponent,
    ShadowComponent,
    ProjectileComponent,
    CollisionComponent
  ]);

  return entity;
}
