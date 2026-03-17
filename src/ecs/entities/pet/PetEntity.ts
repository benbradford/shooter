import Phaser from 'phaser';
import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { PetFollowComponent } from '../../components/pet/PetFollowComponent';
import { Depth } from '../../../constants/DepthConstants';
import { AnimationSystem } from '../../../systems/animation/AnimationSystem';
import { Direction } from '../../../constants/Direction';
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
  
  entity.add(new PetFollowComponent(grid, playerEntity));
  
  entity.tags.add('pet');
  
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    PetFollowComponent,
    AnimationComponent,
  ]);
  
  return entity;
}
