import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { RockArcComponent } from '../../components/pet/RockArcComponent';
import { Depth } from '../../../constants/DepthConstants';
import type { GridReader } from '../../../systems/grid/Grid';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';

const ROCK_PROJECTILE_COLLISION_SIZE_PX = 24;
const ROCK_PROJECTILE_SCALE = 0.6;

export type CreateRockProjectileProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
  maxDistance: number;
  damage: number;
  arcHeight: number;
  grid: GridReader;
  blockedAreaManager?: BlockedAreaManager;
  startLayer: number;
  startedOnStairs: boolean;
  playerFeetY: number;
  onLand: (x: number, y: number, landOffsetY: number) => void;
  onHit: (x: number, y: number) => void;
};

export function createRockProjectileEntity(props: CreateRockProjectileProps): Entity {
  const { scene, x, y, dirX, dirY, speed, maxDistance, damage, arcHeight, grid, onLand, onHit } = props;
  const entity = new Entity(`rock_projectile_${Date.now()}`);

  entity.tags.add('player_projectile');
  entity.tags.add('ignores_layers');

  const transform = entity.add(new TransformComponent(x, y, 0, ROCK_PROJECTILE_SCALE));

  const sprite = entity.add(new SpriteComponent(scene, 'rock_spritesheet', transform));
  sprite.sprite.setDepth(Depth.enemy);
  sprite.sprite.setFrame(0);

  const shadow = new ShadowComponent(scene, { scale: 0.3, offsetX: 0, offsetY: 35 });
  entity.add(shadow);
  shadow.init();

  entity.add(new DamageComponent(damage));

  const halfSize = ROCK_PROJECTILE_COLLISION_SIZE_PX / 2;
  entity.add(new CollisionComponent({
    box: { offsetX: -halfSize, offsetY: -halfSize, width: ROCK_PROJECTILE_COLLISION_SIZE_PX, height: ROCK_PROJECTILE_COLLISION_SIZE_PX },
    collidesWith: ['enemy', 'breakable'],
    onHit: (_other) => {
      const t = entity.get(TransformComponent);
      const hitX = t?.x ?? x;
      const hitY = t?.y ?? y;
      onHit(hitX, hitY);
      scene.time.delayedCall(0, () => {
        if (!entity.isDestroyed) entity.destroy();
      });
    },
  }));

  entity.add(new RockArcComponent({
    dirX, dirY, speed, maxDistance, arcHeight, grid, blockedAreaManager: props.blockedAreaManager, startLayer: props.startLayer, startedOnStairs: props.startedOnStairs, playerFeetY: props.playerFeetY, onLand,
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    ShadowComponent,
    RockArcComponent,
    CollisionComponent,
  ]);

  return entity;
}
