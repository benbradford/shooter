import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { CompanionFollowComponent } from '../../components/companion/CompanionFollowComponent';
import { CompanionTrailComponent } from '../../components/companion/CompanionTrailComponent';
import { CompanionGlowComponent } from '../../components/companion/CompanionGlowComponent';
import { Depth } from '../../../constants/DepthConstants';
import type Phaser from 'phaser';

const COMPANION_SCALE = 0.055;


export type CreateCompanionProps = {
  scene: Phaser.Scene;
  playerEntity: Entity;
  startX: number;
  startY: number;
};

export function createCompanionEntity(props: CreateCompanionProps): Entity {
  const { scene, playerEntity, startX, startY } = props;
  const entity = new Entity('companion');

  const transform = new TransformComponent(startX, startY, 0, COMPANION_SCALE);
  entity.add(transform);

  const sprite = new SpriteComponent(scene, 'narry', transform);
  entity.add(sprite);
  sprite.sprite.setDepth(Depth.particle);

  const follow = new CompanionFollowComponent(playerEntity);
  entity.add(follow);

  const trail = new CompanionTrailComponent(scene);
  entity.add(trail);

  const glow = new CompanionGlowComponent(scene);
  entity.add(glow);

  entity.setUpdateOrder([
    CompanionFollowComponent,
    TransformComponent,
    SpriteComponent,
    CompanionTrailComponent,
    CompanionGlowComponent,
  ]);

  glow.init();

  return entity;
}
