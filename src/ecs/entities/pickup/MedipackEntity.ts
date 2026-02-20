import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { MedipackComponent } from '../../components/pickup/MedipackComponent';

export type CreateMedipackProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  playerEntity: Entity;
}

const MEDIPACK_SCALE = 0.04;

export function createMedipackEntity(props: CreateMedipackProps): Entity {
  const { scene, x, y, playerEntity } = props;

  const entity = new Entity('medipack');
  entity.tags.add('medipack');

  const transform = entity.add(new TransformComponent(x, y, 0, MEDIPACK_SCALE));
  entity.add(new SpriteComponent(scene, 'medi_pack', transform));
  entity.add(new MedipackComponent(playerEntity));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    MedipackComponent
  ]);

  return entity;
}
