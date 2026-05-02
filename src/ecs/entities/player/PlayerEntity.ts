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
import { VoidJumpComponent } from '../../components/movement/VoidJumpComponent';
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

  animMap.set(`walk_${Direction.Down}`, new Animation(['503', '504', '505', '506'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.DownRight}`, new Animation(['507', '508', '509', '510'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.Right}`, new Animation(['511', '512', '513', '514'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.UpRight}`, new Animation(['515', '516', '517', '518'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.Up}`, new Animation(['519', '520', '521', '522'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.UpLeft}`, new Animation(['523', '524', '525', '526'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.Left}`, new Animation(['527', '528', '529', '530'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.DownLeft}`, new Animation(['531', '532', '533', '534'], 'repeat', 0.125));

  animMap.set(`run_${Direction.Down}`, new Animation(['351', '352', '353', '354', '355', '356'], 'repeat', 0.1));
  animMap.set(`run_${Direction.DownRight}`, new Animation(['357', '358', '359', '360', '361', '362'], 'repeat', 0.1));
  animMap.set(`run_${Direction.Right}`, new Animation(['363', '364', '365', '366', '367', '368'], 'repeat', 0.1));
  animMap.set(`run_${Direction.UpRight}`, new Animation(['369', '370', '371', '372', '373', '374'], 'repeat', 0.1));
  animMap.set(`run_${Direction.Up}`, new Animation(['375', '376', '377', '378', '379', '380'], 'repeat', 0.1));
  animMap.set(`run_${Direction.UpLeft}`, new Animation(['381', '382', '383', '384', '385', '386'], 'repeat', 0.1));
  animMap.set(`run_${Direction.Left}`, new Animation(['387', '388', '389', '390', '391', '392'], 'repeat', 0.1));
  animMap.set(`run_${Direction.DownLeft}`, new Animation(['393', '394', '395', '396', '397', '398'], 'repeat', 0.1));

  animMap.set(`swim_${Direction.Down}`, new Animation(['643', '644', '645', '646', '647', '648', '649'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.DownRight}`, new Animation(['650', '651', '652', '653', '654', '655', '656'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.Right}`, new Animation(['657', '658', '659', '660', '661', '662'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.UpRight}`, new Animation(['663', '664', '665', '666', '667', '668'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.Up}`, new Animation(['669', '670', '671', '672', '673', '674', '675'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.UpLeft}`, new Animation(['676', '677', '678', '679', '680', '681'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.Left}`, new Animation(['682', '683', '684', '685', '686', '687'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.DownLeft}`, new Animation(['688', '689', '690', '691', '692', '693', '694'], 'repeat', 0.125));

  animMap.set(`death_${Direction.Down}`, new Animation(['56', '57', '58', '59', '60', '61', '62'], 'once', 0.15));
  animMap.set(`death_${Direction.DownRight}`, new Animation(['63', '64', '65', '66', '67', '68', '69'], 'once', 0.15));
  animMap.set(`death_${Direction.Right}`, new Animation(['70', '71', '72', '73', '74', '75', '76'], 'once', 0.15));
  animMap.set(`death_${Direction.UpRight}`, new Animation(['77', '78', '79', '80', '81', '82', '83'], 'once', 0.15));
  animMap.set(`death_${Direction.Up}`, new Animation(['84', '85', '86', '87', '88', '89', '90'], 'once', 0.15));
  animMap.set(`death_${Direction.UpLeft}`, new Animation(['91', '92', '93', '94', '95', '96', '97'], 'once', 0.15));
  animMap.set(`death_${Direction.Left}`, new Animation(['98', '99', '100', '101', '102', '103', '104'], 'once', 0.15));
  animMap.set(`death_${Direction.DownLeft}`, new Animation(['105', '106', '107', '108', '109', '110', '111'], 'once', 0.15));

  animMap.set(`jump_takeoff_${Direction.Down}`, new Animation(['112', '113', '114'], 'once', 0.06));
  animMap.set(`jump_takeoff_${Direction.DownRight}`, new Animation(['121', '122', '123'], 'once', 0.06));
  animMap.set(`jump_takeoff_${Direction.Right}`, new Animation(['130', '131', '132'], 'once', 0.06));
  animMap.set(`jump_takeoff_${Direction.UpRight}`, new Animation(['139', '140', '141'], 'once', 0.06));
  animMap.set(`jump_takeoff_${Direction.Up}`, new Animation(['148', '149', '150'], 'once', 0.06));
  animMap.set(`jump_takeoff_${Direction.UpLeft}`, new Animation(['157', '158', '159'], 'once', 0.06));
  animMap.set(`jump_takeoff_${Direction.Left}`, new Animation(['166', '167', '168'], 'once', 0.06));
  animMap.set(`jump_takeoff_${Direction.DownLeft}`, new Animation(['175', '176', '177'], 'once', 0.06));

  animMap.set(`jump_flight_${Direction.Down}`, new Animation(['115', '116', '117'], 'repeat', 0.06));
  animMap.set(`jump_flight_${Direction.DownRight}`, new Animation(['124', '125', '126'], 'repeat', 0.06));
  animMap.set(`jump_flight_${Direction.Right}`, new Animation(['133', '134', '135'], 'repeat', 0.06));
  animMap.set(`jump_flight_${Direction.UpRight}`, new Animation(['142', '143', '144'], 'repeat', 0.06));
  animMap.set(`jump_flight_${Direction.Up}`, new Animation(['151', '152', '153'], 'repeat', 0.06));
  animMap.set(`jump_flight_${Direction.UpLeft}`, new Animation(['160', '161', '162'], 'repeat', 0.06));
  animMap.set(`jump_flight_${Direction.Left}`, new Animation(['169', '170', '171'], 'repeat', 0.06));
  animMap.set(`jump_flight_${Direction.DownLeft}`, new Animation(['178', '179', '180'], 'repeat', 0.06));

  animMap.set(`jump_land_${Direction.Down}`, new Animation(['118', '119', '120'], 'once', 0.06));
  animMap.set(`jump_land_${Direction.DownRight}`, new Animation(['127', '128', '129'], 'once', 0.06));
  animMap.set(`jump_land_${Direction.Right}`, new Animation(['136', '137', '138'], 'once', 0.06));
  animMap.set(`jump_land_${Direction.UpRight}`, new Animation(['145', '146', '147'], 'once', 0.06));
  animMap.set(`jump_land_${Direction.Up}`, new Animation(['154', '155', '156'], 'once', 0.06));
  animMap.set(`jump_land_${Direction.UpLeft}`, new Animation(['163', '164', '165'], 'once', 0.06));
  animMap.set(`jump_land_${Direction.Left}`, new Animation(['172', '173', '174'], 'once', 0.06));
  animMap.set(`jump_land_${Direction.DownLeft}`, new Animation(['181', '182', '183'], 'once', 0.06));

  animMap.set(`punch_${Direction.Down}`, new Animation(['8', '9', '10', '11', '12', '13'], 'once', 0.0415));
  animMap.set(`punch_${Direction.DownRight}`, new Animation(['14', '15', '16', '17', '18', '19'], 'once', 0.0415));
  animMap.set(`punch_${Direction.Right}`, new Animation(['20', '21', '22', '23', '24', '25'], 'once', 0.0415));
  animMap.set(`punch_${Direction.UpRight}`, new Animation(['26', '27', '28', '29', '30', '31'], 'once', 0.0415));
  animMap.set(`punch_${Direction.Up}`, new Animation(['32', '33', '34', '35', '36', '37'], 'once', 0.0415));
  animMap.set(`punch_${Direction.UpLeft}`, new Animation(['38', '39', '40', '41', '42', '43'], 'once', 0.0415));
  animMap.set(`punch_${Direction.Left}`, new Animation(['44', '45', '46', '47', '48', '49'], 'once', 0.0415));
  animMap.set(`punch_${Direction.DownLeft}`, new Animation(['50', '51', '52', '53', '54', '55'], 'once', 0.0415));

  animMap.set(`powerup_${Direction.Down}`, new Animation(['231', '232', '233', '234', '235', '236', '237', '238', '239'], 'once', 0.08));
  animMap.set(`powerup_${Direction.DownRight}`, new Animation(['240', '241', '242', '243', '244', '245', '246', '247', '248'], 'once', 0.08));
  animMap.set(`powerup_${Direction.Right}`, new Animation(['249', '250', '251', '252', '253', '254', '255', '256', '257'], 'once', 0.08));
  animMap.set(`powerup_${Direction.UpRight}`, new Animation(['258', '259', '260', '261', '262', '263', '264', '265', '266'], 'once', 0.08));
  animMap.set(`powerup_${Direction.Up}`, new Animation(['267', '268', '269', '270', '271', '272', '273', '274', '275'], 'once', 0.08));
  animMap.set(`powerup_${Direction.UpLeft}`, new Animation(['276', '277', '278', '279', '280', '281', '282', '283', '284'], 'once', 0.08));
  animMap.set(`powerup_${Direction.Left}`, new Animation(['285', '286', '287', '288', '289', '290', '291', '292', '293'], 'once', 0.08));
  animMap.set(`powerup_${Direction.DownLeft}`, new Animation(['294', '295', '296', '297', '298', '299', '300', '301', '302'], 'once', 0.08));

  animMap.set(`pickup_${Direction.Down}`, new Animation(['191', '192', '193', '194', '195'], 'once', 0.1));
  animMap.set(`pickup_${Direction.DownRight}`, new Animation(['196', '197', '198', '199', '200'], 'once', 0.1));
  animMap.set(`pickup_${Direction.Right}`, new Animation(['201', '202', '203', '204', '205'], 'once', 0.1));
  animMap.set(`pickup_${Direction.UpRight}`, new Animation(['206', '207', '208', '209', '210'], 'once', 0.1));
  animMap.set(`pickup_${Direction.Up}`, new Animation(['211', '212', '213', '214', '215'], 'once', 0.1));
  animMap.set(`pickup_${Direction.UpLeft}`, new Animation(['216', '217', '218', '219', '220'], 'once', 0.1));
  animMap.set(`pickup_${Direction.Left}`, new Animation(['221', '222', '223', '224', '225'], 'once', 0.1));
  animMap.set(`pickup_${Direction.DownLeft}`, new Animation(['226', '227', '228', '229', '230'], 'once', 0.1));

  animMap.set(`push_${Direction.Down}`, new Animation(['303', '304', '305', '306', '307', '308'], 'once', 0.1));
  animMap.set(`push_${Direction.DownRight}`, new Animation(['309', '310', '311', '312', '313', '314'], 'once', 0.1));
  animMap.set(`push_${Direction.Right}`, new Animation(['315', '316', '317', '318', '319', '320'], 'once', 0.1));
  animMap.set(`push_${Direction.UpRight}`, new Animation(['321', '322', '323', '324', '325', '326'], 'once', 0.1));
  animMap.set(`push_${Direction.Up}`, new Animation(['327', '328', '329', '330', '331', '332'], 'once', 0.1));
  animMap.set(`push_${Direction.UpLeft}`, new Animation(['333', '334', '335', '336', '337', '338'], 'once', 0.1));
  animMap.set(`push_${Direction.Left}`, new Animation(['339', '340', '341', '342', '343', '344'], 'once', 0.1));
  animMap.set(`push_${Direction.DownLeft}`, new Animation(['345', '346', '347', '348', '349', '350'], 'once', 0.1));

  // Push lean animations (first 3 frames of push, looped) — cardinal only
  animMap.set(`push_lean_${Direction.Down}`, new Animation(['303', '304', '305'], 'repeat', 0.15));
  animMap.set(`push_lean_${Direction.Right}`, new Animation(['315', '316', '317'], 'repeat', 0.15));
  animMap.set(`push_lean_${Direction.Up}`, new Animation(['327', '328', '329'], 'repeat', 0.15));
  animMap.set(`push_lean_${Direction.Left}`, new Animation(['339', '340', '341'], 'repeat', 0.15));

  animMap.set(`slide_${Direction.Down}`, new Animation(['399', '400', '401', '402', '403', '404'], 'once', 0.07));
  animMap.set(`slide_${Direction.DownRight}`, new Animation(['405', '406', '407', '408', '409', '410'], 'once', 0.07));
  animMap.set(`slide_${Direction.Right}`, new Animation(['411', '412', '413', '414', '415', '416'], 'once', 0.07));
  animMap.set(`slide_${Direction.UpRight}`, new Animation(['417', '418', '419', '420', '421', '422'], 'once', 0.07));
  animMap.set(`slide_${Direction.Up}`, new Animation(['423', '424', '425', '426', '427', '428'], 'once', 0.07));
  animMap.set(`slide_${Direction.UpLeft}`, new Animation(['429', '430', '431', '432', '433', '434'], 'once', 0.07));
  animMap.set(`slide_${Direction.Left}`, new Animation(['435', '436', '437', '438', '439', '440'], 'once', 0.07));
  animMap.set(`slide_${Direction.DownLeft}`, new Animation(['441', '442', '443', '444', '445', '446'], 'once', 0.07));

  animMap.set(`uppercut_${Direction.Down}`, new Animation(['447', '448', '449', '450', '451', '452', '453'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.DownRight}`, new Animation(['454', '455', '456', '457', '458', '459', '460'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.Right}`, new Animation(['461', '462', '463', '464', '465', '466', '467'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.UpRight}`, new Animation(['468', '469', '470', '471', '472', '473', '474'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.Up}`, new Animation(['475', '476', '477', '478', '479', '480', '481'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.UpLeft}`, new Animation(['482', '483', '484', '485', '486', '487', '488'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.Left}`, new Animation(['489', '490', '491', '492', '493', '494', '495'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.DownLeft}`, new Animation(['496', '497', '498', '499', '500', '501', '502'], 'once', 0.06));

  animMap.set(`throw_${Direction.Down}`, new Animation(['535', '536', '537', '538', '539', '540', '541'], 'once', 0.08));
  animMap.set(`throw_${Direction.DownRight}`, new Animation(['542', '543', '544', '545', '546', '547', '548'], 'once', 0.08));
  animMap.set(`throw_${Direction.Right}`, new Animation(['549', '550', '551', '552', '553', '554', '555'], 'once', 0.08));
  animMap.set(`throw_${Direction.UpRight}`, new Animation(['556', '557', '558', '559', '560', '561', '562'], 'once', 0.08));
  animMap.set(`throw_${Direction.Up}`, new Animation(['563', '564', '565', '566', '567', '568', '569'], 'once', 0.08));
  animMap.set(`throw_${Direction.UpLeft}`, new Animation(['570', '571', '572', '573', '574', '575', '576'], 'once', 0.08));
  animMap.set(`throw_${Direction.Left}`, new Animation(['577', '578', '579', '580', '581', '582', '583'], 'once', 0.08));
  animMap.set(`throw_${Direction.DownLeft}`, new Animation(['584', '585', '586', '587', '588', '589', '590'], 'once', 0.08));

  // Fall animation (south-facing only) — Landing
  animMap.set(`fall_${Direction.Down}`, new Animation(['184', '185', '186', '187', '188', '189', '190'], 'once', 0.1));

  animMap.set(`walking_punch_${Direction.Down}`, new Animation(['695', '696', '697', '698', '699'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.DownRight}`, new Animation(['700', '701', '702', '703', '704'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.Right}`, new Animation(['705', '706', '707', '708', '709'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.UpRight}`, new Animation(['710', '711', '712', '713', '714'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.Up}`, new Animation(['715', '716', '717', '718', '719'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.UpLeft}`, new Animation(['720', '721', '722', '723', '724'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.Left}`, new Animation(['725', '726', '727', '728', '729'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.DownLeft}`, new Animation(['730', '731', '732', '733', '734'], 'repeat', 0.1));

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
  entity.add(new VoidJumpComponent({ grid, scene }));

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

  health.setOnDeath(() => {
    stateMachine.enter('death');
  });

  entity.tags.add('player');
  entity.add(new CollisionComponent({
    box: PLAYER_ENTITY_COLLISION_BOX,
    collidesWith: ['enemy_projectile', 'enemy'],
    onHit: (other) => {
      if (other.tags.has('enemy_projectile')) {
        const damage = other.require(DamageComponent);
        health.takeDamage(damage.damage);

        if (health.getHealth() > 0) {
          const hitFlash = entity.require(HitFlashComponent);
          hitFlash.flash(300);
        }
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
    VoidJumpComponent,
  ]);

  grid.addOccupant(startCell.col, startCell.row, entity);

  return entity;
}
