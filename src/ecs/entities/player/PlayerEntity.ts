import Phaser from 'phaser';
import { Entity } from '../../Entity';
import { EntityManager } from '../../EntityManager';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { InputComponent } from '../../components/input/InputComponent';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { TouchJoystickComponent } from '../../components/input/TouchJoystickComponent';
import { AttackButtonComponent } from '../../components/input/AttackButtonComponent';
import { ControlModeComponent } from '../../components/input/ControlModeComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { HudBarComponent } from '../../components/ui/HudBarComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { ShadowComponent } from '../../components/core/ShadowComponent';
import { VignetteHealthComponent } from '../../components/visual/VignetteHealthComponent';
import { AttackComboComponent } from '../../components/combat/AttackComboComponent';
import { Animation } from '../../../systems/animation/Animation';
import { AnimationSystem } from '../../../systems/animation/AnimationSystem';
import { Direction } from '../../../constants/Direction';
import { StateMachine } from '../../../systems/state/StateMachine';
import { PlayerIdleState } from './PlayerIdleState';
import { PlayerWalkState } from './PlayerWalkState';
import type { Grid } from '../../../systems/grid/Grid';

import { SPRITE_SCALE } from '../../../constants/GameConstants';

const PLAYER_SCALE = 2 * SPRITE_SCALE;
const PLAYER_SPRITE_FRAME = 0;
const PLAYER_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 32, width: 34, height: 24 };
const PLAYER_ENTITY_COLLISION_BOX = { offsetX: -18, offsetY: -20, width: 36, height: 40 };
const PLAYER_WALK_SPEED_PX_PER_SEC = 300;
const PLAYER_ACCELERATION_TIME_MS = 300;
const PLAYER_DECELERATION_TIME_MS = 100;
const PLAYER_STOP_THRESHOLD = 120;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_HEALTH_BAR_OFFSET_Y_PX = 70;

export type CreatePlayerEntityProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  grid: Grid;
  joystick: Entity;
  getEnemies: () => Entity[];
  entityManager: EntityManager;
  vignetteSprite?: Phaser.GameObjects.Image;
}

export function createPlayerEntity(props: CreatePlayerEntityProps): Entity {
  const { scene, x, y, grid, joystick, getEnemies, entityManager, vignetteSprite } = props;
  const entity = new Entity('player');

  const transform = entity.add(new TransformComponent(x, y, 0, PLAYER_SCALE));

  const sprite = entity.add(new SpriteComponent(scene, 'attacker', transform));
  sprite.sprite.setFrame(PLAYER_SPRITE_FRAME);

  const shadow = entity.add(new ShadowComponent(scene, { scale: 1, offsetX: 0, offsetY: 28 }));
  shadow.init();

  const animMap = new Map<string, Animation>();
  const directionRows: [Direction, number][] = [
    [Direction.Down, 0],
    [Direction.DownRight, 1],
    [Direction.Right, 2],
    [Direction.UpRight, 3],
    [Direction.Up, 4],
    [Direction.UpLeft, 5],
    [Direction.Left, 6],
    [Direction.DownLeft, 7],
  ];

  directionRows.forEach(([dir, row]) => {
    animMap.set(`idle_${dir}`, new Animation([String(row)], 'static', 0));
  });

  const punchDirections: [Direction, number][] = [
    [Direction.Down, 8],
    [Direction.DownRight, 14],
    [Direction.Right, 20],
    [Direction.UpRight, 26],
    [Direction.Up, 32],
    [Direction.UpLeft, 38],
    [Direction.Left, 44],
    [Direction.DownLeft, 44],
  ];

  punchDirections.forEach(([dir, startFrame]) => {
    const frames = [
      String(startFrame),
      String(startFrame + 1),
      String(startFrame + 2),
      String(startFrame + 3),
      String(startFrame + 4),
      String(startFrame + 5),
      String(startFrame + 5),
      String(startFrame + 5)
    ];
    animMap.set(`punch_${dir}`, new Animation(frames, 'repeat', 0.0315));
  });

  const animSystem = new AnimationSystem(animMap, `idle_${Direction.Down}`);
  entity.add(new AnimationComponent(animSystem, sprite));

  const input = entity.add(new InputComponent(scene));

  const joystickComp = joystick.get(TouchJoystickComponent);
  if (joystickComp) {
    input.setJoystick(joystickComp);
  }

  const attackButtonComp = joystick.get(AttackButtonComponent);
  if (attackButtonComp) {
    input.setAttackButton(attackButtonComp);
  }

  const controlModeComp = joystick.get(ControlModeComponent);
  if (controlModeComp) {
    input.setControlMode(controlModeComp);
    entity.add(controlModeComp);
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

  const hudBars = entity.add(new HudBarComponent(scene, [
    { dataSource: health, offsetY: PLAYER_HEALTH_BAR_OFFSET_Y_PX, fillColor: 0x00ff00 },
  ]));
  hudBars.init();

  if (vignetteSprite) {
    const cameraWidth = scene.cameras.main.width;
    const cameraHeight = scene.cameras.main.height;
    entity.add(new VignetteHealthComponent({ healthComponent: health, scene, cameraWidth, cameraHeight }));
  }

  entity.add(new HitFlashComponent());

  entity.add(new AttackComboComponent({
    scene,
    entityManager,
    getEnemies
  }));

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
    HitFlashComponent,
    HudBarComponent,
    StateMachineComponent,
    AttackComboComponent,
    AnimationComponent,
  ]);

  grid.addOccupant(startCell.col, startCell.row, entity);

  return entity;
}
