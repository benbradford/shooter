import type { Component } from '../../Component';
import { Entity } from '../../Entity';
import { EntityManager } from '../../EntityManager';
import { TransformComponent } from '../core/TransformComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { createPunchProjectileEntity } from '../../entities/projectile/PunchProjectileEntity';

const PUNCH_DAMAGE = 20;
const PUNCH_RANGE_PX = 128;
const PUNCH_DURATION_MS = 250;

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
  private readonly scene: Phaser.Scene;
  private readonly entityManager: EntityManager;
  private readonly getEnemies: () => Entity[];

  constructor(props: AttackComboComponentProps) {
    this.scene = props.scene;
    this.entityManager = props.entityManager;
    this.getEnemies = props.getEnemies;
  }

  update(delta: number): void {
    if (this.currentPhase === 'punch') {
      this.phaseTimer += delta;

      if (this.phaseTimer >= PUNCH_DURATION_MS) {
        this.currentPhase = 'idle';
        this.phaseTimer = 0;

        const walk = this.entity.get(WalkComponent);
        const anim = this.entity.get(AnimationComponent);
        if (walk && anim) {
          const animKey = `idle_${walk.lastDir}`;
          anim.animationSystem.play(animKey);
        }
      }
    }
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
    const enemies = this.getEnemies();

    let nearestEnemy: Entity | null = null;
    let nearestDistance = PUNCH_RANGE_PX;

    for (const enemy of enemies) {
      const enemyTransform = enemy.get(TransformComponent);
      if (!enemyTransform) continue;

      const dx = enemyTransform.x - transform.x;
      const dy = enemyTransform.y - transform.y;
      const distance = Math.hypot(dx, dy);

      if (distance < nearestDistance) {
        nearestEnemy = enemy;
        nearestDistance = distance;
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
      walk.updateFacingDirection(dirX, dirY);
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

    const anim = this.entity.get(AnimationComponent);
    if (anim) {
      anim.animationSystem.play('punch');
    }

    this.currentPhase = 'punch';
    this.phaseTimer = 0;
  }

  checkAttackReleased(isPressed: boolean): void {
    if (!isPressed) {
      this.wasAttackPressed = false;
    }
  }

  isPunching(): boolean {
    return this.currentPhase === 'punch';
  }

  isMovementLocked(): boolean {
    return false;
  }

  onDestroy(): void {
    // No cleanup needed
  }
}
