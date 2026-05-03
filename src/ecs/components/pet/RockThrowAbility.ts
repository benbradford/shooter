import { SoundManager } from '../../../systems/SoundManager';
import Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { Depth } from '../../../constants/DepthConstants';
import { HealthComponent } from '../core/HealthComponent';
import { InputComponent } from '../input/InputComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { PetFollowComponent } from './PetFollowComponent';
import { PetAbilityComponent } from './PetAbilityComponent';
import { Direction, dirFromDelta } from '../../../constants/Direction';
import { createRockProjectileEntity } from '../../entities/pet/RockProjectileEntity';
import type { GridReader } from '../../../systems/grid/Grid';
import type { EntityManager } from '../../EntityManager';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { ThrowArrowIndicator } from './ThrowArrowIndicator';

type ThrowState = 'idle' | 'charging' | 'aiming' | 'throwing' | 'landed' | 'returning';

const THROW_DISTANCE_PX = 250;
const THROW_SPEED_PX_PER_SEC = 500;
const THROW_DAMAGE = 20;
const THROW_ARC_HEIGHT_PX = 20;
const ROCK_RETURN_SPEED_PX_PER_SEC = 600;
const ROCK_CHARGE_TWEEN_DURATION_MS = 300;
const ROCK_DROP_DISTANCE_PX = 20;
const HOLD_FRAME_INDEX = 2;
const RETURN_ARRIVE_THRESHOLD_PX = 5;
const LANDED_IDLE_DURATION_MS = 600;
const THROW_LOCK_DURATION_MS = 200;

// Defaults
const DEFAULT_THROW_DIR_Y = 1;
const DEFAULT_HEALTH = 100;
const DEFAULT_LAYER = 0;

// Splash particles
const SPLASH_SPEED_MIN_PX_PER_SEC = 50;
const SPLASH_SPEED_MAX_PX_PER_SEC = 100;
const SPLASH_ANGLE_MIN_DEG = 0;
const SPLASH_ANGLE_MAX_DEG = -180;
const SPLASH_SCALE_START = 0.15;
const SPLASH_SCALE_END = 0;
const SPLASH_ALPHA_START = 1;
const SPLASH_ALPHA_END = 0;
const SPLASH_LIFESPAN_MS = 1000;
const SPLASH_FREQUENCY = 2;
const SPLASH_GRAVITY_PX_PER_SEC_SQ = 300;
const SPLASH_RADIUS_PX = 12;
const SPLASH_EMIT_DURATION_MS = 80;
const SPLASH_CLEANUP_DELAY_MS = 800;

// Rock visual
const ROCK_LANDED_OFFSET_Y_PX = 25;

const PLAYER_THROW_OFFSETS: Record<Direction, { x: number; y: number; z: number }> = {
  [Direction.None]: { x: 0, y: 0, z: 1 },
  [Direction.Down]: { x: -8, y: -15, z: -1 },
  [Direction.Up]: { x: 10, y: -4, z: 1 },
  [Direction.Left]: { x: 18, y: -2, z: 1 },
  [Direction.Right]: { x: -18, y: -2, z: 1 },
  [Direction.UpLeft]: { x: 3, y: 7, z: 1 },
  [Direction.UpRight]: { x: -3, y: 7, z: 1 },
  [Direction.DownLeft]: { x: 18, y: -12, z: 1 },
  [Direction.DownRight]: { x: -18, y: -12, z: 1 },
};

export class RockThrowAbility implements Component {
  entity!: Entity;
  private state: ThrowState = 'idle';
  private readonly scene: Phaser.Scene;
  private readonly grid: GridReader;
  private readonly playerEntity: Entity;
  private chargeTween: Phaser.Tweens.Tween | null = null;
  private chargeComplete = false;
  private activeProjectile: Entity | null = null;
  private readonly arrowIndicator: ThrowArrowIndicator;
  private lastKnownHealth = -1;
  private throwDirX = 0;
  private throwDirY = DEFAULT_THROW_DIR_Y;
  private throwDir: Direction = Direction.Down;
  private landedTimerMs = 0;
  private throwTimerMs = 0;

  constructor(scene: Phaser.Scene, grid: GridReader, playerEntity: Entity) {
    this.scene = scene;
    this.grid = grid;
    this.playerEntity = playerEntity;
    this.arrowIndicator = new ThrowArrowIndicator(scene);
  }

  isActive(): boolean {
    return this.state === 'charging' || this.state === 'aiming';
  }

  isInFlight(): boolean {
    return this.state === 'throwing' || this.state === 'landed';
  }

  isPlayerLocked(): boolean {
    if (this.state === 'charging' || this.state === 'aiming') return true;
    if (this.state === 'throwing' && this.throwTimerMs < THROW_LOCK_DURATION_MS) return true;
    return false;
  }

  isAiming(): boolean {
    return this.state === 'aiming';
  }

  activate(): void {
    if (this.state !== 'idle' && this.state !== 'returning') return;

    // If interrupting return, reset rock visual state
    if (this.state === 'returning') {
      const rockSprite = this.entity.get(SpriteComponent);
      if (rockSprite) rockSprite.visualOffsetYPx = 0;
    }

    // Get player's current facing direction
    const walk = this.playerEntity.get(WalkComponent);
    if (walk) {
      this.throwDir = walk.lastDir;
      this.throwDirX = walk.lastMoveX;
      this.throwDirY = walk.lastMoveY;
    }

    // Normalize throw direction
    const len = Math.hypot(this.throwDirX, this.throwDirY);
    if (len > 0) {
      this.throwDirX /= len;
      this.throwDirY /= len;
    }

    this.state = 'charging';
    this.chargeComplete = false;
    this.updateRockDepth();

    // Store health for damage polling
    const health = this.playerEntity.get(HealthComponent);
    this.lastKnownHealth = health?.getHealth() ?? DEFAULT_HEALTH;

    // Pause pet follow and disable grid collision during throw
    const follow = this.entity.get(PetFollowComponent);
    follow?.setBarking(true);
    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) gridCollision.enabled = false;

    // Play player throw animation, freeze at frame 2
    const playerAnim = this.playerEntity.get(AnimationComponent);
    if (playerAnim) {
      playerAnim.animationSystem.play(`throw_${this.throwDir}`);
      playerAnim.animationSystem.setTimeScale(1);
    }

    // Tween rock to player offset position
    const playerTransform = this.playerEntity.require(TransformComponent);
    const rockTransform = this.entity.require(TransformComponent);
    const offset = PLAYER_THROW_OFFSETS[this.throwDir];
    const targetX = playerTransform.x + offset.x;
    const targetY = playerTransform.y + offset.y;

    this.chargeTween = this.scene.tweens.add({
      targets: rockTransform,
      x: targetX,
      y: targetY,
      duration: ROCK_CHARGE_TWEEN_DURATION_MS,
      ease: 'Quad.Out',
      onComplete: () => {
        // Snap to live player position (player may have moved during tween)
        const pt = this.playerEntity.require(TransformComponent);
        const off = PLAYER_THROW_OFFSETS[this.throwDir];
        rockTransform.x = pt.x + off.x;
        rockTransform.y = pt.y + off.y;
        this.chargeComplete = true;
      }
    });
  }

  update(delta: number): void {
    if (this.state === 'idle') return;

    // Damage polling — cancel if player took damage
    if (this.state === 'charging' || this.state === 'aiming') {
      const health = this.playerEntity.get(HealthComponent);
      const currentHealth = health?.getHealth() ?? 0;
      if (currentHealth < this.lastKnownHealth) {
        this.cancelThrow();
        return;
      }
      this.lastKnownHealth = currentHealth;
    }

    if (this.state === 'charging') {
      this.updateCharging();
    } else if (this.state === 'aiming') {
      this.updateAiming();
    } else if (this.state === 'throwing') {
      this.throwTimerMs += delta;
    } else if (this.state === 'landed') {
      this.landedTimerMs += delta;
      if (this.landedTimerMs >= LANDED_IDLE_DURATION_MS) {
        const rockSprite = this.entity.get(SpriteComponent);
        if (rockSprite) rockSprite.sprite.setVisible(true);
        this.state = 'returning';
      }
    } else if (this.state === 'returning') {
      this.updateReturning(delta);
    }
  }

  private updateCharging(): void {
    // Freeze player at throw frame 2
    const playerAnim = this.playerEntity.get(AnimationComponent);
    if (playerAnim) {
      const currentAnim = playerAnim.animationSystem.getCurrentAnimation();
      if (currentAnim && currentAnim.getIndex() >= HOLD_FRAME_INDEX) {
        currentAnim.setIndex(HOLD_FRAME_INDEX);
        playerAnim.animationSystem.setTimeScale(0);
      }
    }

    // Always wait for rock to arrive at player first
    if (!this.chargeComplete) return;

    const isHeld = this.isButtonHeld();

    if (isHeld) {
      this.state = 'aiming';
      this.arrowIndicator.show();
      return;
    }

    // Button was released — throw
    this.startThrow();
  }

  private updateAiming(): void {
    // Freeze player at throw frame
    const playerAnim = this.playerEntity.get(AnimationComponent);

    // Read joystick for direction
    const input = this.playerEntity.get(InputComponent);
    const rawInput = input?.getRawInputDelta();
    if (rawInput && (rawInput.dx !== 0 || rawInput.dy !== 0)) {
      const newDir = dirFromDelta(rawInput.dx, rawInput.dy);
      const len = Math.hypot(rawInput.dx, rawInput.dy);
      this.throwDirX = rawInput.dx / len;
      this.throwDirY = rawInput.dy / len;

      if (newDir !== this.throwDir) {
        this.throwDir = newDir;
        // Update player animation to new direction
        if (playerAnim) {
          playerAnim.animationSystem.play(`throw_${this.throwDir}`);
        }
        // Reposition rock to new offset
        const playerTransform = this.playerEntity.require(TransformComponent);
        const rockTransform = this.entity.require(TransformComponent);
        const offset = PLAYER_THROW_OFFSETS[this.throwDir];
        rockTransform.x = playerTransform.x + offset.x;
        rockTransform.y = playerTransform.y + offset.y;
        this.updateRockDepth();
      }
    }

    // Hold at frame 2
    if (playerAnim) {
      const currentAnim = playerAnim.animationSystem.getCurrentAnimation();
      if (currentAnim) {
        currentAnim.setIndex(HOLD_FRAME_INDEX);
        playerAnim.animationSystem.setTimeScale(0);
      }
    }

    // Draw arrow
    const arrowPlayerTransform = this.playerEntity.require(TransformComponent);
    this.arrowIndicator.draw(arrowPlayerTransform.x, arrowPlayerTransform.y, this.throwDirX, this.throwDirY);

    // Check for release
    if (!this.isButtonHeld()) {
      this.arrowIndicator.destroy();
      this.startThrow();
    }
  }

  private updateReturning(delta: number): void {
    const playerTransform = this.playerEntity.get(TransformComponent);
    if (!playerTransform) {
      this.returnToIdle();
      return;
    }

    const rockTransform = this.entity.require(TransformComponent);
    const dx = playerTransform.x - rockTransform.x;
    const dy = playerTransform.y - rockTransform.y;
    const dist = Math.hypot(dx, dy);

    if (dist < RETURN_ARRIVE_THRESHOLD_PX) {
      this.returnToIdle();
      return;
    }

    const movePx = ROCK_RETURN_SPEED_PX_PER_SEC * (delta / 1000);
    const ratio = Math.min(movePx / dist, 1);
    rockTransform.x += dx * ratio;
    rockTransform.y += dy * ratio;
  }

  private startThrow(): void {
    this.state = 'throwing';
    this.throwTimerMs = 0;
    this.chargeTween?.stop();
    this.chargeTween = null;

    // Continue throw animation
    const playerAnim = this.playerEntity.get(AnimationComponent);
    if (playerAnim) {
      playerAnim.animationSystem.setTimeScale(1);
    }

    // Hide pet rock sprite
    const rockSprite = this.entity.get(SpriteComponent);
    if (rockSprite) {
      rockSprite.sprite.setVisible(false);
    }

    // Get launch position and player layer
    const rockTransform = this.entity.require(TransformComponent);
    const playerGridPos = this.playerEntity.get(GridPositionComponent);
    const startLayer = playerGridPos?.currentLayer ?? DEFAULT_LAYER;
    const playerCell = playerGridPos ? this.grid.getCell(playerGridPos.currentCell.col, playerGridPos.currentCell.row) : null;
    const startedOnStairs = playerCell ? this.grid.isTransition(playerCell) : false;

    // Get EntityManager from scene
    const gameScene = this.scene as unknown as { entityManager?: EntityManager };
    const entityManager = gameScene.entityManager;
    if (!entityManager) {
      this.onProjectileLand(rockTransform.x, rockTransform.y);
      return;
    }

    // Create projectile
    const projectile = createRockProjectileEntity({
      scene: this.scene,
      x: rockTransform.x,
      y: rockTransform.y,
      dirX: this.throwDirX,
      dirY: this.throwDirY,
      speed: THROW_SPEED_PX_PER_SEC,
      maxDistance: THROW_DISTANCE_PX,
      damage: THROW_DAMAGE,
      arcHeight: THROW_ARC_HEIGHT_PX,
      grid: this.grid,
      blockedAreaManager: (this.scene as unknown as { blockedAreaManager?: import('../../../systems/BlockedAreaManager').BlockedAreaManager }).blockedAreaManager,
      startLayer,
      startedOnStairs,
      onLand: (x: number, y: number, landOffsetY: number) => {
        if (this.entity.isDestroyed) return;
        this.onProjectileLand(x, y, landOffsetY);
      },
      onHit: (x: number, y: number) => {
        if (this.entity.isDestroyed) return;
        this.onProjectileLand(x, y);
      },
    });

    this.activeProjectile = projectile;
    entityManager.add(projectile);
  }

  private onProjectileLand(x: number, y: number, landOffsetY: number = ROCK_LANDED_OFFSET_Y_PX): void {
    if (this.state !== 'throwing') return; // Guard against double notification

    if (this.activeProjectile && !this.activeProjectile.isDestroyed) {
      this.activeProjectile.destroy();
    }
    this.activeProjectile = null;

    const rockTransform = this.entity.require(TransformComponent);
    rockTransform.x = x;
    rockTransform.y = y;

    // Check if landed in water
    const cell = this.grid.worldToCell(x, y);
    const cellData = this.grid.getCell(cell.col, cell.row);
    const landedInWater = cellData?.properties.has('water') ?? false;
    const landedInVoid = cellData?.properties.has('void') ?? false;

    const rockSprite = this.entity.get(SpriteComponent);
    if (landedInVoid) {
      if (rockSprite) {
        rockSprite.sprite.setVisible(true);
        rockSprite.visualOffsetYPx = landOffsetY;
      }
      this.state = 'landed';
      this.landedTimerMs = 0;
      this.startVoidFall(rockTransform, rockSprite);
      return;
    } else if (landedInWater) {
      // Splash effect + sound, hide rock
      SoundManager.getInstance().play('splash1');
      const emitter = this.scene.add.particles(x, y, 'water_splash', {
        speed: { min: SPLASH_SPEED_MIN_PX_PER_SEC, max: SPLASH_SPEED_MAX_PX_PER_SEC },
        angle: { min: SPLASH_ANGLE_MIN_DEG, max: SPLASH_ANGLE_MAX_DEG },
        scale: { start: SPLASH_SCALE_START, end: SPLASH_SCALE_END },
        alpha: { start: SPLASH_ALPHA_START, end: SPLASH_ALPHA_END },
        lifespan: SPLASH_LIFESPAN_MS,
        frequency: SPLASH_FREQUENCY,
        blendMode: 'NORMAL',
        gravityY: SPLASH_GRAVITY_PX_PER_SEC_SQ,
        emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, SPLASH_RADIUS_PX) } as Phaser.Types.GameObjects.Particles.EmitZoneData
      });
      emitter.setDepth(Depth.particle);
      this.scene.time.delayedCall(SPLASH_EMIT_DURATION_MS, () => emitter.stop());
      this.scene.time.delayedCall(SPLASH_CLEANUP_DELAY_MS, () => emitter.destroy());
      if (rockSprite) rockSprite.sprite.setVisible(false);
    } else {
      if (rockSprite) {
        rockSprite.sprite.setVisible(true);
        rockSprite.visualOffsetYPx = landOffsetY;
      }
    }

    this.landedTimerMs = 0;
    this.state = 'landed';
  }

  private startVoidFall(rockTransform: TransformComponent, rockSprite: SpriteComponent | undefined): void {
    const VOID_FALL_DURATION_MS = 600;
    const VOID_FALL_DRIFT_PX = 20;
    const startY = rockTransform.y;
    const originalScale = rockTransform.scale;
    const startTime = this.scene.time.now;

    const updateFall = (): void => {
      const elapsed = this.scene.time.now - startTime;
      const progress = Math.min(1, elapsed / VOID_FALL_DURATION_MS);
      rockTransform.y = startY + progress * VOID_FALL_DRIFT_PX;
      rockTransform.scale = originalScale * (1 - progress);
      if (rockSprite) rockSprite.sprite.setAlpha(1 - progress);

      if (progress >= 1) {
        this.scene.events.off('update', updateFall);
        rockTransform.scale = originalScale;
        if (rockSprite) {
          rockSprite.sprite.setAlpha(1);
          rockSprite.sprite.setVisible(false);
        }
        this.state = 'returning';
      }
    };

    this.scene.events.on('update', updateFall);
  }

  private cancelThrow(): void {
    this.chargeTween?.stop();
    this.chargeTween = null;
    this.arrowIndicator.destroy();

    // Drop rock 20px
    const rockTransform = this.entity.require(TransformComponent);
    rockTransform.y += ROCK_DROP_DISTANCE_PX;

    // Restore player animation
    const playerAnim = this.playerEntity.get(AnimationComponent);
    if (playerAnim) {
      playerAnim.animationSystem.setTimeScale(1);
    }

    this.state = 'returning';
  }

  private returnToIdle(): void {
    this.state = 'idle';

    // Show rock sprite
    const rockSprite = this.entity.get(SpriteComponent);
    if (rockSprite) {
      rockSprite.sprite.setVisible(true);
      rockSprite.sprite.setDepth(Depth.pet);
      rockSprite.visualOffsetYPx = 0;
    }

    // Resume pet follow and re-enable grid collision
    const follow = this.entity.get(PetFollowComponent);
    follow?.setBarking(false);
    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) gridCollision.enabled = true;

    // Restore player animation
    const playerAnim = this.playerEntity.get(AnimationComponent);
    if (playerAnim) {
      playerAnim.animationSystem.setTimeScale(1);
    }

    // Start cooldown now that throw is complete
    const petAbility = this.playerEntity.get(PetAbilityComponent);
    petAbility?.startCooldown();
  }

  private isButtonHeld(): boolean {
    const petAbility = this.playerEntity.get(PetAbilityComponent);
    return petAbility?.isAbilityHeld() ?? false;
  }

  private updateRockDepth(): void {
    const sprite = this.entity.get(SpriteComponent);
    if (!sprite) return;
    const z = PLAYER_THROW_OFFSETS[this.throwDir].z;
    sprite.sprite.setDepth(Depth.player + z);
  }

  onDestroy(): void {
    // Clean up everything
    this.chargeTween?.stop();
    this.chargeTween = null;
    this.arrowIndicator.destroy();

    if (this.activeProjectile && !this.activeProjectile.isDestroyed) {
      this.activeProjectile.destroy();
      this.activeProjectile = null;
    }

    // Unlock player (defensive)
    const playerAnim = this.playerEntity.get(AnimationComponent);
    if (playerAnim) {
      playerAnim.animationSystem.setTimeScale(1);
    }
  }
}
