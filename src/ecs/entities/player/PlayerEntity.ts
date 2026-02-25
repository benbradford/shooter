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
import { MedipackHealerComponent } from '../../components/core/MedipackHealerComponent';
import { HudBarComponent } from '../../components/ui/HudBarComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { WaterEffectComponent } from '../../components/visual/WaterEffectComponent';
import { WaterRippleComponent } from '../../components/visual/WaterRippleComponent';
import { ShadowComponent } from '../../components/core/ShadowComponent';
import { VignetteHealthComponent } from '../../components/visual/VignetteHealthComponent';
import { AttackComboComponent } from '../../components/combat/AttackComboComponent';
import { SlideAbilityComponent } from '../../components/abilities/SlideAbilityComponent';
import { SlideButtonComponent } from '../../components/input/SlideButtonComponent';
import { Animation } from '../../../systems/animation/Animation';
import { AnimationSystem } from '../../../systems/animation/AnimationSystem';
import { Direction } from '../../../constants/Direction';
import { StateMachine } from '../../../systems/state/StateMachine';
import { PlayerIdleState } from './PlayerIdleState';
import { PlayerWalkState } from './PlayerWalkState';
import { PlayerDeathState } from './PlayerDeathState';
import type { Grid } from '../../../systems/grid/Grid';

import { CAN_SUBMERGE, SPRITE_SCALE } from '../../../constants/GameConstants';

const PLAYER_SCALE = 2 * SPRITE_SCALE;
const PLAYER_SPRITE_FRAME = 0;
const PLAYER_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 24, width: 34, height: 16 };
const PLAYER_ENTITY_COLLISION_BOX = { offsetX: -18, offsetY: -20, width: 36, height: 40 };
const PLAYER_WALK_SPEED_PX_PER_SEC = 300;
const PLAYER_ACCELERATION_TIME_MS = 300;
const PLAYER_DECELERATION_TIME_MS = 100;
const PLAYER_STOP_THRESHOLD = 120;

export const PLAYER_MAX_HEALTH = 100;
const PLAYER_HEALTH_BAR_OFFSET_Y_PX = 50;
const SLIDE_ANIM_SECONDS_PER_FRAME = 0.05;

export type CreatePlayerEntityProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  grid: Grid;
  joystick: Entity;
  getEnemies: () => Entity[];
  entityManager: EntityManager;
  vignetteSprite?: Phaser.GameObjects.Image;
  initialHealth?: number;
}

export function createPlayerEntity(props: CreatePlayerEntityProps): Entity {
  const { scene, x, y, grid, joystick, getEnemies, entityManager, vignetteSprite, initialHealth } = props;
  const entity = new Entity('player');

  const transform = entity.add(new TransformComponent(x, y, 0, PLAYER_SCALE));

  const sprite = entity.add(new SpriteComponent(scene, 'attacker', transform));
  sprite.sprite.setFrame(PLAYER_SPRITE_FRAME);

  const shadow = entity.add(new ShadowComponent(scene, { scale: 1, offsetX: 0, offsetY: 28 }));
  shadow.init();

  const animMap = new Map<string, Animation>();

  animMap.set(`idle_${Direction.Right}`, new Animation(['0'], 'static', 0));
  animMap.set(`idle_${Direction.UpRight}`, new Animation(['1'], 'static', 0));
  animMap.set(`idle_${Direction.UpLeft}`, new Animation(['2'], 'static', 0));
  animMap.set(`idle_${Direction.Up}`, new Animation(['3'], 'static', 0));
  animMap.set(`idle_${Direction.DownRight}`, new Animation(['4'], 'static', 0));
  animMap.set(`idle_${Direction.DownLeft}`, new Animation(['5'], 'static', 0));
  animMap.set(`idle_${Direction.Down}`, new Animation(['6'], 'static', 0));
  animMap.set(`idle_${Direction.Left}`, new Animation(['7'], 'static', 0));

  animMap.set(`walk_${Direction.Down}`, new Animation(['456', '457', '458', '459'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.DownRight}`, new Animation(['460', '461', '462', '463'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.Right}`, new Animation(['464', '465', '466', '467'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.UpRight}`, new Animation(['468', '469', '470', '471'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.Up}`, new Animation(['472', '473', '474', '475'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.UpLeft}`, new Animation(['476', '477', '478', '479'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.Left}`, new Animation(['480', '481', '482', '483'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.DownLeft}`, new Animation(['484', '485', '486', '487'], 'repeat', 0.125));

  animMap.set(`run_${Direction.Down}`, new Animation(['200', '201', '202', '203', '204', '205'], 'repeat', 0.1));
  animMap.set(`run_${Direction.DownRight}`, new Animation(['206', '207', '208', '209', '210', '211'], 'repeat', 0.1));
  animMap.set(`run_${Direction.Right}`, new Animation(['212', '213', '214', '215', '216', '217'], 'repeat', 0.1));
  animMap.set(`run_${Direction.UpRight}`, new Animation(['218', '219', '220', '221', '222', '223'], 'repeat', 0.1));
  animMap.set(`run_${Direction.Up}`, new Animation(['224', '225', '226', '227', '228', '229'], 'repeat', 0.1));
  animMap.set(`run_${Direction.UpLeft}`, new Animation(['230', '231', '232', '233', '234', '235'], 'repeat', 0.1));
  animMap.set(`run_${Direction.Left}`, new Animation(['236', '237', '238', '239', '240', '241'], 'repeat', 0.1));
  animMap.set(`run_${Direction.DownLeft}`, new Animation(['242', '243', '244', '245', '246', '247'], 'repeat', 0.1));

  animMap.set(`swim_${Direction.Down}`, new Animation(['352', '353', '354', '355', '356', '357'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.DownRight}`, new Animation(['358', '359', '360', '361', '362', '363'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.Right}`, new Animation(['364', '365', '366', '367', '368', '369'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.UpRight}`, new Animation(['370', '371', '372', '373', '374', '375'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.Up}`, new Animation(['376', '377', '378', '379', '380', '381'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.UpLeft}`, new Animation(['382', '383', '384', '385', '386', '387'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.Left}`, new Animation(['388', '389', '390', '391', '392', '393'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.DownLeft}`, new Animation(['394', '395', '396', '397', '398', '399'], 'repeat', 0.125));

  animMap.set(`death_${Direction.Down}`, new Animation(['56', '57', '58', '59', '60', '61', '62'], 'once', 0.15));
  animMap.set(`death_${Direction.DownRight}`, new Animation(['63', '64', '65', '66', '67', '68', '69'], 'once', 0.15));
  animMap.set(`death_${Direction.Right}`, new Animation(['70', '71', '72', '73', '74', '75', '76'], 'once', 0.15));
  animMap.set(`death_${Direction.UpRight}`, new Animation(['77', '78', '79', '80', '81', '82', '83'], 'once', 0.15));
  animMap.set(`death_${Direction.Up}`, new Animation(['84', '85', '86', '87', '88', '89', '90'], 'once', 0.15));
  animMap.set(`death_${Direction.UpLeft}`, new Animation(['91', '92', '93', '94', '95', '96', '97'], 'once', 0.15));
  animMap.set(`death_${Direction.Left}`, new Animation(['98', '99', '100', '101', '102', '103', '104'], 'once', 0.15));
  animMap.set(`death_${Direction.DownLeft}`, new Animation(['105', '106', '107', '108', '109', '110', '111'], 'once', 0.15));

  animMap.set(`punch_${Direction.Down}`, new Animation(['8', '9', '10', '11', '12', '13'], 'once', 0.0415));
  animMap.set(`punch_${Direction.DownRight}`, new Animation(['14', '15', '16', '17', '18', '19'], 'once', 0.0415));
  animMap.set(`punch_${Direction.Right}`, new Animation(['20', '21', '22', '23', '24', '25'], 'once', 0.0415));
  animMap.set(`punch_${Direction.UpRight}`, new Animation(['26', '27', '28', '29', '30', '31'], 'once', 0.0415));
  animMap.set(`punch_${Direction.Up}`, new Animation(['32', '33', '34', '35', '36', '37'], 'once', 0.0415));
  animMap.set(`punch_${Direction.UpLeft}`, new Animation(['38', '39', '40', '41', '42', '43'], 'once', 0.0415));
  animMap.set(`punch_${Direction.Left}`, new Animation(['44', '45', '46', '47', '48', '49'], 'once', 0.0415));
  animMap.set(`punch_${Direction.DownLeft}`, new Animation(['50', '51', '52', '53', '54', '55'], 'once', 0.0415));

  animMap.set(`slide_start_${Direction.Down}`, new Animation(['248', '249', '250', '251'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_start_${Direction.DownRight}`, new Animation(['254', '255', '256', '257'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_start_${Direction.Right}`, new Animation(['260', '261', '262', '263'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_start_${Direction.UpRight}`, new Animation(['266', '267', '268', '269'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_start_${Direction.Up}`, new Animation(['272', '273', '274', '275'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_start_${Direction.UpLeft}`, new Animation(['278', '279', '280', '281'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_start_${Direction.Left}`, new Animation(['284', '285', '286', '287'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_start_${Direction.DownLeft}`, new Animation(['290', '291', '292', '293'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));

  animMap.set(`slide_end_${Direction.Down}`, new Animation(['252', '253'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_end_${Direction.DownRight}`, new Animation(['258', '259'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_end_${Direction.Right}`, new Animation(['264', '265'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_end_${Direction.UpRight}`, new Animation(['270', '271'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_end_${Direction.Up}`, new Animation(['276', '277'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_end_${Direction.UpLeft}`, new Animation(['282', '283'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_end_${Direction.Left}`, new Animation(['288', '289'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_end_${Direction.DownLeft}`, new Animation(['294', '295'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_end_${Direction.UpLeft}`, new Animation(['150', '151'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_end_${Direction.Left}`, new Animation(['156', '157'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));
  animMap.set(`slide_end_${Direction.DownLeft}`, new Animation(['162', '163'], 'once', SLIDE_ANIM_SECONDS_PER_FRAME));

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

  if (initialHealth !== undefined) {
    health.setHealth(initialHealth);
  }

  entity.add(new MedipackHealerComponent());

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

  entity.add(new SlideAbilityComponent(scene));

  const slideAbility = entity.require(SlideAbilityComponent);
  const attackCombo = entity.require(AttackComboComponent);
  const slideButton = entity.add(new SlideButtonComponent(scene, slideAbility, attackCombo));
  slideButton.init();

  const stateMachine = new StateMachine(
    {
      idle: new PlayerIdleState(entity),
      walk: new PlayerWalkState(entity),
      death: new PlayerDeathState(entity, scene),
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

        if (health.getHealth() <= 0) {
          const sm = entity.require(StateMachineComponent);
          sm.stateMachine.enter('death');
          return;
        }

        const hitFlash = entity.require(HitFlashComponent);
        hitFlash.flash(300);
      }
    }
  }));


  if (CAN_SUBMERGE) {
    entity.add(new WaterEffectComponent());
  }

  entity.add(new WaterRippleComponent(scene, grid));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    ShadowComponent,
    ControlModeComponent,
    InputComponent,
    WalkComponent,
    GridCollisionComponent,
    SlideAbilityComponent,
    CollisionComponent,
    HealthComponent,
    MedipackHealerComponent,
    VignetteHealthComponent,
    HitFlashComponent,
    HudBarComponent,
    SlideButtonComponent,
    StateMachineComponent,
    AttackComboComponent,
    AnimationComponent,
    WaterRippleComponent,
    ...(CAN_SUBMERGE ? [WaterEffectComponent] : []),
  ]);

  grid.addOccupant(startCell.col, startCell.row, entity);

  return entity;
}
