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
import { TouchJoystickComponent } from '../ecs/components/TouchJoystickComponent';
import { AmmoComponent } from '../ecs/components/AmmoComponent';
import { HealthComponent } from '../ecs/components/HealthComponent';
import { HudBarComponent } from '../ecs/components/HudBarComponent';
import { OverheatSmokeComponent } from '../ecs/components/OverheatSmokeComponent';
import { Animation } from '../animation/Animation';
import { AnimationSystem } from '../animation/AnimationSystem';
import { Direction } from '../constants/Direction';
import { StateMachine } from '../utils/state/StateMachine';
import { PlayerIdleState } from './PlayerIdleState';
import { PlayerWalkState } from './PlayerWalkState';
import type { Grid } from '../utils/Grid';

// Player configuration constants
const PLAYER_SCALE = 2;
const PLAYER_SPRITE_FRAME = 0; // Down idle
const PLAYER_HITBOX = { offsetX: 0, offsetY: 32, width: 36, height: 32 };
const PLAYER_WALK_SPEED = 300;
const PLAYER_ACCELERATION_TIME = 300;
const PLAYER_DECELERATION_TIME = 100;
const PLAYER_STOP_THRESHOLD = 120;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_MAX_AMMO = 50;
const PLAYER_AMMO_REFILL_RATE = 20;
const PLAYER_AMMO_REFILL_DELAY = 1000;
const PLAYER_AMMO_OVERHEATED_DELAY = 4000;
const PLAYER_FIRE_COOLDOWN = 120;
const PLAYER_HEALTH_BAR_OFFSET_Y = 70;
const PLAYER_AMMO_BAR_OFFSET_Y = 90;

export function createPlayerEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  grid: Grid,
  onFire: (x: number, y: number, dirX: number, dirY: number) => void,
  onShellEject: (x: number, y: number, direction: 'left' | 'right', playerDirection: Direction) => void,
  joystick: Entity
): Entity {
  const entity = new Entity('player');

  // Transform
  const transform = entity.add(new TransformComponent(x, y, 0, PLAYER_SCALE));

  // Sprite
  const sprite = entity.add(new SpriteComponent(scene, 'player', transform));
  sprite.sprite.setFrame(PLAYER_SPRITE_FRAME);

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

  // Connect joystick to input
  const joystickComp = joystick.get(TouchJoystickComponent)!;
  input.setJoystick(joystickComp);

  // Walk
  entity.add(new WalkComponent(transform, input, {
    speed: PLAYER_WALK_SPEED,
    accelerationTime: PLAYER_ACCELERATION_TIME,
    decelerationTime: PLAYER_DECELERATION_TIME,
    stopThreshold: PLAYER_STOP_THRESHOLD
  }));

  // Grid Position
  const startCell = grid.worldToCell(x, y);
  entity.add(new GridPositionComponent(startCell.col, startCell.row, PLAYER_HITBOX));

  // Grid Collision
  entity.add(new GridCollisionComponent(grid));

  // Health System
  const health = entity.add(new HealthComponent({ maxHealth: PLAYER_MAX_HEALTH }));

  // Ammo System
  const ammo = entity.add(new AmmoComponent({
    maxAmmo: PLAYER_MAX_AMMO,
    refillRate: PLAYER_AMMO_REFILL_RATE,
    refillDelay: PLAYER_AMMO_REFILL_DELAY,
    overheatedRefillDelay: PLAYER_AMMO_OVERHEATED_DELAY
  }));

  // HUD Bars (both health and ammo)
  const hudBars = entity.add(new HudBarComponent(scene, [
    { dataSource: health, offsetY: PLAYER_HEALTH_BAR_OFFSET_Y, fillColor: 0x00ff00 },
    { dataSource: ammo, offsetY: PLAYER_AMMO_BAR_OFFSET_Y, fillColor: 0x0000ff },
  ]));
  hudBars.init();

  // Projectile Emitter
  const emitterOffsets: Record<Direction, EmitterOffset> = {
    [Direction.Down]: { x: -16, y: 40 },
    [Direction.Up]: { x: 10, y: -30 },
    [Direction.Left]: { x: -51, y: 0 },
    [Direction.Right]: { x: 43, y: 0 },
    [Direction.UpLeft]: { x: -25, y: -25 },
    [Direction.UpRight]: { x: 22, y: -20 },
    [Direction.DownLeft]: { x: -35, y: 22 },
    [Direction.DownRight]: { x: 29, y: 21 },
    [Direction.None]: { x: 0, y: 0 },
  };
  entity.add(new ProjectileEmitterComponent({
    scene,
    onFire,
    offsets: emitterOffsets,
    shouldFire: () => input.isFirePressed(),
    cooldown: PLAYER_FIRE_COOLDOWN,
    onShellEject,
    ammoComponent: ammo
  }));

  // Overheat Smoke Effect
  const overheatSmoke = entity.add(new OverheatSmokeComponent(scene, ammo, emitterOffsets));
  overheatSmoke.init();

  // State Machine (added after Animation so onEnter can access it)
  const stateMachine = new StateMachine(
    {
      idle: new PlayerIdleState(entity),
      walk: new PlayerWalkState(entity),
    },
    'idle'
  );
  entity.add(new StateMachineComponent(stateMachine));

  // Set update order with component instances
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    InputComponent,
    WalkComponent,
    GridCollisionComponent,
    HealthComponent,
    AmmoComponent,
    ProjectileEmitterComponent,
    OverheatSmokeComponent,
    HudBarComponent,
    StateMachineComponent,
    AnimationComponent,
  ]);

  // Add to grid
  grid.addOccupant(startCell.col, startCell.row, entity);

  return entity;
}
