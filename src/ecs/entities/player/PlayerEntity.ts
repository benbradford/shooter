import Phaser from 'phaser';
import { Entity } from '../../Entity';
import { EntityManager } from '../../EntityManager';
import { Depth } from '../../../constants/DepthConstants';
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
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { VignetteHealthComponent } from '../../components/visual/VignetteHealthComponent';
import { AttackComboComponent } from '../../components/combat/AttackComboComponent';
import { PetAbilityComponent } from '../../components/pet/PetAbilityComponent';
import { InteractionComponent } from '../../components/interaction/InteractionComponent';
import { BlockedAreaCollisionComponent } from '../../components/movement/BlockedAreaCollisionComponent';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';
import { Animation } from '../../../systems/animation/Animation';
import { AnimationSystem } from '../../../systems/animation/AnimationSystem';
import { Direction } from '../../../constants/Direction';
import { StateMachine } from '../../../systems/state/StateMachine';
import { PlayerIdleState } from './PlayerIdleState';
import { PlayerWalkState } from './PlayerWalkState';
import { PlayerDeathState } from './PlayerDeathState';
import { PlayerPushState } from './PlayerPushState';
import type { Grid } from '../../../systems/grid/Grid';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';

import { SPRITE_SCALE } from '../../../constants/GameConstants';

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

export type CreatePlayerEntityProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  grid: Grid;
  joystick: Entity;
  getEnemies: () => Entity[];
  entityManager: EntityManager;
  eventManager: EventManagerSystem;
  vignetteSprite?: Phaser.GameObjects.Image;
  initialHealth?: number;
  levelData: () => import('../../../systems/level/LevelLoader').LevelData;
  blockedAreaManager?: BlockedAreaManager;
}

export function createPlayerEntity(props: CreatePlayerEntityProps): Entity {
  const { scene, x, y, grid, joystick, getEnemies, entityManager, eventManager, vignetteSprite, initialHealth, levelData, blockedAreaManager } = props;
  const entity = new Entity('player');

  const transform = entity.add(new TransformComponent(x, y, 0, PLAYER_SCALE));

  const sprite = entity.add(new SpriteComponent(scene, 'attacker', transform));
  sprite.sprite.setFrame(PLAYER_SPRITE_FRAME);
  sprite.sprite.setDepth(Depth.player);
  scene.children.bringToTop(sprite.sprite);
  console.log(`[PlayerEntity] Player sprite created with depth: ${Depth.player}, actual depth: ${sprite.sprite.depth}`);

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

  animMap.set(`walk_${Direction.Down}`, new Animation(['480', '481', '482', '483'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.DownRight}`, new Animation(['484', '485', '486', '487'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.Right}`, new Animation(['488', '489', '490', '491'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.UpRight}`, new Animation(['492', '493', '494', '495'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.Up}`, new Animation(['496', '497', '498', '499'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.UpLeft}`, new Animation(['500', '501', '502', '503'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.Left}`, new Animation(['504', '505', '506', '507'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.DownLeft}`, new Animation(['508', '509', '510', '511'], 'repeat', 0.125));

  animMap.set(`run_${Direction.Down}`, new Animation(['272', '273', '274', '275', '276', '277'], 'repeat', 0.1));
  animMap.set(`run_${Direction.DownRight}`, new Animation(['278', '279', '280', '281', '282', '283'], 'repeat', 0.1));
  animMap.set(`run_${Direction.Right}`, new Animation(['284', '285', '286', '287', '288', '289'], 'repeat', 0.1));
  animMap.set(`run_${Direction.UpRight}`, new Animation(['290', '291', '292', '293', '294', '295'], 'repeat', 0.1));
  animMap.set(`run_${Direction.Up}`, new Animation(['296', '297', '298', '299', '300', '301'], 'repeat', 0.1));
  animMap.set(`run_${Direction.UpLeft}`, new Animation(['302', '303', '304', '305', '306', '307'], 'repeat', 0.1));
  animMap.set(`run_${Direction.Left}`, new Animation(['308', '309', '310', '311', '312', '313'], 'repeat', 0.1));
  animMap.set(`run_${Direction.DownLeft}`, new Animation(['314', '315', '316', '317', '318', '319'], 'repeat', 0.1));

  animMap.set(`swim_${Direction.Down}`, new Animation(['512', '513', '514', '515', '516', '517'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.DownRight}`, new Animation(['518', '519', '520', '521', '522', '523'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.Right}`, new Animation(['524', '525', '526', '527', '528', '529'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.UpRight}`, new Animation(['530', '531', '532', '533', '534', '535'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.Up}`, new Animation(['536', '537', '538', '539', '540', '541'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.UpLeft}`, new Animation(['542', '543', '544', '545', '546', '547'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.Left}`, new Animation(['548', '549', '550', '551', '552', '553'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.DownLeft}`, new Animation(['554', '555', '556', '557', '558', '559'], 'repeat', 0.125));

  animMap.set(`death_${Direction.Down}`, new Animation(['128', '129', '130', '131', '132', '133', '134'], 'once', 0.15));
  animMap.set(`death_${Direction.DownRight}`, new Animation(['135', '136', '137', '138', '139', '140', '141'], 'once', 0.15));
  animMap.set(`death_${Direction.Right}`, new Animation(['142', '143', '144', '145', '146', '147', '148'], 'once', 0.15));
  animMap.set(`death_${Direction.UpRight}`, new Animation(['149', '150', '151', '152', '153', '154', '155'], 'once', 0.15));
  animMap.set(`death_${Direction.Up}`, new Animation(['156', '157', '158', '159', '160', '161', '162'], 'once', 0.15));
  animMap.set(`death_${Direction.UpLeft}`, new Animation(['163', '164', '165', '166', '167', '168', '169'], 'once', 0.15));
  animMap.set(`death_${Direction.Left}`, new Animation(['170', '171', '172', '173', '174', '175', '176'], 'once', 0.15));
  animMap.set(`death_${Direction.DownLeft}`, new Animation(['177', '178', '179', '180', '181', '182', '183'], 'once', 0.15));

  animMap.set(`punch_${Direction.Down}`, new Animation(['80', '81', '82', '83', '84', '85'], 'once', 0.0415));
  animMap.set(`punch_${Direction.DownRight}`, new Animation(['86', '87', '88', '89', '90', '91'], 'once', 0.0415));
  animMap.set(`punch_${Direction.Right}`, new Animation(['92', '93', '94', '95', '96', '97'], 'once', 0.0415));
  animMap.set(`punch_${Direction.UpRight}`, new Animation(['98', '99', '100', '101', '102', '103'], 'once', 0.0415));
  animMap.set(`punch_${Direction.Up}`, new Animation(['104', '105', '106', '107', '108', '109'], 'once', 0.0415));
  animMap.set(`punch_${Direction.UpLeft}`, new Animation(['110', '111', '112', '113', '114', '115'], 'once', 0.0415));
  animMap.set(`punch_${Direction.Left}`, new Animation(['116', '117', '118', '119', '120', '121'], 'once', 0.0415));
  animMap.set(`punch_${Direction.DownLeft}`, new Animation(['122', '123', '124', '125', '126', '127'], 'once', 0.0415));

  animMap.set(`powerup_${Direction.Down}`, new Animation(['8', '9', '10', '11', '12', '13', '14', '15', '16'], 'once', 0.08));
  animMap.set(`powerup_${Direction.DownRight}`, new Animation(['17', '18', '19', '20', '21', '22', '23', '24', '25'], 'once', 0.08));
  animMap.set(`powerup_${Direction.Right}`, new Animation(['26', '27', '28', '29', '30', '31', '32', '33', '34'], 'once', 0.08));
  animMap.set(`powerup_${Direction.UpRight}`, new Animation(['35', '36', '37', '38', '39', '40', '41', '42', '43'], 'once', 0.08));
  animMap.set(`powerup_${Direction.Up}`, new Animation(['44', '45', '46', '47', '48', '49', '50', '51', '52'], 'once', 0.08));
  animMap.set(`powerup_${Direction.UpLeft}`, new Animation(['53', '54', '55', '56', '57', '58', '59', '60', '61'], 'once', 0.08));
  animMap.set(`powerup_${Direction.Left}`, new Animation(['62', '63', '64', '65', '66', '67', '68', '69', '70'], 'once', 0.08));
  animMap.set(`powerup_${Direction.DownLeft}`, new Animation(['71', '72', '73', '74', '75', '76', '77', '78', '79'], 'once', 0.08));

  animMap.set(`pickup_${Direction.Down}`, new Animation(['184', '185', '186', '187', '188'], 'once', 0.1));
  animMap.set(`pickup_${Direction.DownRight}`, new Animation(['189', '190', '191', '192', '193'], 'once', 0.1));
  animMap.set(`pickup_${Direction.Right}`, new Animation(['194', '195', '196', '197', '198'], 'once', 0.1));
  animMap.set(`pickup_${Direction.UpRight}`, new Animation(['199', '200', '201', '202', '203'], 'once', 0.1));
  animMap.set(`pickup_${Direction.Up}`, new Animation(['204', '205', '206', '207', '208'], 'once', 0.1));
  animMap.set(`pickup_${Direction.UpLeft}`, new Animation(['209', '210', '211', '212', '213'], 'once', 0.1));
  animMap.set(`pickup_${Direction.Left}`, new Animation(['214', '215', '216', '217', '218'], 'once', 0.1));
  animMap.set(`pickup_${Direction.DownLeft}`, new Animation(['219', '220', '221', '222', '223'], 'once', 0.1));

  animMap.set(`push_${Direction.Down}`, new Animation(['224', '225', '226', '227', '228', '229'], 'once', 0.1));
  animMap.set(`push_${Direction.DownRight}`, new Animation(['230', '231', '232', '233', '234', '235'], 'once', 0.1));
  animMap.set(`push_${Direction.Right}`, new Animation(['236', '237', '238', '239', '240', '241'], 'once', 0.1));
  animMap.set(`push_${Direction.UpRight}`, new Animation(['242', '243', '244', '245', '246', '247'], 'once', 0.1));
  animMap.set(`push_${Direction.Up}`, new Animation(['248', '249', '250', '251', '252', '253'], 'once', 0.1));
  animMap.set(`push_${Direction.UpLeft}`, new Animation(['254', '255', '256', '257', '258', '259'], 'once', 0.1));
  animMap.set(`push_${Direction.Left}`, new Animation(['260', '261', '262', '263', '264', '265'], 'once', 0.1));
  animMap.set(`push_${Direction.DownLeft}`, new Animation(['266', '267', '268', '269', '270', '271'], 'once', 0.1));

  // Push lean animations (first 3 frames of push, looped) — cardinal only
  animMap.set(`push_lean_${Direction.Down}`, new Animation(['224', '225', '226'], 'repeat', 0.15));
  animMap.set(`push_lean_${Direction.Right}`, new Animation(['236', '237', '238'], 'repeat', 0.15));
  animMap.set(`push_lean_${Direction.Up}`, new Animation(['248', '249', '250'], 'repeat', 0.15));
  animMap.set(`push_lean_${Direction.Left}`, new Animation(['260', '261', '262'], 'repeat', 0.15));

  animMap.set(`slide_${Direction.Down}`, new Animation(['320', '321', '322', '323', '324', '325'], 'once', 0.07));
  animMap.set(`slide_${Direction.DownRight}`, new Animation(['326', '327', '328', '329', '330', '331'], 'once', 0.07));
  animMap.set(`slide_${Direction.Right}`, new Animation(['332', '333', '334', '335', '336', '337'], 'once', 0.07));
  animMap.set(`slide_${Direction.UpRight}`, new Animation(['338', '339', '340', '341', '342', '343'], 'once', 0.07));
  animMap.set(`slide_${Direction.Up}`, new Animation(['344', '345', '346', '347', '348', '349'], 'once', 0.07));
  animMap.set(`slide_${Direction.UpLeft}`, new Animation(['350', '351', '352', '353', '354', '355'], 'once', 0.07));
  animMap.set(`slide_${Direction.Left}`, new Animation(['356', '357', '358', '359', '360', '361'], 'once', 0.07));
  animMap.set(`slide_${Direction.DownLeft}`, new Animation(['362', '363', '364', '365', '366', '367'], 'once', 0.07));

  animMap.set(`uppercut_${Direction.Down}`, new Animation(['368', '369', '370', '371', '372', '373', '374'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.DownRight}`, new Animation(['375', '376', '377', '378', '379', '380', '381'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.Right}`, new Animation(['382', '383', '384', '385', '386', '387', '388'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.UpRight}`, new Animation(['389', '390', '391', '392', '393', '394', '395'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.Up}`, new Animation(['396', '397', '398', '399', '400', '401', '402'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.UpLeft}`, new Animation(['403', '404', '405', '406', '407', '408', '409'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.Left}`, new Animation(['410', '411', '412', '413', '414', '415', '416'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.DownLeft}`, new Animation(['417', '418', '419', '420', '421', '422', '423'], 'once', 0.06));

  animMap.set(`throw_${Direction.Down}`, new Animation(['424', '425', '426', '427', '428', '429', '430'], 'once', 0.08));
  animMap.set(`throw_${Direction.DownRight}`, new Animation(['431', '432', '433', '434', '435', '436', '437'], 'once', 0.08));
  animMap.set(`throw_${Direction.Right}`, new Animation(['438', '439', '440', '441', '442', '443', '444'], 'once', 0.08));
  animMap.set(`throw_${Direction.UpRight}`, new Animation(['445', '446', '447', '448', '449', '450', '451'], 'once', 0.08));
  animMap.set(`throw_${Direction.Up}`, new Animation(['452', '453', '454', '455', '456', '457', '458'], 'once', 0.08));
  animMap.set(`throw_${Direction.UpLeft}`, new Animation(['459', '460', '461', '462', '463', '464', '465'], 'once', 0.08));
  animMap.set(`throw_${Direction.Left}`, new Animation(['466', '467', '468', '469', '470', '471', '472'], 'once', 0.08));
  animMap.set(`throw_${Direction.DownLeft}`, new Animation(['473', '474', '475', '476', '477', '478', '479'], 'once', 0.08));

  const animSystem = new AnimationSystem(animMap, `idle_${Direction.Down}`);
  entity.add(new AnimationComponent(animSystem, sprite));

  const input = entity.add(new InputComponent(scene));
  input.setGridAndEventManager(grid, eventManager);

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
    stopThreshold: PLAYER_STOP_THRESHOLD,
    levelData
  }));
  if (controlModeComp) {
    walk.setControlMode(controlModeComp);
  }

  const startCell = grid.worldToCell(x, y);
  entity.add(new GridPositionComponent(startCell.col, startCell.row, PLAYER_GRID_COLLISION_BOX));

  entity.add(new GridCollisionComponent(grid));

  if (blockedAreaManager) {
    entity.add(new BlockedAreaCollisionComponent({ blockedAreaManager }));
  }

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

  entity.add(new PetAbilityComponent());

  const stateMachine = new StateMachine(
    {
      idle: new PlayerIdleState(entity),
      walk: new PlayerWalkState(entity),
      death: new PlayerDeathState(entity, scene),
      push: new PlayerPushState(entity, grid),
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


  entity.add(new WaterEffectComponent(scene, levelData().background?.water?.splashParticle ?? 'water_splash'));

  entity.add(new WaterRippleComponent(scene, grid, levelData().background?.water?.rippleSpritesheet ?? 'water_ripple'));
  entity.add(new InteractionComponent(grid));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    ShadowComponent,
    ControlModeComponent,
    InputComponent,
    InteractionComponent,
    WalkComponent,
    GridCollisionComponent,
    BlockedAreaCollisionComponent,
    PetAbilityComponent,
    CollisionComponent,
    HealthComponent,
    MedipackHealerComponent,
    VignetteHealthComponent,
    HitFlashComponent,
    HudBarComponent,
    StateMachineComponent,
    AttackComboComponent,
    AnimationComponent,
    WaterRippleComponent,
    WaterEffectComponent,
  ]);

  grid.addOccupant(startCell.col, startCell.row, entity);

  return entity;
}
