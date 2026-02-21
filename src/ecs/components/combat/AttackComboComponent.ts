import type { Component } from '../../Component';
import { Entity } from '../../Entity';
import { EntityManager } from '../../EntityManager';
import { TransformComponent } from '../core/TransformComponent';
import { HealthComponent } from '../core/HealthComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { createPunchProjectileEntity } from '../../entities/projectile/PunchProjectileEntity';
import { PunchParticlesComponent } from '../visual/PunchParticlesComponent';

const PUNCH_DAMAGE = 20;
const PUNCH_RANGE_PX = 128;
const PUNCH_DURATION_MS = 500;
const PUNCH_FOV_RADIANS = Math.PI * 0.6;
const PUNCH_HITBOX_DELAY_MS = 150;

let mustFaceEnemy = true;

export function toggleMustFaceEnemy(): boolean {
  mustFaceEnemy = !mustFaceEnemy;
  console.log('[PUNCH] Must face enemy:', mustFaceEnemy);
  return mustFaceEnemy;
}

export function getMustFaceEnemy(): boolean {
  return mustFaceEnemy;
}

type ComboPhase = 'idle' | 'punch';

export type AttackComboComponentProps = {
  scene: Phaser.Scene;
  entityManager: EntityManager;
  getEnemies: () => Entity[];
}

export class AttackComboComponent implements Component {
  entity!: Entity;
  private currentPhase: ComboPhase = 'idle';
  private phaseTimer: number = 0;
  private wasAttackPressed: boolean = false;
  private hitboxCreated: boolean = false;
  private isHoldingAttack: boolean = false;
  private punchCount: number = 0;
  private readonly scene: Phaser.Scene;
  private readonly entityManager: EntityManager;
  private readonly getEnemies: () => Entity[];

  constructor(props: AttackComboComponentProps) {
    this.scene = props.scene;
    this.entityManager = props.entityManager;
    this.getEnemies = props.getEnemies;
  }

  update(delta: number): void {
    const health = this.entity.require(HealthComponent);
    const hasOverheal = health.isOverhealed();
    const punchDuration = hasOverheal ? PUNCH_DURATION_MS / 2 : PUNCH_DURATION_MS;
    const animSpeed = hasOverheal ? 2 : 1;

    if (this.currentPhase === 'punch') {
      this.phaseTimer += delta;

      if (!this.hitboxCreated && this.phaseTimer >= PUNCH_HITBOX_DELAY_MS) {
        this.hitboxCreated = true;
        this.createPunchHitbox();
      }

      if (this.phaseTimer >= punchDuration) {
        if (this.isHoldingAttack) {
          this.phaseTimer = 0;
          this.hitboxCreated = false;
          this.punchCount++;

          const walk = this.entity.get(WalkComponent);
          const anim = this.entity.get(AnimationComponent);
          if (walk && anim) {
            anim.animationSystem.play(`punch_${walk.lastDir}`, animSpeed);
          }
        } else {
          this.currentPhase = 'idle';
          this.phaseTimer = 0;
          this.hitboxCreated = false;
          this.punchCount = 0;

          const walk = this.entity.get(WalkComponent);
          const anim = this.entity.get(AnimationComponent);
          if (walk && anim) {
            const animKey = walk.isMoving() ? `walk_${walk.lastDir}` : `idle_${walk.lastDir}`;
            anim.animationSystem.play(animKey);
          }
        }
      }
    }
  }

  private createPunchHitbox(): void {
    const transform = this.entity.require(TransformComponent);
    const walk = this.entity.require(WalkComponent);
    const enemies = this.getEnemies();

    let nearestEnemy: Entity | null = null;
    let nearestDistance = PUNCH_RANGE_PX;

    const facingAngle = Math.atan2(walk.lastMoveY, walk.lastMoveX);

    for (const enemy of enemies) {
      const enemyTransform = enemy.get(TransformComponent);
      if (!enemyTransform) continue;

      const dx = enemyTransform.x - transform.x;
      const dy = enemyTransform.y - transform.y;
      const distance = Math.hypot(dx, dy);

      if (distance < nearestDistance) {
        if (mustFaceEnemy) {
          const angleToEnemy = Math.atan2(dy, dx);
          let angleDiff = angleToEnemy - facingAngle;

          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

          if (Math.abs(angleDiff) <= PUNCH_FOV_RADIANS / 2) {
            nearestEnemy = enemy;
            nearestDistance = distance;
          }
        } else {
          nearestEnemy = enemy;
          nearestDistance = distance;
        }
      }
    }

    let dirX = walk.lastMoveX;
    let dirY = walk.lastMoveY;

    if (nearestEnemy) {
      const enemyTransform = nearestEnemy.require(TransformComponent);
      const dx = enemyTransform.x - transform.x;
      const dy = enemyTransform.y - transform.y;
      const length = Math.hypot(dx, dy);
      dirX = dx / length;
      dirY = dy / length;
    }

    const punchStartX = transform.x + dirX * 30;
    const punchStartY = transform.y + dirY * 30;

    this.entityManager.add(createPunchProjectileEntity({
      scene: this.scene,
      x: punchStartX,
      y: punchStartY,
      dirX,
      dirY,
      playerEntity: this.entity,
      damage: PUNCH_DAMAGE
    }));

    const walkComp = this.entity.require(WalkComponent);
    const particleEntity = new Entity('punch_particles');
    particleEntity.add(new PunchParticlesComponent(this.scene, punchStartX, punchStartY, dirX, dirY, walkComp.lastDir, this.entity));
    this.entityManager.add(particleEntity);
  }

  tryStartPunch(): void {
    if (this.currentPhase !== 'idle') {
      return;
    }

    if (this.wasAttackPressed) {
      return;
    }

    this.wasAttackPressed = true;

    const transform = this.entity.require(TransformComponent);
    const walk = this.entity.require(WalkComponent);
    const health = this.entity.require(HealthComponent);
    const enemies = this.getEnemies();

    let nearestEnemy: Entity | null = null;
    let nearestDistance = PUNCH_RANGE_PX;

    const facingAngle = Math.atan2(walk.lastMoveY, walk.lastMoveX);

    for (const enemy of enemies) {
      const enemyTransform = enemy.get(TransformComponent);
      if (!enemyTransform) continue;

      const dx = enemyTransform.x - transform.x;
      const dy = enemyTransform.y - transform.y;
      const distance = Math.hypot(dx, dy);

      if (distance < nearestDistance) {
        if (mustFaceEnemy) {
          const angleToEnemy = Math.atan2(dy, dx);
          let angleDiff = angleToEnemy - facingAngle;

          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

          if (Math.abs(angleDiff) <= PUNCH_FOV_RADIANS / 2) {
            nearestEnemy = enemy;
            nearestDistance = distance;
          }
        } else {
          nearestEnemy = enemy;
          nearestDistance = distance;
        }
      }
    }

    if (nearestEnemy) {
      const enemyTransform = nearestEnemy.require(TransformComponent);
      const dx = enemyTransform.x - transform.x;
      const dy = enemyTransform.y - transform.y;
      walk.updateFacingDirection(dx, dy);
    }

    const anim = this.entity.get(AnimationComponent);
    if (anim) {
      const animSpeed = health.isOverhealed() ? 2 : 1;
      anim.animationSystem.play(`punch_${walk.lastDir}`, animSpeed);
    }

    this.currentPhase = 'punch';
    this.phaseTimer = 0;
    this.hitboxCreated = false;
    this.punchCount = 0;
  }

  checkAttackReleased(isPressed: boolean): void {
    this.isHoldingAttack = isPressed;

    if (!isPressed) {
      this.wasAttackPressed = false;
      this.punchCount = 0;
    }
  }

  isPunching(): boolean {
    return this.currentPhase === 'punch';
  }

  isMovementLocked(): boolean {
    return this.currentPhase === 'punch' && this.punchCount > 0;
  }

  onDestroy(): void {
    // No cleanup needed
  }
}
