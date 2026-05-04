import { SoundManager } from '../../../systems/SoundManager';
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
import { PetManager } from '../../../systems/PetManager';
import { RockThrowAbility } from '../pet/RockThrowAbility';

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
const SUPER_PUNCH_RISE_PX = 25;

let mustFaceEnemy = true;

export function toggleMustFaceEnemy(): boolean {
  mustFaceEnemy = !mustFaceEnemy;
  console.log('[PUNCH] Must face enemy:', mustFaceEnemy);
  return mustFaceEnemy;
}

export function getMustFaceEnemy(): boolean {
  return mustFaceEnemy;
}

type ComboPhase = 'idle' | 'punching' | 'holding' | 'super_punching';

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
  private wasReleasedDuringPunch: boolean = false;
  private holdDurationMs: number = 0;
  private releasedFromCharge: boolean = false;
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
    if (this.currentPhase !== 'holding' && this.currentPhase !== 'super_punching') {
      this.updatePunchDirection();
    }

    const health = this.entity.require(HealthComponent);
    const hasOverheal = health.isOverhealed();
    const punchDuration = hasOverheal ? PUNCH_DURATION_MS / 2 : PUNCH_DURATION_MS;
    const animSpeed = hasOverheal ? 2 : 1;

    if (this.currentPhase === 'idle') return;

    // Cancel punch if player starts jumping into/out of water
    const waterEffect = this.entity.get(WaterEffectComponent);
    if (waterEffect?.isHopping()) {
      this.currentPhase = 'idle';
      this.isHoldingAttack = false;
      this.destroyChargeCircle();
      const anim = this.entity.get(AnimationComponent);
      anim?.animationSystem.setTimeScale(1);
      return;
    }

    const anim = this.entity.get(AnimationComponent);
    const walk = this.entity.get(WalkComponent);

    // Update punch animation when direction changes
    if (anim && this.currentPhase === 'punching' && this.punchDir !== this.lastAnimDir) {
      this.lastAnimDir = this.punchDir;
      const currentAnim = anim.animationSystem.getCurrentAnimation();
      const idx = currentAnim?.getIndex() ?? 0;
      anim.animationSystem.play(`punch_${this.punchDir}`, animSpeed);
      anim.animationSystem.getCurrentAnimation()?.setIndex(idx);
      walk?.updateFacingDirection(this.punchDirX, this.punchDirY);
    }

    // Hold phase
    if (this.currentPhase === 'holding') {
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
      this.hitboxCreated = true;
      this.phaseTimer = 0;

      if (isSuperPunch) {
        this.currentPhase = 'super_punching';
        this.createPunchHitbox(true);
        if (anim) {
          anim.animationSystem.play(`uppercut_${this.punchDir}`, animSpeed * 0.5);
        }
        // Extend duration for uppercut animation at half speed (7 frames × 60ms × 2 = 840ms)
        this.phaseTimer = -(SUPER_PUNCH_DURATION_MS - punchDuration);
      } else {
        this.currentPhase = 'punching';
        this.releasedFromCharge = true;
        this.createPunchHitbox();
        if (anim) {
          anim.animationSystem.play(`punch_${this.punchDir}`, animSpeed);
        }
      }
      return;
    }

    this.phaseTimer += delta;

    // Enter hold phase (only if super punch is available)
    const currentAnim = anim?.animationSystem.getCurrentAnimation();
    const hasSuperPunch = WorldStateManager.getInstance().getFlag('hasSuperPunch') === 'true';
    if (hasSuperPunch && this.isHoldingAttack && !this.wasReleasedDuringPunch && currentAnim && currentAnim.getIndex() >= HOLD_FRAME_INDEX) {
      this.currentPhase = 'holding';
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

    // Super punch rise effect (visual only — no transform/camera/shadow change)
    if (this.currentPhase === 'super_punching') {
      const elapsed = this.phaseTimer + (SUPER_PUNCH_DURATION_MS - punchDuration);
      const progress = Math.max(0, Math.min(elapsed / SUPER_PUNCH_DURATION_MS, 1));
      const riseOffset = Math.sin(progress * Math.PI) * SUPER_PUNCH_RISE_PX;
      const sprite = this.entity.get(SpriteComponent);
      if (sprite) {
        sprite.visualOffsetYPx = -riseOffset;
      }
    } else {
      const sprite = this.entity.get(SpriteComponent);
      if (sprite) sprite.visualOffsetYPx = 0;
    }

    if (this.phaseTimer >= punchDuration) {
      this.currentPhase = 'idle';
      this.phaseTimer = 0;
      this.hitboxCreated = false;
      this.releasedFromCharge = false;

      if (walk && anim) {
        const animKey = walk.isMoving() ? `walk_${walk.lastDir}` : `idle_${walk.lastDir}`;
        anim.animationSystem.play(animKey);
      }
    }
  }

  private createPunchHitbox(isSuper = false): void {
    if (isSuper) {
      SoundManager.getInstance().play('superpunch');
    } else {
      const punchSounds = ['punch1', 'punch2', 'punch3'];
      SoundManager.getInstance().play(punchSounds[Math.floor(Math.random() * punchSounds.length)]);
    }

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
    } else {
      const len = Math.hypot(dirX, dirY);
      if (len > 0) { dirX /= len; dirY /= len; }
    }

    const startX = transform.x + dirX * 30;
    const startY = transform.y + dirY * 30;

    const damage = isSuper ? PUNCH_DAMAGE * SUPER_PUNCH_DAMAGE_MULTIPLIER : PUNCH_DAMAGE;
    const halfSize = SUPER_PUNCH_HITBOX_SIZE_PX / 2;
    const hitboxOverride = isSuper ? { offsetX: -halfSize, offsetY: -halfSize, width: SUPER_PUNCH_HITBOX_SIZE_PX, height: SUPER_PUNCH_HITBOX_SIZE_PX } : undefined;

    this.entityManager.add(createPunchProjectileEntity({
      scene: this.scene,
      x: startX, y: startY,
      dirX, dirY,
      playerEntity: this.entity,
      damage,
      hitboxOverride
    }));

    if (isSuper) {
      const particleEntity = new Entity('super_punch_particles');
      particleEntity.add(new SuperPunchParticlesComponent(this.scene, startX, startY, dirX, dirY, this.punchDir, this.entity));
      this.entityManager.add(particleEntity);
    } else {
      const particleEntity = new Entity('punch_particles');
      particleEntity.add(new PunchParticlesComponent(this.scene, startX, startY, dirX, dirY, this.punchDir, this.entity));
      this.entityManager.add(particleEntity);
    }
  }

  tryStartPunch(): void {
    if (this.currentPhase !== 'idle' || this.wasAttackPressed) return;
    const waterEffect = this.entity.get(WaterEffectComponent);
    if (waterEffect?.isHopping()) return;
    const rockThrow = PetManager.getInstance().getActivePetEntity()?.get(RockThrowAbility);
    if (rockThrow?.isActive()) return;
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

    this.currentPhase = 'punching';
    this.phaseTimer = 0;
    this.hitboxCreated = false;
    this.wasReleasedDuringPunch = false;
  }

  checkAttackReleased(isPressed: boolean): void {
    this.isHoldingAttack = isPressed;
    if (!isPressed) {
      this.wasAttackPressed = false;
      if (this.currentPhase === 'punching') this.wasReleasedDuringPunch = true;
    }
  }

  isPunching(): boolean {
    return this.currentPhase !== 'idle';
  }

  isMovementLocked(): boolean {
    return this.currentPhase === 'super_punching' || this.releasedFromCharge;
  }

  getChargeSpeedMultiplier(): number {
    if (this.currentPhase === 'super_punching') return 0;
    if (this.currentPhase === 'holding') return 0.25;
    return 1;
  }

  isFacingLocked(): boolean {
    return this.currentPhase !== 'idle';
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
