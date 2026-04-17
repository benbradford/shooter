import type { Component } from '../../Component';
import { Entity } from '../../Entity';
import { EntityManager } from '../../EntityManager';
import { TransformComponent } from '../core/TransformComponent';
import { HealthComponent } from '../core/HealthComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { createPunchProjectileEntity } from '../../entities/projectile/PunchProjectileEntity';
import { PunchParticlesComponent } from '../visual/PunchParticlesComponent';

const PUNCH_DAMAGE = 20;
const PUNCH_RANGE_PX = 128;
const PUNCH_DURATION_MS = 500;
const PUNCH_FOV_RADIANS = Math.PI * 0.6;
const PUNCH_HITBOX_DELAY_MS = 170;

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

const HOLD_FRAME_INDEX = 4;

const SHAKE_INTENSITY_PX = 1.5;

export class AttackComboComponent implements Component {
  entity!: Entity;
  private currentPhase: ComboPhase = 'idle';
  private phaseTimer: number = 0;
  private wasAttackPressed: boolean = false;
  private hitboxCreated: boolean = false;
  private isHoldingAttack: boolean = false;
  private isHoldingPunch: boolean = false;
  private lastHoldDir: number = -1;
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

    if (this.currentPhase === 'punch') {
      const anim = this.entity.get(AnimationComponent);
      const walk = this.entity.get(WalkComponent);
      const currentAnim = anim?.animationSystem.getCurrentAnimation();

      // Hold phase: freeze on frame 5, allow direction changes
      if (this.isHoldingPunch) {
        if (this.isHoldingAttack) {
          // Still holding — shake + allow direction changes
          const sprite = this.entity.get(SpriteComponent);
          if (sprite) {
            sprite.sprite.x += (Math.random() - 0.5) * SHAKE_INTENSITY_PX * 2;
            sprite.sprite.y += (Math.random() - 0.5) * SHAKE_INTENSITY_PX * 2;
          }
          if (walk && anim && walk.lastDir !== this.lastHoldDir) {
            this.lastHoldDir = walk.lastDir;
            anim.animationSystem.play(`punch_${walk.lastDir}`);
            anim.animationSystem.getCurrentAnimation()?.setIndex(HOLD_FRAME_INDEX);
            anim.animationSystem.setTimeScale(0);
          }
          return;
        }
        // Released — create hitbox + particles, resume animation
        this.isHoldingPunch = false;
        this.hitboxCreated = true;
        this.phaseTimer = 0;
        this.createPunchHitbox();
        const animSpeed = hasOverheal ? 2 : 1;
        anim?.animationSystem.setTimeScale(animSpeed);
        return;
      }

      this.phaseTimer += delta;

      // Check if we should enter hold phase
      if (this.isHoldingAttack && currentAnim && currentAnim.getIndex() >= HOLD_FRAME_INDEX) {
        this.isHoldingPunch = true;
        currentAnim.setIndex(HOLD_FRAME_INDEX);
        anim!.animationSystem.setTimeScale(0);
        if (walk) this.lastHoldDir = walk.lastDir;
        return;
      }

      // Quick tap — released before hold frame, do normal punch
      if (!this.isHoldingAttack && !this.hitboxCreated && this.phaseTimer >= PUNCH_HITBOX_DELAY_MS) {
        this.hitboxCreated = true;
        this.createPunchHitbox();
      }

      if (this.phaseTimer >= punchDuration) {
        this.currentPhase = 'idle';
        this.phaseTimer = 0;
        this.hitboxCreated = false;
        this.isHoldingPunch = false;

        if (walk && anim) {
          const animKey = walk.isMoving() ? `walk_${walk.lastDir}` : `idle_${walk.lastDir}`;
          anim.animationSystem.play(animKey);
        }
      }
    }
  }

  private createPunchHitbox(): void {
    const punchSounds = ['punch1', 'punch2', 'punch3'];
    this.scene.sound.play(punchSounds[Math.floor(Math.random() * punchSounds.length)]);

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
    this.isHoldingPunch = false;
  }

  checkAttackReleased(isPressed: boolean): void {
    this.isHoldingAttack = isPressed;

    if (!isPressed) {
      this.wasAttackPressed = false;
    }
  }

  isPunching(): boolean {
    return this.currentPhase === 'punch';
  }

  isMovementLocked(): boolean {
    return this.isHoldingPunch;
  }

  onDestroy(): void {
    // No cleanup needed
  }
}
