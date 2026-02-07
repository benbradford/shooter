import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { ShadowComponent } from '../../components/core/ShadowComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { RockProjectileComponent, type RockProjectileComponentProps } from '../../components/combat/RockProjectileComponent';

export type CreateRockEntityProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
} & RockProjectileComponentProps;

export function createRockEntity(props: CreateRockEntityProps): Entity {
  const { scene, x, y, ...rockProps } = props;
  const entity = new Entity('rock');

  entity.tags.add('player_projectile');

  const transform = entity.add(new TransformComponent(x, y, 0, 0.33));

  entity.add(new SpriteComponent(scene, 'rock', transform));

  const shadow = entity.add(new ShadowComponent(scene, { scale: 0.5, offsetX: 0, offsetY: 11 }));
  shadow.init();

  const rockComp = entity.add(new RockProjectileComponent(x, y, rockProps));

  entity.add(new CollisionComponent({
    box: { offsetX: -10, offsetY: -10, width: 21, height: 21 },
    collidesWith: ['enemy'],
    onHit: (other) => {
      if (other.tags.has('enemy')) {
        rockComp.handleHit(other);
      }
    }
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    ShadowComponent,
    RockProjectileComponent,
    CollisionComponent,
  ]);

  return entity;
}
