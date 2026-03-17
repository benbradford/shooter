import Phaser from 'phaser';
import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { PetFollowComponent } from '../../components/pet/PetFollowComponent';
import { DogBarkAbility } from '../../components/pet/DogBarkAbility';
import { Depth } from '../../../constants/DepthConstants';
import { AnimationSystem } from '../../../systems/animation/AnimationSystem';
import { Direction } from '../../../constants/Direction';
import type { Component } from '../../Component';
import type { Grid } from '../../../systems/grid/Grid';
import type { PetConfig, PetSpritesheetMetadata } from './PetConfig';
import { createPetAnimationMap } from './PetAnimations';

export type CreatePetEntityProps = {
  scene: Phaser.Scene;
  grid: Grid;
  playerEntity: Entity;
  config: PetConfig;
  metadata: PetSpritesheetMetadata;
  startX: number;
  startY: number;
};

export function createPetEntity(props: CreatePetEntityProps): Entity {
  const { scene, grid, playerEntity, config, metadata, startX, startY } = props;
  
  const entity = new Entity(`pet_${config.id}`);
  
  const transform = new TransformComponent(startX, startY);
  transform.scale = config.scale;
  entity.add(transform);
  
  const spriteComp = new SpriteComponent(scene, config.spritesheet, transform);
  spriteComp.sprite.setDepth(Depth.player - 1);
  entity.add(spriteComp);
  
  const animMap = createPetAnimationMap(metadata, config);
  const animSystem = new AnimationSystem(animMap, `idle_${Direction.Down}`);
  const animComp = new AnimationComponent(animSystem, spriteComp);
  entity.add(animComp);
  
  const followComp = new PetFollowComponent(grid, playerEntity);
  if (config.runAnim) {
    followComp.setHasRunAnim(true);
  }
  entity.add(followComp);
  
  if (config.id === 'dog') {
    entity.add(new DogBarkAbility(scene));
  }
  
  entity.tags.add('pet');
  
  const updateOrder: Array<new (...args: never[]) => Component> = [
    TransformComponent,
    SpriteComponent,
    PetFollowComponent,
  ];
  
  if (config.id === 'dog') {
    updateOrder.push(DogBarkAbility);
  }
  
  updateOrder.push(AnimationComponent);
  
  entity.setUpdateOrder(updateOrder);
  
  return entity;
}
