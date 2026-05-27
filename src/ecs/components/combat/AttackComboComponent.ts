import type { SoundManager } from '../../../systems/SoundManager';
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
import type { WorldStateManager } from '../../../systems/WorldStateManager';
import { WorldFlags } from '../../../constants/WorldFlags';
import { ChargeCircleEffect } from './ChargeCircleEffect';
import type { PetManager } from '../../../systems/PetManager';
import { RockThrowAbility } from '../pet/RockThrowAbility';
import { ComponentStateMachine } from '../../../systems/state/ComponentStateMachine';
import { CachedFlag } from '../../../systems/state/CachedFlag';
import { findNearestEntityInFOV } from '../../../utils/EnemyTargeting';

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
  getEnemies: () => Iterable<Entity>;
  worldState: WorldStateManager;
  soundManager: SoundManager;
  petManager: PetManager;
}

export class AttackComboComponent implements Component {
  entity!: Entity;
  private readonly sm: ComponentStateMachine<ComboPhase>;
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
  private readonly getEnemies: () => Iterable<Entity>;
  private readonly worldState: WorldStateManager;
  private readonly soundManager: SoundManager;
  private readonly petManager: PetManager;
  private readonly hasSuperPunchFlag: CachedFlag;
  private chargeCircle: ChargeCircleEffect | null = null;

  constructor(props: AttackComboComponentProps) {
    this.scene = props.scene;
    this.entityManager = props.entityManager;
    this.getEnemies = props.getEnemies;
    this.worldState = props.worldState;
    this.soundManager = props.soundManager;
    this.petManager = props.petManager;
    this.hasSuperPunchFlag = new CachedFlag('hasSuperPunch', this.worldState);
    this.sm = new ComponentStateMachine<ComboPhase>('idle', {
      idle: { update: () => { /* no-op */ } },
      punching: { update: (d) => this.updatePunching(d) },
      holding: { update: (d) => this.updateHolding(d) },
      super_punching: { update: (d) => this.updateSuperPunching(d) },
    });
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

  private getAnimSpeed(): number {
    return this.entity.require(HealthComponent).isOverhealed() ? 2 : 1;
  }

  private getPunchDuration(): number {
    return this.entity.require(HealthComponent).isOverhealed() ? PUNCH_DURATION_MS / 2 : PUNCH_DURATION_MS;
  }

  private cancelIfHopping(): boolean {
    const waterEffect = this.entity.get(WaterEffectComponent);
    if (waterEffect?.isHopping()) {
      this.sm.transition('idle');
      this.isHoldingAttack = false;
      this.destroyChargeCircle();
      const anim = this.entity.get(AnimationComponent);
      anim?.animationSystem.setTimeScale(1);
      return true;
    }
    return false;
  }

  update(delta: number): void {
    const phase = this.sm.state;
    if (phase !== 'holding' && phase !== 'super_punching') {
      this.updatePunchDirection();
    }
    if (phase === 'idle') return;
    if (this.cancelIfHopping()) return;
    this.sm.update(delta);
  }

  private updatePunching(delta: number): void {
    const anim = this.entity.get(AnimationComponent);
    const walk = this.entity.get(WalkComponent);
    const animSpeed = this.getAnimSpeed();

    // Update punch animation when direction changes
    if (anim && this.punchDir !== this.lastAnimDir) {
      this.lastAnimDir = this.punchDir;
      const currentAnim = anim.animationSystem.getCurrentAnimation();
      const idx = currentAnim?.getIndex() ?? 0;
      anim.animationSystem.play(`punch_${this.punchDir}`, animSpeed);
      anim.animationSystem.getCurrentAnimation()?.setIndex(idx);
      walk?.updateFacingDirection(this.punchDirX, this.punchDirY);
    }

    this.phaseTimer += delta;

    // Enter hold phase (only if super punch is available)
    const currentAnim = anim?.animationSystem.getCurrentAnimation();
    const hasSuperPunch = this.hasSuperPunchFlag.get();
    if (hasSuperPunch && this.isHoldingAttack && !this.wasReleasedDuringPunch && currentAnim && currentAnim.getIndex() >= HOLD_FRAME_INDEX) {
      this.sm.transition('holding');
      this.holdDurationMs = 0;
      currentAnim.setIndex(HOLD_FRAME_INDEX);
      if (anim) anim.animationSystem.setTimeScale(0);
      return;
    }

    // Quick tap hitbox
    if (!this.isHoldingAttack && !this.hitboxCreated && this.phaseTimer >= PUNCH_HITBOX_DELAY_MS) {
      this.hitboxCreated = true;
      this.createPunchHitbox();
    }

    // Reset visual offset
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) sprite.visualOffsetYPx = 0;

    if (this.phaseTimer >= this.getPunchDuration()) {
      this.finishPunch();
    }
  }

  private updateHolding(delta: number): void {
    const anim = this.entity.get(AnimationComponent);
    const animSpeed = this.getAnimSpeed();

    if (this.isHoldingAttack) {
      this.holdDurationMs += delta;
      const sprite = this.entity.get(SpriteComponent);
      if (sprite) {
        sprite.sprite.x += (Math.random() - 0.5) * SHAKE_INTENSITY_PX * 2;
        sprite.sprite.y += (Math.random() - 0.5) * SHAKE_INTENSITY_PX * 2;
      }

      const transform = this.entity.require(TransformComponent);
      this.chargeCircle ??= new ChargeCircleEffect(this.scene);
      const progress = this.holdDurationMs / SUPER_PUNCH_HOLD_THRESHOLD_MS;
      this.chargeCircle.update(transform.x, transform.y, progress, delta);

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

    // Released — destroy charge circle and resolve
    this.destroyChargeCircle();
    const isSuperPunch = this.holdDurationMs >= SUPER_PUNCH_HOLD_THRESHOLD_MS &&
      this.worldState.isFlagTrue(WorldFlags.hasSuperPunch);
    this.hitboxCreated = true;
    this.phaseTimer = 0;

    if (isSuperPunch) {
      this.sm.transition('super_punching');
      this.createPunchHitbox(true);
      if (anim) {
        anim.animationSystem.play(`uppercut_${this.punchDir}`, animSpeed * 0.5);
      }
      this.phaseTimer = -(SUPER_PUNCH_DURATION_MS - this.getPunchDuration());
    } else {
      this.sm.transition('punching');
      this.releasedFromCharge = true;
      this.hitboxCreated = false;
      if (anim) {
        anim.animationSystem.play(`punch_${this.punchDir}`, animSpeed);
      }
    }
  }

  private updateSuperPunching(delta: number): void {
    this.phaseTimer += delta;
    const punchDuration = this.getPunchDuration();

    const elapsed = this.phaseTimer + (SUPER_PUNCH_DURATION_MS - punchDuration);
    const progress = Math.max(0, Math.min(elapsed / SUPER_PUNCH_DURATION_MS, 1));
    const riseOffset = Math.sin(progress * Math.PI) * SUPER_PUNCH_RISE_PX;
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.visualOffsetYPx = -riseOffset;
    }

    if (this.phaseTimer >= punchDuration) {
      this.finishPunch();
    }
  }

  private finishPunch(): void {
    this.sm.transition('idle');
    this.phaseTimer = 0;
    this.hitboxCreated = false;
    this.releasedFromCharge = false;

    const sprite = this.entity.get(SpriteComponent);
    if (sprite) sprite.visualOffsetYPx = 0;

    const walk = this.entity.get(WalkComponent);
    const anim = this.entity.get(AnimationComponent);
    if (walk && anim) {
      const animKey = walk.isMoving() ? `walk_${walk.lastDir}` : `idle_${walk.lastDir}`;
      anim.animationSystem.play(animKey);
    }
  }

  private createPunchHitbox(isSuper = false): void {
    this.playPunchSound(isSuper);

    const transform = this.entity.require(TransformComponent);
    const { dirX, dirY } = this.resolveAimDirection(transform);

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

    this.spawnPunchParticles(isSuper, startX, startY, dirX, dirY);
  }

  private playPunchSound(isSuper: boolean): void {
    if (isSuper) {
      this.soundManager.play('superpunch');
    } else {
      const punchSounds = ['punch1', 'punch2', 'punch3'];
      this.soundManager.play(punchSounds[Math.floor(Math.random() * punchSounds.length)]);
    }
  }

  private resolveAimDirection(transform: TransformComponent): { dirX: number; dirY: number } {
    const facingAngle = Math.atan2(this.punchDirY, this.punchDirX);
    const nearestEnemy = findNearestEntityInFOV({
      originX: transform.x,
      originY: transform.y,
      facingAngleRadians: facingAngle,
      fovRadians: PUNCH_FOV_RADIANS,
      rangePx: PUNCH_RANGE_PX,
      candidates: this.getEnemies(),
      requireFacing: mustFaceEnemy,
    });

    if (nearestEnemy) {
      const et = nearestEnemy.require(TransformComponent);
      const dx = et.x - transform.x;
      const dy = et.y - transform.y;
      const len = Math.hypot(dx, dy);
      return { dirX: dx / len, dirY: dy / len };
    }

    const len = Math.hypot(this.punchDirX, this.punchDirY);
    if (len > 0) return { dirX: this.punchDirX / len, dirY: this.punchDirY / len };
    return { dirX: this.punchDirX, dirY: this.punchDirY };
  }

  private spawnPunchParticles(isSuper: boolean, x: number, y: number, dirX: number, dirY: number): void {
    if (isSuper) {
      const particleEntity = new Entity('super_punch_particles');
      particleEntity.add(new SuperPunchParticlesComponent(this.scene, x, y, dirX, dirY, this.punchDir, this.entity));
      this.entityManager.add(particleEntity);
    } else {
      const particleEntity = new Entity('punch_particles');
      particleEntity.add(new PunchParticlesComponent(this.scene, x, y, dirX, dirY, this.punchDir, this.entity));
      this.entityManager.add(particleEntity);
    }
  }

  tryStartPunch(): void {
    if (this.sm.state !== 'idle' || this.wasAttackPressed) return;
    const waterEffect = this.entity.get(WaterEffectComponent);
    if (waterEffect?.isHopping()) return;
    const rockThrow = this.petManager.getActivePetEntity()?.get(RockThrowAbility);
    if (rockThrow?.isActive()) return;
    this.wasAttackPressed = true;
    this.startPunchInternal();
  }

  forcePunch(direction: Direction): void {
    if (this.sm.state !== 'idle') return;
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
    const animSpeed = this.getAnimSpeed();
    anim?.animationSystem.play(`punch_${this.punchDir}`, animSpeed);
    this.lastAnimDir = this.punchDir;

    this.sm.transition('punching');
    this.phaseTimer = 0;
    this.hitboxCreated = false;
    this.wasReleasedDuringPunch = false;
  }

  checkAttackReleased(isPressed: boolean): void {
    this.isHoldingAttack = isPressed;
    if (!isPressed) {
      this.wasAttackPressed = false;
      if (this.sm.state === 'punching') this.wasReleasedDuringPunch = true;
    }
  }

  isPunching(): boolean {
    return this.sm.state !== 'idle';
  }

  isMovementLocked(): boolean {
    return this.sm.state === 'super_punching' || this.releasedFromCharge;
  }

  getChargeSpeedMultiplier(): number {
    if (this.sm.state === 'super_punching') return 0;
    if (this.sm.state === 'holding') return 0.25;
    return 1;
  }

  isFacingLocked(): boolean {
    return this.sm.state !== 'idle';
  }

  onDestroy(): void {
    this.destroyChargeCircle();
    this.hasSuperPunchFlag.destroy();
  }

  private destroyChargeCircle(): void {
    if (this.chargeCircle) {
      this.chargeCircle.destroy();
      this.chargeCircle = null;
    }
  }
}
