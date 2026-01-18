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
import { ProjectileEmitterComponent, type EmitterOffset } from '../ecs/components/ProjectileEmitterComponent';
import { Animation } from '../animation/Animation';
import { AnimationSystem } from '../animation/AnimationSystem';
import { Direction } from '../constants/Direction';
import { StateMachine } from '../utils/state/StateMachine';
import { PlayerIdleState } from './PlayerIdleState';
import { PlayerWalkState } from './PlayerWalkState';
import type { Grid } from '../utils/Grid';

export function createPlayerEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  grid: Grid,
  onFire: (x: number, y: number, dirX: number, dirY: number) => void,
  onShellEject: (x: number, y: number, direction: 'left' | 'right', playerDirection: Direction) => void
): Entity {
  const entity = new Entity('player');

  // Transform
  const transform = entity.add(new TransformComponent(x, y, 0, 2));

  // Sprite - use frame 0 (down idle) from sprite sheet
  const sprite = entity.add(new SpriteComponent(scene, 'player', transform));
  sprite.sprite.setFrame(0);

  // Animation System - map directions to sprite sheet rows
  // Sprite sheet layout: 4 cols (idle, walk1, walk2, walk3) x 8 rows (8 directions)
  // Row 0: Down, Row 1: Up, Row 2: Left, Row 3: Right
  // Row 4: UpLeft, Row 5: UpRight, Row 6: DownLeft, Row 7: DownRight
  const animMap = new Map<string, Animation>();
  const directionRows: [Direction, number][] = [
    [Direction.Down, 0],
    [Direction.Up, 1],
    [Direction.Left, 2],
    [Direction.Right, 3],
    [Direction.UpLeft, 4],
    [Direction.UpRight, 5],
    [Direction.DownLeft, 6],
    [Direction.DownRight, 7],
  ];

  directionRows.forEach(([dir, row]) => {
    const baseFrame = row * 4;
    animMap.set(
      `walk_${dir}`,
      new Animation([baseFrame + 1, baseFrame + 2, baseFrame + 3].map(String), 'pingpong', 0.15)
    );
    animMap.set(`idle_${dir}`, new Animation([String(baseFrame)], 'static', 0));
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

  // Projectile Emitter
  const emitterOffsets: Record<Direction, EmitterOffset> = {
    [Direction.Down]: { x: -16, y: 40 },
    [Direction.Up]: { x: 12, y: -40 },
    [Direction.Left]: { x: -40, y: 0 },
    [Direction.Right]: { x: 40, y: 0 },
    [Direction.UpLeft]: { x: -20, y: -20 },
    [Direction.UpRight]: { x: 20, y: -20 },
    [Direction.DownLeft]: { x: -34, y: 22 },
    [Direction.DownRight]: { x: 27, y: 24 },
    [Direction.None]: { x: 0, y: 0 },
  };
  entity.add(new ProjectileEmitterComponent(
    scene,
    onFire,
    emitterOffsets,
    () => input.isFirePressed(),
    200,  // 200ms cooldown between shots
    onShellEject
  ));

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
    ProjectileEmitterComponent,
    StateMachineComponent,
    AnimationComponent,
  ]);

  // Add to grid
  grid.addOccupant(startCell.col, startCell.row, entity);

  return entity;
}
