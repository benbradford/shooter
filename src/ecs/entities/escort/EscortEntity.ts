import { Entity } from '../../Entity';
import { Depth } from '../../../constants/DepthConstants';
import { Direction } from '../../../constants/Direction';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { AnimationSystem } from '../../../systems/animation/AnimationSystem';
import { EscortComponent } from '../../components/escort/EscortComponent';
import { createKnightAnimationMap } from './KnightAnimations';
import type { EscortState } from '../../components/escort/EscortComponent';
import type { Grid } from '../../../systems/grid/Grid';
import type { EntityManager } from '../../EntityManager';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';

export type CreateEscortProps = {
  readonly scene: Phaser.Scene;
  readonly grid: Grid;
  readonly entityId: string;
  readonly col: number;
  readonly row: number;
  readonly playerEntity: Entity;
  readonly entityManager: EntityManager;
  readonly eventManager: EventManagerSystem;
  readonly escortType: string;
  readonly awakeOnEvent: string;
  readonly destinationLevel: string;
  readonly destinationCol: number;
  readonly destinationRow: number;
  readonly reachDistance: number;
  readonly followSpeed: number;
  readonly followToLevels: string[];
  readonly enemyDetectDistancePx: number;
  readonly initialState: EscortState;
  readonly currentLevelName: string;
  readonly scale?: number;
  readonly shadowScale?: number;
  readonly shadowOffsetX?: number;
  readonly shadowOffsetY?: number;
}

const COLLISION_BOX_RATIO = 0.5;
const SHADOW_SCALE = 1;
const SHADOW_OFFSET_X_PX = 0;
const SHADOW_OFFSET_Y_PX = 0;
const KNIGHT_FRAME_SIZE_PX = 68;

export function createEscortEntity(props: CreateEscortProps): Entity {
  const entity = new Entity(props.entityId);
  entity.tags.add('escort');

  const x = props.col * props.grid.cellSize + props.grid.cellSize / 2;
  const y = props.row * props.grid.cellSize + props.grid.cellSize / 2;
  const scale = props.scale ?? (props.grid.cellSize / KNIGHT_FRAME_SIZE_PX);

  const transform = entity.add(new TransformComponent(x, y, 0, scale));
  const sprite = entity.add(new SpriteComponent(props.scene, 'knight_spritesheet', transform));
  sprite.sprite.setDepth(Depth.enemy);

  // (V1 fix): Call shadow.init() explicitly
  const shadow = entity.add(new ShadowComponent(props.scene, {
    scale: props.shadowScale ?? SHADOW_SCALE,
    offsetX: props.shadowOffsetX ?? SHADOW_OFFSET_X_PX,
    offsetY: props.shadowOffsetY ?? SHADOW_OFFSET_Y_PX,
  }));
  shadow.init();

  // (V4 fix): Set invisible for cross-level spawn
  if (props.initialState === 'waiting_for_player_move') {
    sprite.sprite.setAlpha(0);
    if (shadow.shadow) shadow.shadow.setAlpha(0);
  }

  const collisionSize = props.grid.cellSize * COLLISION_BOX_RATIO;
  entity.add(new GridPositionComponent(props.col, props.row, {
    offsetX: 0,
    offsetY: 0,
    width: collisionSize,
    height: collisionSize,
  }));
  entity.add(new GridCollisionComponent(props.grid));

  const animMap = createKnightAnimationMap();
  const defaultAnim = props.initialState === 'completed'
    ? 'arms_stretched'
    : `idle_${Direction.Down}`;
  const animSystem = new AnimationSystem(animMap, defaultAnim);
  const animComp = entity.add(new AnimationComponent(animSystem, sprite));

  // For completed state, jump to last frame of arms_stretched
  if (props.initialState === 'completed') {
    animSystem.play('arms_stretched');
    const armsAnim = animMap.get('arms_stretched');
    if (armsAnim) armsAnim.setIndex(4);
  }

  // For dormant state, show last frame of crouch
  if (props.initialState === 'dormant') {
    animSystem.play('crouch_forward');
    const crouchAnim = animMap.get('crouch_forward');
    if (crouchAnim) crouchAnim.setIndex(4);
  }

  entity.add(new EscortComponent({
    scene: props.scene,
    grid: props.grid,
    playerEntity: props.playerEntity,
    entityManager: props.entityManager,
    eventManager: props.eventManager,
    escortType: props.escortType,
    awakeOnEvent: props.awakeOnEvent,
    destinationLevel: props.destinationLevel,
    destinationCol: props.destinationCol,
    destinationRow: props.destinationRow,
    reachDistance: props.reachDistance,
    followSpeed: props.followSpeed,
    followToLevels: props.followToLevels,
    enemyDetectDistancePx: props.enemyDetectDistancePx,
    initialState: props.initialState,
    currentLevelName: props.currentLevelName,
    col: props.col,
    row: props.row,
    scale: props.scale,
    shadowScale: props.shadowScale,
    shadowOffsetX: props.shadowOffsetX,
    shadowOffsetY: props.shadowOffsetY,
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    ShadowComponent,
    GridPositionComponent,
    GridCollisionComponent,
    EscortComponent,
    AnimationComponent,
  ]);

  // Force first animation frame render
  animComp.update(0);

  return entity;
}
