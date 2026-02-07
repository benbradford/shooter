import type { Component } from '../../Component';
import { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import { EntityManager } from '../../EntityManager';
import { TransformComponent } from '../core/TransformComponent';
import { HealthComponent } from '../core/HealthComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { Pathfinder } from '../../../systems/Pathfinder';
import { LockOnIndicatorComponent } from '../ui/LockOnIndicatorComponent';
import { createRockEntity } from '../../entities/projectile/RockEntity';

const THROW_DAMAGE = 2;
const SLIDE_DAMAGE = 4;
const COMBO_TIMEOUT_MS = 1000;
const SLIDE_TIMEOUT_MS = 2000;
const ROCK_MAX_DISTANCE_PX = 400;
const ROCK_SPEED_PX_PER_SEC = 600;
const SLIDE_SPEED_PX_PER_SEC = 400;
const ROCK_FOV_RADIANS = Math.PI * 0.75;
const MAX_SLIDE_DISTANCE_CELLS = 3;
const MAX_SLIDE_DISTANCE_PX = 250;

type ComboPhase = 'idle' | 'throwObject' | 'slide';

export type AttackComboComponentProps = {
  scene: Phaser.Scene;
  grid: Grid;
  entityManager: EntityManager;
  getEnemies: () => Entity[];
}

export class AttackComboComponent implements Component {
  entity!: Entity;
  private currentPhase: ComboPhase = 'idle';
  private lockedTarget: Entity | null = null;
  private lockOnIndicator: Entity | null = null;
  private comboResetTimer: number = 0;
  private phaseTimer: number = 0;
  private rockEntity: Entity | null = null;
  private wasAttackPressed: boolean = false;
  private readonly scene: Phaser.Scene;
  private readonly grid: Grid;
  private readonly entityManager: EntityManager;
  private readonly getEnemies: () => Entity[];
  private readonly pathfinder: Pathfinder;

  constructor(props: AttackComboComponentProps) {
    this.scene = props.scene;
    this.grid = props.grid;
    this.entityManager = props.entityManager;
    this.getEnemies = props.getEnemies;
    this.pathfinder = new Pathfinder(props.grid);
  }

  update(delta: number): void {
    if (this.currentPhase === 'idle') {
      return;
    }

    if (this.currentPhase === 'throwObject') {
      if (this.lockedTarget?.isDestroyed) {
        this.resetCombo();
        return;
      }

      this.comboResetTimer += delta;
      if (this.comboResetTimer >= COMBO_TIMEOUT_MS) {
        this.resetCombo();
      }
    }

    if (this.currentPhase === 'slide') {
      if (this.lockedTarget?.isDestroyed) {
        this.resetCombo();
        return;
      }

      this.phaseTimer += delta;
      if (this.phaseTimer >= SLIDE_TIMEOUT_MS) {
        this.resetCombo();
        return;
      }

      this.updateSlidePhase(delta);
    }
  }

  tryAdvanceCombo(): void {
    if (this.currentPhase === 'throwObject' && this.lockedTarget) {
      if (this.wasAttackPressed) {
        return;
      }
      this.wasAttackPressed = true;
      this.startSlidePhase();
    }
  }

  checkAttackReleased(isPressed: boolean): void {
    if (!isPressed) {
      this.wasAttackPressed = false;
    }
  }

  private startSlidePhase(): void {
    if (!this.lockedTarget) return;

    const playerTransform = this.entity.get(TransformComponent);
    const enemyTransform = this.lockedTarget.get(TransformComponent);

    if (!playerTransform || !enemyTransform) {
      this.resetCombo();
      return;
    }

    const pixelDistance = Math.hypot(enemyTransform.x - playerTransform.x, enemyTransform.y - playerTransform.y);
    if (pixelDistance > MAX_SLIDE_DISTANCE_PX) {
      this.resetCombo();
      return;
    }

    const anim = this.entity.get(AnimationComponent);
    if (anim) {
      anim.animationSystem.play('slide');
    }

    this.currentPhase = 'slide';
    this.phaseTimer = 0;
  }

  private updateSlidePhase(delta: number): void {
    if (!this.lockedTarget) return;

    const playerTransform = this.entity.require(TransformComponent);
    const walk = this.entity.require(WalkComponent);
    const enemyTransform = this.lockedTarget.get(TransformComponent);
    if (!enemyTransform) {
      this.resetCombo();
      return;
    }

    const dx = enemyTransform.x - playerTransform.x;
    const dy = enemyTransform.y - playerTransform.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 64) {
      const health = this.lockedTarget.get(HealthComponent);
      if (health) {
        health.takeDamage(SLIDE_DAMAGE);
      }

      if (this.lockedTarget.isDestroyed) {
        this.resetCombo();
        return;
      }

      this.currentPhase = 'idle';
      this.comboResetTimer = 0;
      return;
    }

    const moveDistance = SLIDE_SPEED_PX_PER_SEC * (delta / 1000);
    playerTransform.x += (dx / distance) * moveDistance;
    playerTransform.y += (dy / distance) * moveDistance;
    walk.updateFacingDirection(dx / distance, dy / distance);
  }

  tryStartCombo(): void {
    if (this.currentPhase !== 'idle') {
      return;
    }

    if (this.wasAttackPressed) {
      return;
    }

    this.wasAttackPressed = true;

    const transform = this.entity.require(TransformComponent);
    const walk = this.entity.require(WalkComponent);
    const enemies = this.getEnemies();
    
    let nearestEnemy: Entity | null = null;
    let nearestDistance = ROCK_MAX_DISTANCE_PX;

    const facingAngle = Math.atan2(walk.lastMoveY, walk.lastMoveX);

    for (const enemy of enemies) {
      const enemyTransform = enemy.get(TransformComponent);
      if (!enemyTransform) continue;

      const dx = enemyTransform.x - transform.x;
      const dy = enemyTransform.y - transform.y;
      const distance = Math.hypot(dx, dy);

      if (distance < nearestDistance) {
        const angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = angleToEnemy - facingAngle;
        
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (Math.abs(angleDiff) <= ROCK_FOV_RADIANS / 2) {
          nearestEnemy = enemy;
          nearestDistance = distance;
        }
      }
    }

    const targetX = nearestEnemy 
      ? nearestEnemy.require(TransformComponent).x
      : transform.x + walk.lastMoveX * ROCK_MAX_DISTANCE_PX;
    const targetY = nearestEnemy
      ? nearestEnemy.require(TransformComponent).y
      : transform.y + walk.lastMoveY * ROCK_MAX_DISTANCE_PX;

    const gridPos = this.entity.require(GridPositionComponent);

    this.rockEntity = this.entityManager.add(createRockEntity({
      scene: this.scene,
      x: transform.x,
      y: transform.y,
      targetX,
      targetY,
      speed: ROCK_SPEED_PX_PER_SEC,
      maxDistance: ROCK_MAX_DISTANCE_PX,
      grid: this.grid,
      playerStartLayer: gridPos.currentLayer,
      onHit: (enemy) => {
        const health = enemy.get(HealthComponent);
        if (health) {
          health.takeDamage(THROW_DAMAGE);
        }

        if (!enemy.isDestroyed && this.canReachEnemy(enemy)) {
          this.lockedTarget = enemy;
          this.createLockOnIndicator(enemy);
        } else {
          this.resetCombo();
        }
      },
      onComplete: () => {
        this.rockEntity = null;
        if (!this.lockedTarget) {
          this.resetCombo();
        }
      }
    }));

    this.currentPhase = 'throwObject';
    this.comboResetTimer = 0;
  }

  private canReachEnemy(enemy: Entity): boolean {
    const playerTransform = this.entity.get(TransformComponent);
    const playerGridPos = this.entity.get(GridPositionComponent);
    const enemyTransform = enemy.get(TransformComponent);
    const enemyGridPos = enemy.get(GridPositionComponent);

    if (!playerTransform || !playerGridPos || !enemyTransform || !enemyGridPos) {
      return false;
    }

    const playerCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);
    const enemyCell = this.grid.worldToCell(enemyTransform.x, enemyTransform.y);

    const cellDistance = Math.abs(enemyCell.col - playerCell.col) + Math.abs(enemyCell.row - playerCell.row);
    if (cellDistance > MAX_SLIDE_DISTANCE_CELLS) {
      return false;
    }

    const pixelDistance = Math.hypot(enemyTransform.x - playerTransform.x, enemyTransform.y - playerTransform.y);
    if (pixelDistance > MAX_SLIDE_DISTANCE_PX) {
      return false;
    }

    const path = this.pathfinder.findPath(
      playerCell.col,
      playerCell.row,
      enemyCell.col,
      enemyCell.row,
      playerGridPos.currentLayer
    );

    return path !== null && path.length > 0;
  }

  private createLockOnIndicator(target: Entity): void {
    const indicator = new Entity('lock_on_indicator');
    indicator.add(new LockOnIndicatorComponent({
      scene: this.scene,
      targetEntity: target
    }));
    indicator.setUpdateOrder([LockOnIndicatorComponent]);
    this.lockOnIndicator = this.entityManager.add(indicator);
  }

  isMovementLocked(): boolean {
    return this.currentPhase === 'slide';
  }

  resetCombo(): void {
    this.currentPhase = 'idle';
    this.lockedTarget = null;
    this.comboResetTimer = 0;
    
    if (this.rockEntity && !this.rockEntity.isDestroyed) {
      this.rockEntity.destroy();
    }
    this.rockEntity = null;

    if (this.lockOnIndicator && !this.lockOnIndicator.isDestroyed) {
      this.lockOnIndicator.destroy();
    }
    this.lockOnIndicator = null;
  }

  onDestroy(): void {
    if (this.rockEntity && !this.rockEntity.isDestroyed) {
      this.rockEntity.destroy();
    }
    if (this.lockOnIndicator && !this.lockOnIndicator.isDestroyed) {
      this.lockOnIndicator.destroy();
    }
  }
}
