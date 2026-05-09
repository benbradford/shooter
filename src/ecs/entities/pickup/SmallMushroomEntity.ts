import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { SmallMushroomComponent } from '../../components/pickup/SmallMushroomComponent';

export type CreateSmallMushroomProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  playerEntity: Entity;
}

const MUSHROOM_SCALE = 0.4;
const SPAWN_OFFSET_Y_PX = 30;
const DROP_DURATION_MS = 400;
const PARTICLE_TINT = 0xa3b02c;

export function createSmallMushroomEntity(props: CreateSmallMushroomProps): Entity {
  const { scene, x, y, playerEntity } = props;

  const entity = new Entity('small_mushroom');
  entity.tags.add('pickup');

  const transform = entity.add(new TransformComponent(x, y - SPAWN_OFFSET_Y_PX, 0, MUSHROOM_SCALE));
  const sprite = entity.add(new SpriteComponent(scene, 'small_mushrooms', transform));
  entity.add(new SmallMushroomComponent(playerEntity));

  // Drop tween
  scene.tweens.add({
    targets: sprite.sprite,
    y: y,
    duration: DROP_DURATION_MS,
    ease: 'Bounce.easeOut',
    onUpdate: () => { transform.y = sprite.sprite.y; }
  });

  // Sparkle particles
  const particles = scene.add.particles(x, y - SPAWN_OFFSET_Y_PX, '__WHITE', {
    speed: { min: 20, max: 50 },
    scale: { start: 0.4, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: 500,
    tint: PARTICLE_TINT,
    frequency: 60,
    quantity: 1,
  });
  particles.setDepth(sprite.sprite.depth + 1);
  scene.time.delayedCall(DROP_DURATION_MS, () => particles.stop());
  scene.time.delayedCall(DROP_DURATION_MS + 600, () => particles.destroy());

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    SmallMushroomComponent
  ]);

  return entity;
}
