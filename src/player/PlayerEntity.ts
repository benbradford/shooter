import Phaser from 'phaser';
import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { AnimationComponent } from '../ecs/components/AnimationComponent';
import { InputComponent } from '../ecs/components/InputComponent';
import { WalkComponent } from '../ecs/components/WalkComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import { GridPositionComponent } from '../ecs/components/GridPositionComponent';
import { GridCollisionComponent } from '../ecs/components/GridCollisionComponent';
import { Animation } from '../animation/Animation';
import { AnimationSystem } from '../animation/AnimationSystem';
import { Direction } from '../animation/Direction';
import { StateMachine } from '../utils/state/StateMachine';
import { PlayerIdleState } from './PlayerIdleState';
import { PlayerWalkState } from './PlayerWalkState';
import type { Grid } from '../utils/Grid';

export function createPlayerEntity(scene: Phaser.Scene, x: number, y: number, grid: Grid): Entity {
  const entity = new Entity('player');

  // Transform
  const transform = entity.add(new TransformComponent(x, y, 0, 2));

  // Sprite
  const sprite = entity.add(new SpriteComponent(scene, 'idle_down', transform));

  // Animation System
  const animMap = new Map<string, Animation>();
  const map: [Direction, string][] = [
    [Direction.Down, 'down'],
    [Direction.Up, 'up'],
    [Direction.Left, 'left'],
    [Direction.Right, 'right'],
    [Direction.UpLeft, 'upleft'],
    [Direction.UpRight, 'upright'],
    [Direction.DownLeft, 'downleft'],
    [Direction.DownRight, 'downright'],
  ];

  map.forEach(([dir, name]) => {
    animMap.set(
      `walk_${dir}`,
      new Animation([1, 2, 3].map(i => `walk_${name}_${i}`), 'pingpong', 0.15)
    );
    animMap.set(`idle_${dir}`, new Animation([`idle_${name}`], 'static', 0));
  });

  const animSystem = new AnimationSystem(animMap, `idle_${Direction.Down}`);
  entity.add(new AnimationComponent(animSystem, sprite));

  // Input
  const input = entity.add(new InputComponent(scene));

  // Walk
  entity.add(new WalkComponent(transform, input));

  // Grid Position - collision box at bottom quarter of sprite
  const startCell = grid.worldToCell(x, y);
  entity.add(new GridPositionComponent(
    startCell.col,
    startCell.row,
    { offsetX: 0, offsetY: 32, width: 36, height: 32 }
  ));

  // Grid Collision
  entity.add(new GridCollisionComponent(grid));

  // State Machine (added after Animation so onEnter can access it)
  const stateMachine = new StateMachine(
    {
      idle: new PlayerIdleState(entity),
      walk: new PlayerWalkState(entity),
    },
    'idle'
  );
  entity.add(new StateMachineComponent(stateMachine));

  // Set update order: StateMachine before Animation, GridCollision after Walk
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    InputComponent,
    WalkComponent,
    GridCollisionComponent,
    StateMachineComponent,
    AnimationComponent,
  ]);

  // Add to grid
  grid.addOccupant(startCell.col, startCell.row, entity);

  return entity;
}
