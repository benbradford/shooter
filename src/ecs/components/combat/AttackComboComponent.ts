import type { Component } from '../../Component';
import { Entity } from '../../Entity';
import { EntityManager } from '../../EntityManager';
import { TransformComponent } from '../core/TransformComponent';
import { HealthComponent } from '../core/HealthComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { InputComponent } from '../input/InputComponent';
import { dirFromDelta, type Direction } from '../../../constants/Direction';
import { createPunchProjectileEntity } from '../../entities/projectile/PunchProjectileEntity';
import { PunchParticlesComponent } from '../visual/PunchParticlesComponent';
import { SuperPunchParticlesComponent } from '../visual/SuperPunchParticlesComponent';
import { WaterEffectComponent } from '../visual/WaterEffectComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { ChargeCircleEffect } from './ChargeCircleEffect';

const PUNCH_DAMAGE = 20;
const PUNCH_RANGE_PX = 128;
const PUNCH_DURATION_MS = 500;
const PUNCH_FOV_RADIANS = Math.PI * 0.6;
const PUNCH_HITBOX_DELAY_MS = 170;
const HOLD_FRAME_INDEX = 4;
const SHAKE_INTENSITY_PX = 1.5;
const SUPER_PUNCH_HOLD_THRESHOLD_MS = 1000;
const SUPER_PUNCH_DAMAGE_MULTIPLIER = 3;
const SUPER_PUNCH_HITBOX_SIZE_PX = 72;
const SUPER_PUNCH_DURATION_MS = 840;

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
  private isHoldingPunch: boolean = false;
  private holdDurationMs: number = 0;
  private isSuperPunching: boolean = false;
  private punchDir: Direction = 1; // Direction.Down
  private lastAnimDir: Direction = 1;
  private punchDirX: number = 0;
  private punchDirY: number = 1;
  private readonly scene: Phaser.Scene;
  private readonly entityManager: EntityManager;
  private readonly getEnemies: () => Entity[];
  private chargeCircle: ChargeCircleEffect | null = null;

  constructor(props: AttackComboComponentProps) {
    this.scene = props.scene;
    this.entityManager = props.entityManager;
    this.getEnemies = props.getEnemies;
  }

  private updatePunchDirection(): void {
    const input = this.entity.get(InputComponent);
    const raw = input?.getRawInputDelta();
    if (raw && (raw.dx !== 0 || raw.dy !== 0)) {
      this.punchDirX = raw.dx;
      this.punchDirY = raw.dy;
    }
    this.punchDir = dirFromDelta(this.punchDirX, this.punchDirY);
  }

  update(delta: number): void {
    if (!this.isHoldingPunch && !this.isSuperPunching) {
      this.updatePunchDirection();
    }

    const health = this.entity.require(HealthComponent);
    const hasOverheal = health.isOverhealed();
    const punchDuration = hasOverheal ? PUNCH_DURATION_MS / 2 : PUNCH_DURATION_MS;
    const animSpeed = hasOverheal ? 2 : 1;

    if (this.currentPhase !== 'punch') return;

    // Cancel punch if player starts hopping into/out of water
    const waterEffect = this.entity.get(WaterEffectComponent);
    if (waterEffect?.isHopping()) {
      this.currentPhase = 'idle';
      this.isHoldingPunch = false;
      this.isHoldingAttack = false;
      this.destroyChargeCircle();
      const anim = this.entity.get(AnimationComponent);
      anim?.animationSystem.setTimeScale(1);
      return;
    }

    const anim = this.entity.get(AnimationComponent);
    const walk = this.entity.get(WalkComponent);

    // Update punch animation when direction changes
    if (anim && !this.isHoldingPunch && !this.isSuperPunching && this.punchDir !== this.lastAnimDir) {
      this.lastAnimDir = this.punchDir;
      const currentAnim = anim.animationSystem.getCurrentAnimation();
      const idx = currentAnim?.getIndex() ?? 0;
      anim.animationSystem.play(`punch_${this.punchDir}`, animSpeed);
      anim.animationSystem.getCurrentAnimation()?.setIndex(idx);
      walk?.updateFacingDirection(this.punchDirX, this.punchDirY);
    }

    // Hold phase
    if (this.isHoldingPunch) {
      if (this.isHoldingAttack) {
        this.holdDurationMs += delta;
        const sprite = this.entity.get(SpriteComponent);
        if (sprite) {
          sprite.sprite.x += (Math.random() - 0.5) * SHAKE_INTENSITY_PX * 2;
          sprite.sprite.y += (Math.random() - 0.5) * SHAKE_INTENSITY_PX * 2;
        }

        // Charge circle
        const transform = this.entity.require(TransformComponent);
        if (!this.chargeCircle) {
          this.chargeCircle = new ChargeCircleEffect(this.scene);
        }
        const progress = this.holdDurationMs / SUPER_PUNCH_HOLD_THRESHOLD_MS;
        this.chargeCircle.update(transform.x, transform.y, progress, delta);

        // Use walking_punch if moving, freeze punch frame if not
        const input = this.entity.get(InputComponent);
        const moveDelta = input?.getInputDelta();
        const isMoving = moveDelta && (moveDelta.dx !== 0 || moveDelta.dy !== 0);

        if (anim) {
          if (isMoving) {
            const walkPunchKey = `walking_punch_${this.punchDir}`;
            if (anim.animationSystem.getCurrentKey() !== walkPunchKey) {
              anim.animationSystem.play(walkPunchKey);
            }
            anim.animationSystem.setTimeScale(1);
          } else {
            const punchKey = `punch_${this.punchDir}`;
            if (anim.animationSystem.getCurrentKey() !== punchKey) {
              anim.animationSystem.play(punchKey);
            }
            anim.animationSystem.getCurrentAnimation()?.setIndex(HOLD_FRAME_INDEX);
            anim.animationSystem.setTimeScale(0);
          }
        }
        return;
      }
      // Released — destroy charge circle
      this.destroyChargeCircle();
      // Released — check for super punch
      const isSuperPunch = this.holdDurationMs >= SUPER_PUNCH_HOLD_THRESHOLD_MS &&
        WorldStateManager.getInstance().getFlag('hasSuperPunch') === 'true';
      this.isHoldingPunch = false;
      this.hitboxCreated = true;
      this.phaseTimer = 0;

      if (isSuperPunch) {
        this.isSuperPunching = true;
        this.createSuperPunchHitbox();
        if (anim) {
          anim.animationSystem.play(`uppercut_${this.punchDir}`, animSpeed * 0.5);
        }
        // Extend duration for uppercut animation at half speed (7 frames × 60ms × 2 = 840ms)
        this.phaseTimer = -(SUPER_PUNCH_DURATION_MS - punchDuration);
      } else {
        this.createPunchHitbox();
        anim?.animationSystem.setTimeScale(animSpeed);
      }
      return;
    }

    this.phaseTimer += delta;

    // Enter hold phase
    const currentAnim = anim?.animationSystem.getCurrentAnimation();
    if (this.isHoldingAttack && currentAnim && currentAnim.getIndex() >= HOLD_FRAME_INDEX) {
      this.isHoldingPunch = true;
      this.holdDurationMs = 0;
      currentAnim.setIndex(HOLD_FRAME_INDEX);
      anim!.animationSystem.setTimeScale(0);
      return;
    }

    // Quick tap
    if (!this.isHoldingAttack && !this.hitboxCreated && this.phaseTimer >= PUNCH_HITBOX_DELAY_MS) {
      this.hitboxCreated = true;
      this.createPunchHitbox();
    }

    if (this.phaseTimer >= punchDuration) {
      this.currentPhase = 'idle';
      this.phaseTimer = 0;
      this.hitboxCreated = false;
      this.isHoldingPunch = false;
      this.isSuperPunching = false;

      if (walk && anim) {
        const animKey = walk.isMoving() ? `walk_${walk.lastDir}` : `idle_${walk.lastDir}`;
        anim.animationSystem.play(animKey);
      }
    }
  }

  private createPunchHitbox(): void {
    const punchSounds = ['punch1', 'punch2', 'punch3'];
    this.scene.sound.play(punchSounds[Math.floor(Math.random() * punchSounds.length)]);

    const transform = this.entity.require(TransformComponent);
    const facingAngle = Math.atan2(this.punchDirY, this.punchDirX);

    let dirX = this.punchDirX;
    let dirY = this.punchDirY;

    // Snap to nearest enemy in FOV
    let nearestEnemy: Entity | null = null;
    let nearestDistance = PUNCH_RANGE_PX;

    for (const enemy of this.getEnemies()) {
      const et = enemy.get(TransformComponent);
      if (!et) continue;
      const dx = et.x - transform.x;
      const dy = et.y - transform.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= nearestDistance) continue;

      if (mustFaceEnemy) {
        let diff = Math.atan2(dy, dx) - facingAngle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        if (Math.abs(diff) > PUNCH_FOV_RADIANS / 2) continue;
      }
      nearestEnemy = enemy;
      nearestDistance = dist;
    }

    if (nearestEnemy) {
      const et = nearestEnemy.require(TransformComponent);
      const dx = et.x - transform.x;
      const dy = et.y - transform.y;
      const len = Math.hypot(dx, dy);
      dirX = dx / len;
      dirY = dy / len;
    }

    const startX = transform.x + dirX * 30;
    const startY = transform.y + dirY * 30;

    this.entityManager.add(createPunchProjectileEntity({
      scene: this.scene,
      x: startX, y: startY,
      dirX, dirY,
      playerEntity: this.entity,
      damage: PUNCH_DAMAGE
    }));

    const particleEntity = new Entity('punch_particles');
    particleEntity.add(new PunchParticlesComponent(this.scene, startX, startY, dirX, dirY, this.punchDir, this.entity));
    this.entityManager.add(particleEntity);
  }

  private createSuperPunchHitbox(): void {
    const superPunchSounds = ['punch1', 'punch2', 'punch3'];
    this.scene.sound.play(superPunchSounds[Math.floor(Math.random() * superPunchSounds.length)]);

    const transform = this.entity.require(TransformComponent);
    const facingAngle = Math.atan2(this.punchDirY, this.punchDirX);

    let dirX = this.punchDirX;
    let dirY = this.punchDirY;

    let nearestEnemy: Entity | null = null;
    let nearestDistance = PUNCH_RANGE_PX;

    for (const enemy of this.getEnemies()) {
      const et = enemy.get(TransformComponent);
      if (!et) continue;
      const dx = et.x - transform.x;
      const dy = et.y - transform.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= nearestDistance) continue;

      if (mustFaceEnemy) {
        let diff = Math.atan2(dy, dx) - facingAngle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        if (Math.abs(diff) > PUNCH_FOV_RADIANS / 2) continue;
      }
      nearestEnemy = enemy;
      nearestDistance = dist;
    }

    if (nearestEnemy) {
      const et = nearestEnemy.require(TransformComponent);
      const dx = et.x - transform.x;
      const dy = et.y - transform.y;
      const len = Math.hypot(dx, dy);
      dirX = dx / len;
      dirY = dy / len;
    }

    const startX = transform.x + dirX * 30;
    const startY = transform.y + dirY * 30;

    const halfSize = SUPER_PUNCH_HITBOX_SIZE_PX / 2;
    this.entityManager.add(createPunchProjectileEntity({
      scene: this.scene,
      x: startX, y: startY,
      dirX, dirY,
      playerEntity: this.entity,
      damage: PUNCH_DAMAGE * SUPER_PUNCH_DAMAGE_MULTIPLIER,
      hitboxOverride: { offsetX: -halfSize, offsetY: -halfSize, width: SUPER_PUNCH_HITBOX_SIZE_PX, height: SUPER_PUNCH_HITBOX_SIZE_PX }
    }));

    const particleEntity = new Entity('super_punch_particles');
    particleEntity.add(new SuperPunchParticlesComponent(this.scene, startX, startY, dirX, dirY, this.punchDir, this.entity));
    this.entityManager.add(particleEntity);
  }

  tryStartPunch(): void {
    if (this.currentPhase !== 'idle' || this.wasAttackPressed) return;
    const waterEffect = this.entity.get(WaterEffectComponent);
    if (waterEffect?.isHopping()) return;
    this.wasAttackPressed = true;
    this.startPunchInternal();
  }

  forcePunch(direction: Direction): void {
    if (this.currentPhase !== 'idle') return;
    const DIAG = 0.707;
    const DIR_DELTAS: Record<number, [number, number]> = {
      [1]: [0, 1], [2]: [0, -1], [3]: [-1, 0], [4]: [1, 0],
      [5]: [-DIAG, -DIAG], [6]: [DIAG, -DIAG], [7]: [-DIAG, DIAG], [8]: [DIAG, DIAG],
    };
    const [dx, dy] = DIR_DELTAS[direction] ?? [0, 1];
    this.punchDirX = dx;
    this.punchDirY = dy;
    this.punchDir = direction;
    this.isHoldingAttack = false;
    this.startPunchInternal();
  }

  private startPunchInternal(): void {
    const walk = this.entity.require(WalkComponent);
    walk.updateFacingDirection(this.punchDirX, this.punchDirY);

    const anim = this.entity.get(AnimationComponent);
    const animSpeed = this.entity.require(HealthComponent).isOverhealed() ? 2 : 1;
    anim?.animationSystem.play(`punch_${this.punchDir}`, animSpeed);
    this.lastAnimDir = this.punchDir;

    this.currentPhase = 'punch';
    this.phaseTimer = 0;
    this.hitboxCreated = false;
    this.isHoldingPunch = false;
  }

  checkAttackReleased(isPressed: boolean): void {
    this.isHoldingAttack = isPressed;
    if (!isPressed) this.wasAttackPressed = false;
  }

  isPunching(): boolean {
    return this.currentPhase === 'punch';
  }

  isMovementLocked(): boolean {
    return this.isSuperPunching;
  }

  getChargeSpeedMultiplier(): number {
    if (this.isSuperPunching) return 0;
    if (this.isHoldingPunch) return 0.25;
    return 1;
  }

  isFacingLocked(): boolean {
    return this.currentPhase === 'punch';
  }

  onDestroy(): void {
    this.destroyChargeCircle();
  }

  private destroyChargeCircle(): void {
    if (this.chargeCircle) {
      this.chargeCircle.destroy();
      this.chargeCircle = null;
    }
  }
}
