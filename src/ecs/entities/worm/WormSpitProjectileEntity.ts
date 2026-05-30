import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import type { GridReader } from '../../../systems/grid/Grid';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';
import { Depth } from '../../../constants/DepthConstants';

const SPIT_SPEED_PX_PER_SEC = 200;
const SPIT_DAMAGE = 5;
const SPIT_SCALE = 0.6;
const SPIT_MAX_DISTANCE_CELLS = 5;

export type CreateWormSpitProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  grid: GridReader;
  layer: number;
  blockedAreaManager?: BlockedAreaManager;
}

export function createWormSpitEntity(props: CreateWormSpitProps): Entity {
  const { scene, x, y, dirX, dirY, grid, layer, blockedAreaManager } = props;
  const maxDistancePx = SPIT_MAX_DISTANCE_CELLS * grid.cellSize;

  const entity = new Entity('worm_spit');
  entity.tags.add('enemy_projectile');

  const transform = entity.add(new TransformComponent(x, y, 0, SPIT_SCALE));

  // Use a worm idle frame as the spit blob (tinted green)
  const sprite = entity.add(new SpriteComponent(scene, 'worm', transform));
  sprite.sprite.setFrame(2); // south idle frame as blob
  sprite.sprite.setDepth(Depth.projectileHigh);
  sprite.sprite.setTint(0x66dd22);

  const shadow = entity.add(new ShadowComponent(scene, { scale: 0.3, offsetX: 0, offsetY: 12 }));
  shadow.init();

  entity.add(new DamageComponent(SPIT_DAMAGE));

  entity.add(new ProjectileComponent({
    dirX,
    dirY,
    speed: SPIT_SPEED_PX_PER_SEC,
    maxDistance: maxDistancePx,
    grid,
    startLayer: layer,
    fromTransition: false,
    scene,
    blockedAreaManager,
    onWallHit: () => { scene.time.delayedCall(0, () => entity.destroy()); },
    onMaxDistance: () => { scene.time.delayedCall(0, () => entity.destroy()); }
  }));

  entity.add(new CollisionComponent({
    box: { offsetX: -6, offsetY: -6, width: 12, height: 12 },
    collidesWith: ['player'],
    onHit: (other) => {
      if (other.tags.has('player')) {
        scene.time.delayedCall(0, () => entity.destroy());
      }
    }
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    ShadowComponent,
    ProjectileComponent,
    CollisionComponent
  ]);

  return entity;
}
