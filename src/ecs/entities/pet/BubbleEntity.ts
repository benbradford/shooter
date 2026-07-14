import Phaser from 'phaser';
import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { BubbleFollowComponent } from '../../components/pet/BubbleFollowComponent';
import { BubbleShieldAbility } from '../../components/pet/BubbleShieldAbility';
import { Depth } from '../../../constants/DepthConstants';
import type { Component } from '../../Component';

export type CreateBubbleEntityProps = {
  scene: Phaser.Scene;
  playerEntity: Entity;
  startX: number;
  startY: number;
};

export function createBubbleEntity(props: CreateBubbleEntityProps): Entity {
  const { scene, playerEntity, startX, startY } = props;

  const entity = new Entity('pet_bubble');

  const transform = new TransformComponent(startX, startY);
  entity.add(transform);

  const spriteComp = new SpriteComponent(scene, 'bubble', transform);
  spriteComp.sprite.setDepth(Depth.pet);
  spriteComp.sprite.setAlpha(0.5);
  entity.add(spriteComp);

  entity.add(new BubbleFollowComponent(playerEntity));
  entity.add(new BubbleShieldAbility(scene, playerEntity));

  entity.tags.add('pet');

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    BubbleFollowComponent,
    BubbleShieldAbility,
  ] as Array<new (...args: never[]) => Component>);

  return entity;
}
