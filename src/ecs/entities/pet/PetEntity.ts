import Phaser from 'phaser';
import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { PetFollowComponent } from '../../components/pet/PetFollowComponent';
import { DogBarkAbility } from '../../components/pet/DogBarkAbility';
import { RockThrowAbility } from '../../components/pet/RockThrowAbility';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { JumpComponent } from '../../components/movement/JumpComponent';
import { Depth } from '../../../constants/DepthConstants';
import { AnimationSystem } from '../../../systems/animation/AnimationSystem';
import { Direction } from '../../../constants/Direction';
import type { Component } from '../../Component';
import type { Grid } from '../../../systems/grid/Grid';
import type { PetConfig, PetSpritesheetMetadata } from './PetConfig';
import { createPetAnimationMap } from './PetAnimations';

const PET_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 8, width: 24, height: 14 };

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
  spriteComp.sprite.setDepth(Depth.pet);
  entity.add(spriteComp);

  const animMap = createPetAnimationMap(metadata, config);
  const animSystem = new AnimationSystem(animMap, `idle_${Direction.Down}`);
  const animComp = new AnimationComponent(animSystem, spriteComp);
  entity.add(animComp);

  const followComp = new PetFollowComponent(grid, playerEntity, config.directions);
  if (config.runAnim) {
    followComp.setHasRunAnim(true);
  }
  entity.add(followComp);

  const startCell = grid.worldToCell(startX, startY);
  entity.add(new GridPositionComponent(startCell.col, startCell.row, PET_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new JumpComponent({ grid }));

  if (config.id === 'dog') {
    entity.add(new DogBarkAbility(scene, grid));
  }

  if (config.id === 'rock') {
    entity.add(new RockThrowAbility(scene, grid, playerEntity));
  }

  entity.tags.add('pet');

  const updateOrder: Array<new (...args: never[]) => Component> = [
    TransformComponent,
    SpriteComponent,
    PetFollowComponent,
    GridPositionComponent,
    GridCollisionComponent,
    JumpComponent,
  ];

  if (config.id === 'dog') {
    updateOrder.push(DogBarkAbility);
  }

  if (config.id === 'rock') {
    updateOrder.push(RockThrowAbility);
  }

  updateOrder.push(AnimationComponent);

  entity.setUpdateOrder(updateOrder);

  return entity;
}
