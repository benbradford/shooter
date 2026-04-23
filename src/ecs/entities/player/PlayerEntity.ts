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

  animMap.set(`walk_${Direction.Down}`, new Animation(['431', '432', '433', '434'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.DownRight}`, new Animation(['435', '436', '437', '438'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.Right}`, new Animation(['439', '440', '441', '442'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.UpRight}`, new Animation(['443', '444', '445', '446'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.Up}`, new Animation(['447', '448', '449', '450'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.UpLeft}`, new Animation(['451', '452', '453', '454'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.Left}`, new Animation(['455', '456', '457', '458'], 'repeat', 0.125));
  animMap.set(`walk_${Direction.DownLeft}`, new Animation(['459', '460', '461', '462'], 'repeat', 0.125));

  animMap.set(`run_${Direction.Down}`, new Animation(['279', '280', '281', '282', '283', '284'], 'repeat', 0.1));
  animMap.set(`run_${Direction.DownRight}`, new Animation(['285', '286', '287', '288', '289', '290'], 'repeat', 0.1));
  animMap.set(`run_${Direction.Right}`, new Animation(['291', '292', '293', '294', '295', '296'], 'repeat', 0.1));
  animMap.set(`run_${Direction.UpRight}`, new Animation(['297', '298', '299', '300', '301', '302'], 'repeat', 0.1));
  animMap.set(`run_${Direction.Up}`, new Animation(['303', '304', '305', '306', '307', '308'], 'repeat', 0.1));
  animMap.set(`run_${Direction.UpLeft}`, new Animation(['309', '310', '311', '312', '313', '314'], 'repeat', 0.1));
  animMap.set(`run_${Direction.Left}`, new Animation(['315', '316', '317', '318', '319', '320'], 'repeat', 0.1));
  animMap.set(`run_${Direction.DownLeft}`, new Animation(['321', '322', '323', '324', '325', '326'], 'repeat', 0.1));

  animMap.set(`swim_${Direction.Down}`, new Animation(['575', '576', '577', '578', '579', '580', '581'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.DownRight}`, new Animation(['582', '583', '584', '585', '586', '587', '588'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.Right}`, new Animation(['589', '590', '591', '592', '593', '594', '595'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.UpRight}`, new Animation(['596', '597', '598', '599', '600', '601', '602'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.Up}`, new Animation(['603', '604', '605', '606', '607', '608', '609'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.UpLeft}`, new Animation(['610', '611', '612', '613', '614', '615', '616'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.Left}`, new Animation(['617', '618', '619', '620', '621', '622', '623'], 'repeat', 0.125));
  animMap.set(`swim_${Direction.DownLeft}`, new Animation(['624', '625', '626', '627', '628', '629', '630'], 'repeat', 0.125));

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

  animMap.set(`powerup_${Direction.Down}`, new Animation(['159', '160', '161', '162', '163', '164', '165', '166', '167'], 'once', 0.08));
  animMap.set(`powerup_${Direction.DownRight}`, new Animation(['168', '169', '170', '171', '172', '173', '174', '175', '176'], 'once', 0.08));
  animMap.set(`powerup_${Direction.Right}`, new Animation(['177', '178', '179', '180', '181', '182', '183', '184', '185'], 'once', 0.08));
  animMap.set(`powerup_${Direction.UpRight}`, new Animation(['186', '187', '188', '189', '190', '191', '192', '193', '194'], 'once', 0.08));
  animMap.set(`powerup_${Direction.Up}`, new Animation(['195', '196', '197', '198', '199', '200', '201', '202', '203'], 'once', 0.08));
  animMap.set(`powerup_${Direction.UpLeft}`, new Animation(['204', '205', '206', '207', '208', '209', '210', '211', '212'], 'once', 0.08));
  animMap.set(`powerup_${Direction.Left}`, new Animation(['213', '214', '215', '216', '217', '218', '219', '220', '221'], 'once', 0.08));
  animMap.set(`powerup_${Direction.DownLeft}`, new Animation(['222', '223', '224', '225', '226', '227', '228', '229', '230'], 'once', 0.08));

  animMap.set(`pickup_${Direction.Down}`, new Animation(['119', '120', '121', '122', '123'], 'once', 0.1));
  animMap.set(`pickup_${Direction.DownRight}`, new Animation(['124', '125', '126', '127', '128'], 'once', 0.1));
  animMap.set(`pickup_${Direction.Right}`, new Animation(['129', '130', '131', '132', '133'], 'once', 0.1));
  animMap.set(`pickup_${Direction.UpRight}`, new Animation(['134', '135', '136', '137', '138'], 'once', 0.1));
  animMap.set(`pickup_${Direction.Up}`, new Animation(['139', '140', '141', '142', '143'], 'once', 0.1));
  animMap.set(`pickup_${Direction.UpLeft}`, new Animation(['144', '145', '146', '147', '148'], 'once', 0.1));
  animMap.set(`pickup_${Direction.Left}`, new Animation(['149', '150', '151', '152', '153'], 'once', 0.1));
  animMap.set(`pickup_${Direction.DownLeft}`, new Animation(['154', '155', '156', '157', '158'], 'once', 0.1));

  animMap.set(`push_${Direction.Down}`, new Animation(['231', '232', '233', '234', '235', '236'], 'once', 0.1));
  animMap.set(`push_${Direction.DownRight}`, new Animation(['237', '238', '239', '240', '241', '242'], 'once', 0.1));
  animMap.set(`push_${Direction.Right}`, new Animation(['243', '244', '245', '246', '247', '248'], 'once', 0.1));
  animMap.set(`push_${Direction.UpRight}`, new Animation(['249', '250', '251', '252', '253', '254'], 'once', 0.1));
  animMap.set(`push_${Direction.Up}`, new Animation(['255', '256', '257', '258', '259', '260'], 'once', 0.1));
  animMap.set(`push_${Direction.UpLeft}`, new Animation(['261', '262', '263', '264', '265', '266'], 'once', 0.1));
  animMap.set(`push_${Direction.Left}`, new Animation(['267', '268', '269', '270', '271', '272'], 'once', 0.1));
  animMap.set(`push_${Direction.DownLeft}`, new Animation(['273', '274', '275', '276', '277', '278'], 'once', 0.1));

  // Push lean animations (first 3 frames of push, looped) — cardinal only
  animMap.set(`push_lean_${Direction.Down}`, new Animation(['231', '232', '233'], 'repeat', 0.15));
  animMap.set(`push_lean_${Direction.Right}`, new Animation(['243', '244', '245'], 'repeat', 0.15));
  animMap.set(`push_lean_${Direction.Up}`, new Animation(['255', '256', '257'], 'repeat', 0.15));
  animMap.set(`push_lean_${Direction.Left}`, new Animation(['267', '268', '269'], 'repeat', 0.15));

  animMap.set(`slide_${Direction.Down}`, new Animation(['327', '328', '329', '330', '331', '332'], 'once', 0.07));
  animMap.set(`slide_${Direction.DownRight}`, new Animation(['333', '334', '335', '336', '337', '338'], 'once', 0.07));
  animMap.set(`slide_${Direction.Right}`, new Animation(['339', '340', '341', '342', '343', '344'], 'once', 0.07));
  animMap.set(`slide_${Direction.UpRight}`, new Animation(['345', '346', '347', '348', '349', '350'], 'once', 0.07));
  animMap.set(`slide_${Direction.Up}`, new Animation(['351', '352', '353', '354', '355', '356'], 'once', 0.07));
  animMap.set(`slide_${Direction.UpLeft}`, new Animation(['357', '358', '359', '360', '361', '362'], 'once', 0.07));
  animMap.set(`slide_${Direction.Left}`, new Animation(['363', '364', '365', '366', '367', '368'], 'once', 0.07));
  animMap.set(`slide_${Direction.DownLeft}`, new Animation(['369', '370', '371', '372', '373', '374'], 'once', 0.07));

  animMap.set(`uppercut_${Direction.Down}`, new Animation(['375', '376', '377', '378', '379', '380', '381'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.DownRight}`, new Animation(['382', '383', '384', '385', '386', '387', '388'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.Right}`, new Animation(['389', '390', '391', '392', '393', '394', '395'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.UpRight}`, new Animation(['396', '397', '398', '399', '400', '401', '402'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.Up}`, new Animation(['403', '404', '405', '406', '407', '408', '409'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.UpLeft}`, new Animation(['410', '411', '412', '413', '414', '415', '416'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.Left}`, new Animation(['417', '418', '419', '420', '421', '422', '423'], 'once', 0.06));
  animMap.set(`uppercut_${Direction.DownLeft}`, new Animation(['424', '425', '426', '427', '428', '429', '430'], 'once', 0.06));

  animMap.set(`throw_${Direction.Down}`, new Animation(['463', '464', '465', '466', '467', '468', '469'], 'once', 0.08));
  animMap.set(`throw_${Direction.DownRight}`, new Animation(['470', '471', '472', '473', '474', '475', '476'], 'once', 0.08));
  animMap.set(`throw_${Direction.Right}`, new Animation(['477', '478', '479', '480', '481', '482', '483'], 'once', 0.08));
  animMap.set(`throw_${Direction.UpRight}`, new Animation(['484', '485', '486', '487', '488', '489', '490'], 'once', 0.08));
  animMap.set(`throw_${Direction.Up}`, new Animation(['491', '492', '493', '494', '495', '496', '497'], 'once', 0.08));
  animMap.set(`throw_${Direction.UpLeft}`, new Animation(['498', '499', '500', '501', '502', '503', '504'], 'once', 0.08));
  animMap.set(`throw_${Direction.Left}`, new Animation(['505', '506', '507', '508', '509', '510', '511'], 'once', 0.08));
  animMap.set(`throw_${Direction.DownLeft}`, new Animation(['512', '513', '514', '515', '516', '517', '518'], 'once', 0.08));

  // Fall animation (south-facing only) — Landing
  animMap.set(`fall_${Direction.Down}`, new Animation(['112', '113', '114', '115', '116', '117', '118'], 'once', 0.1));

  animMap.set(`walking_punch_${Direction.Down}`, new Animation(['631', '632', '633', '634', '635'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.DownRight}`, new Animation(['636', '637', '638', '639', '640'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.Right}`, new Animation(['641', '642', '643', '644', '645'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.UpRight}`, new Animation(['646', '647', '648', '649', '650'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.Up}`, new Animation(['651', '652', '653', '654', '655'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.UpLeft}`, new Animation(['656', '657', '658', '659', '660'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.Left}`, new Animation(['661', '662', '663', '664', '665'], 'repeat', 0.1));
  animMap.set(`walking_punch_${Direction.DownLeft}`, new Animation(['666', '667', '668', '669', '670'], 'repeat', 0.1));

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
  ]);

  grid.addOccupant(startCell.col, startCell.row, entity);

  return entity;
}
