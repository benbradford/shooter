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

export function createSmallMushroomEntity(props: CreateSmallMushroomProps): Entity {
  const { scene, x, y, playerEntity } = props;

  const entity = new Entity('small_mushroom');
  entity.tags.add('pickup');

  const transform = entity.add(new TransformComponent(x, y, 0, MUSHROOM_SCALE));
  entity.add(new SpriteComponent(scene, 'small_mushrooms', transform));
  entity.add(new SmallMushroomComponent(playerEntity));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    SmallMushroomComponent
  ]);

  return entity;
}
