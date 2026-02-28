import { Entity } from '../../Entity';
import { DEPTH_ENEMY_FLYING } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { SpawnSmokeComponent } from '../../components/visual/SpawnSmokeComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { ProjectileComponent } from '../../components/combat/ProjectileComponent';
import { StateMachine } from '../../../systems/state/StateMachine';
import { ThrowerSpawningState } from './ThrowerSpawningState';
import { ThrowerIdleState } from './ThrowerIdleState';
import { ThrowerRunningState } from './ThrowerRunningState';
import { ThrowerThrowingState } from './ThrowerThrowingState';
import { ThrowerHitState } from './ThrowerHitState';
import { ThrowerDeathState } from './ThrowerDeathState';
import { getThrowerDifficultyConfig, type ThrowerDifficulty } from './ThrowerDifficultyConfig';
import { canPlayerHitEnemy } from '../../../systems/combat/LayerCollisionHelper';
import type { Grid } from '../../../systems/grid/Grid';

const THROWER_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 16, width: 32, height: 16 };
const THROWER_ENTITY_COLLISION_BOX = { offsetX: -16, offsetY: -30, width: 32, height: 60 };
const THROWER_SCALE = 1.5;
const KNOCKBACK_FRICTION = 0.92;
const KNOCKBACK_DURATION_MS = 500;
const KNOCKBACK_FORCE = 200;
const BULLET_DAMAGE = 10;

export type CreateThrowerProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  playerEntity: Entity;
  difficulty: ThrowerDifficulty;
  entityId: string;
  onThrow: (x: number, y: number, dirX: number, dirY: number, throwDistancePx: number, throwSpeedPxPerSec: number) => void;
}

export function createThrowerEntity(props: CreateThrowerProps): Entity {
  const { scene, col, row, grid, playerEntity, difficulty, entityId, onThrow } = props;
  const config = getThrowerDifficultyConfig(difficulty);

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const entity = new Entity(entityId);
  entity.tags.add('enemy');

  const transform = entity.add(new TransformComponent(x, y, 0, THROWER_SCALE));

  const sprite = entity.add(new SpriteComponent(scene, 'thrower', transform));
  sprite.sprite.setDepth(DEPTH_ENEMY_FLYING);

  entity.add(new SpawnSmokeComponent(scene, x, y));

  const shadow = entity.add(new ShadowComponent(scene, {
    scale: THROWER_SCALE * 0.75,
    offsetX: 0,
    offsetY: 30
  }));
  shadow.init();

  entity.add(new GridPositionComponent(col, row, THROWER_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new DifficultyComponent(difficulty));
  entity.add(new HealthComponent({ maxHealth: config.health }));
  entity.add(new HitFlashComponent());
  entity.add(new KnockbackComponent(KNOCKBACK_FRICTION, KNOCKBACK_DURATION_MS, grid));

  let lastHitDirX = 0;
  let lastHitDirY = -1;

  entity.add(new CollisionComponent({
    box: THROWER_ENTITY_COLLISION_BOX,
    collidesWith: ['player_projectile', 'player'],
    onHit: (other) => {
      if (other.tags.has('player')) {
        const transform = entity.require(TransformComponent);
        const otherTransform = other.require(TransformComponent);
        const knockback = entity.require(KnockbackComponent);
        
        const dx = transform.x - otherTransform.x;
        const dy = transform.y - otherTransform.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > 0 && !knockback.isActive) {
          const dirX = dx / distance;
          const dirY = dy / distance;
          knockback.applyKnockback(dirX, dirY, 250);
        }
        return;
      }
      
      if (other.tags.has('player_projectile')) {
        if (!canPlayerHitEnemy(playerEntity, entity, grid)) {
          return;
        }

        const health = entity.require(HealthComponent);
        health.takeDamage(BULLET_DAMAGE);

        const projectile = other.get(ProjectileComponent);
        if (projectile) {
          const length = Math.hypot(projectile.dirX, projectile.dirY);
          lastHitDirX = projectile.dirX / length;
          lastHitDirY = projectile.dirY / length;

          const knockback = entity.get(KnockbackComponent);
          if (knockback) {
            knockback.applyKnockback(lastHitDirX, lastHitDirY, KNOCKBACK_FORCE);
          }
        }

        const hitFlash = entity.get(HitFlashComponent);
        if (hitFlash) {
          hitFlash.flash(300);
        }

        if (health.getHealth() <= 0) {
          const stateMachine = entity.require(StateMachineComponent);
          stateMachine.stateMachine.enter('death');
        } else {
          const stateMachine = entity.require(StateMachineComponent);
          stateMachine.stateMachine.enter('hit');
        }
      }
    }
  }));

  const stateMachine = new StateMachine({
    spawning: new ThrowerSpawningState(entity),
    idle: new ThrowerIdleState(entity, playerEntity),
    running: new ThrowerRunningState(entity, playerEntity, grid),
    throwing: new ThrowerThrowingState(entity, playerEntity, onThrow),
    hit: new ThrowerHitState(entity),
    death: new ThrowerDeathState(entity, lastHitDirX, lastHitDirY)
  }, 'spawning');

  entity.add(new StateMachineComponent(stateMachine));

  entity.setUpdateOrder([
    SpawnSmokeComponent,
    TransformComponent,
    HitFlashComponent,
    SpriteComponent,
    ShadowComponent,
    GridPositionComponent,
    GridCollisionComponent,
    KnockbackComponent,
    StateMachineComponent,
    CollisionComponent
  ]);

  return entity;
}
