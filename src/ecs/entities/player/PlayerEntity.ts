import Phaser from 'phaser';
import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { InputComponent } from '../../components/input/InputComponent';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { ProjectileEmitterComponent, type EmitterOffset } from '../../components/combat/ProjectileEmitterComponent';
import { TouchJoystickComponent } from '../../components/input/TouchJoystickComponent';
import { AimJoystickComponent } from '../../components/input/AimJoystickComponent';
import { ControlModeComponent } from '../../components/input/ControlModeComponent';
import { AmmoComponent } from '../../components/combat/AmmoComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { HudBarComponent } from '../../components/ui/HudBarComponent';
import { OverheatSmokeComponent } from '../../components/visual/OverheatSmokeComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { ShadowComponent } from '../../components/core/ShadowComponent';
import { VignetteHealthComponent } from '../../components/visual/VignetteHealthComponent';
import { Animation } from '../../../systems/animation/Animation';
import { AnimationSystem } from '../../../systems/animation/AnimationSystem';
import { Direction } from '../../../constants/Direction';
import { StateMachine } from '../../../ecs/systems/state/StateMachine';
import { PlayerIdleState } from './PlayerIdleState';
import { PlayerWalkState } from './PlayerWalkState';
import type { Grid } from '../../../ecs/systems/Grid';

// Player configuration constants
import { SPRITE_SCALE } from '../../../constants/GameConstants';

const PLAYER_SCALE = 2 * SPRITE_SCALE;
const PLAYER_SPRITE_FRAME = 0; // Down idle
const PLAYER_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 32, width: 34, height: 24 }; // For grid/wall collision
const PLAYER_ENTITY_COLLISION_BOX = { offsetX: -18, offsetY: -20, width: 36, height: 40 }; // For projectile collision
const PLAYER_WALK_SPEED_PX_PER_SEC = 300;
const PLAYER_ACCELERATION_TIME_MS = 300;
const PLAYER_DECELERATION_TIME_MS = 100;
const PLAYER_STOP_THRESHOLD = 120;
const PLAYER_MAX_HEALTH = 100;
export const PLAYER_MAX_AMMO = 25;
const PLAYER_AMMO_REFILL_RATE = 20;
const PLAYER_AMMO_REFILL_DELAY_MS = 1000;
const PLAYER_AMMO_OVERHEATED_DELAY_MS = 4000;
const PLAYER_FIRE_COOLDOWN_MS = 180;
const PLAYER_BULLET_MAX_DISTANCE_PX = 500;
const PLAYER_HEALTH_BAR_OFFSET_Y_PX = 70;
const PLAYER_AMMO_BAR_OFFSET_Y_PX = 90;

export type CreatePlayerEntityProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  grid: Grid;
  onFire: (x: number, y: number, dirX: number, dirY: number) => void;
  onShellEject: (x: number, y: number, direction: 'left' | 'right', playerDirection: Direction) => void;
  joystick: Entity;
  getEnemies: () => Entity[];
  vignetteSprite?: Phaser.GameObjects.Image;
}

export function createPlayerEntity(props: CreatePlayerEntityProps): Entity {
  const { scene, x, y, grid, onFire, onShellEject, joystick, getEnemies, vignetteSprite } = props;
  const entity = new Entity('player');

  const transform = entity.add(new TransformComponent(x, y, 0, PLAYER_SCALE));

  const sprite = entity.add(new SpriteComponent(scene, 'player', transform));
  sprite.sprite.setFrame(PLAYER_SPRITE_FRAME);

  const shadow = entity.add(new ShadowComponent(scene, { scale: 2, offsetX: -5, offsetY: 43 }));
  shadow.init();

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

  const input = entity.add(new InputComponent(scene, grid, getEnemies, PLAYER_BULLET_MAX_DISTANCE_PX));

  const joystickComp = joystick.get(TouchJoystickComponent);
  if (joystickComp) {
    input.setJoystick(joystickComp);
  }

  const aimJoystickComp = joystick.get(AimJoystickComponent);
  if (aimJoystickComp) {
    input.setAimJoystick(aimJoystickComp);
  }

  const controlModeComp = joystick.get(ControlModeComponent);
  if (controlModeComp) {
    input.setControlMode(controlModeComp);
    entity.add(controlModeComp); // Add to player entity for update order
  }

  const walk = entity.add(new WalkComponent(transform, input, {
    speed: PLAYER_WALK_SPEED_PX_PER_SEC,
    accelerationTime: PLAYER_ACCELERATION_TIME_MS,
    decelerationTime: PLAYER_DECELERATION_TIME_MS,
    stopThreshold: PLAYER_STOP_THRESHOLD
  }));
  if (controlModeComp) {
    walk.setControlMode(controlModeComp);
  }

  const startCell = grid.worldToCell(x, y);
  entity.add(new GridPositionComponent(startCell.col, startCell.row, PLAYER_GRID_COLLISION_BOX));

  entity.add(new GridCollisionComponent(grid));

  const health = entity.add(new HealthComponent({ maxHealth: PLAYER_MAX_HEALTH, enableRegen: true }));

  const ammo = entity.add(new AmmoComponent({
    maxAmmo: PLAYER_MAX_AMMO,
    refillRate: PLAYER_AMMO_REFILL_RATE,
    refillDelay: PLAYER_AMMO_REFILL_DELAY_MS,
    overheatedRefillDelay: PLAYER_AMMO_OVERHEATED_DELAY_MS
  }));

  const hudBars = entity.add(new HudBarComponent(scene, [
    { dataSource: health, offsetY: PLAYER_HEALTH_BAR_OFFSET_Y_PX, fillColor: 0x00ff00 },
    { dataSource: ammo, offsetY: PLAYER_AMMO_BAR_OFFSET_Y_PX, fillColor: 0x0000ff, redOutlineOnLow: true, shakeOnLow: true },
  ]));
  hudBars.init();

  if (vignetteSprite) {
    entity.add(new VignetteHealthComponent({ healthComponent: health, vignetteSprite }));
  }

  const emitterOffsets: Record<Direction, EmitterOffset> = {
    [Direction.Down]: { x: -16 * SPRITE_SCALE, y: 40 * SPRITE_SCALE },
    [Direction.Up]: { x: 10 * SPRITE_SCALE, y: -30 * SPRITE_SCALE },
    [Direction.Left]: { x: -51 * SPRITE_SCALE, y: 0 * SPRITE_SCALE },
    [Direction.Right]: { x: 43 * SPRITE_SCALE, y: 0 * SPRITE_SCALE },
    [Direction.UpLeft]: { x: -25 * SPRITE_SCALE, y: -25 * SPRITE_SCALE },
    [Direction.UpRight]: { x: 22 * SPRITE_SCALE, y: -20 * SPRITE_SCALE },
    [Direction.DownLeft]: { x: -35 * SPRITE_SCALE, y: 22 * SPRITE_SCALE },
    [Direction.DownRight]: { x: 29 * SPRITE_SCALE, y: 21 * SPRITE_SCALE },
    [Direction.None]: { x: 0, y: 0 },
  };
  entity.add(new ProjectileEmitterComponent({
    scene,
    onFire,
    offsets: emitterOffsets,
    shouldFire: () => input.isFirePressed(),
    cooldown: PLAYER_FIRE_COOLDOWN_MS,
    onShellEject,
    ammoComponent: ammo,
    inputComponent: input
  }));

  const overheatSmoke = entity.add(new OverheatSmokeComponent(scene, ammo, emitterOffsets));
  overheatSmoke.init();

  entity.add(new HitFlashComponent());

  // Added after Animation so onEnter can access it
  const stateMachine = new StateMachine(
    {
      idle: new PlayerIdleState(entity),
      walk: new PlayerWalkState(entity),
    },
    'idle'
  );
  entity.add(new StateMachineComponent(stateMachine));

  entity.tags.add('player');
  entity.add(new CollisionComponent({
    box: PLAYER_ENTITY_COLLISION_BOX,
    collidesWith: ['enemy_projectile', 'enemy'],
    onHit: (other) => {
      if (other.tags.has('enemy_projectile')) {
        const damage = other.require(DamageComponent);
        health.takeDamage(damage.damage);

        const hitFlash = entity.get(HitFlashComponent);
        if (hitFlash) {
          hitFlash.flash(300);
        }
      }
    }
  }));

  // Component instances for update order
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    ShadowComponent,
    ControlModeComponent,
    InputComponent,
    WalkComponent,
    GridCollisionComponent,
    CollisionComponent,
    HealthComponent,
    VignetteHealthComponent,
    AmmoComponent,
    ProjectileEmitterComponent,
    OverheatSmokeComponent,
    HitFlashComponent,
    HudBarComponent,
    StateMachineComponent,
    AnimationComponent,
  ]);

  grid.addOccupant(startCell.col, startCell.row, entity);

  return entity;
}
