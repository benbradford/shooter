import Phaser from 'phaser';
import type { RockThrowContext, RockThrowStateHandler } from './RockThrowTypes';
import { SoundManager } from '../../../../systems/SoundManager';
import { TransformComponent } from '../../core/TransformComponent';
import { SpriteComponent } from '../../core/SpriteComponent';
import { AnimationComponent } from '../../core/AnimationComponent';
import { GridPositionComponent } from '../../movement/GridPositionComponent';
import { Depth } from '../../../../constants/DepthConstants';
import { createRockProjectileEntity } from '../../../entities/pet/RockProjectileEntity';
import type { EntityManager } from '../../../EntityManager';

const THROW_DISTANCE_PX = 250;
const THROW_SPEED_PX_PER_SEC = 500;
const THROW_DAMAGE = 20;
const THROW_ARC_HEIGHT_PX = 20;
const LANDED_IDLE_DURATION_MS = 600;
const THROW_LOCK_DURATION_MS = 200;
const DEFAULT_LAYER = 0;
const PLAYER_FEET_OFFSET_Y_PX = 30;
const ROCK_LANDED_OFFSET_Y_PX = 25;
const ANIM_TIMESCALE_NORMAL = 1;

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

// Void fall
const VOID_FALL_DURATION_MS = 600;
const VOID_FALL_DRIFT_PX = 20;

type FlightPhase = 'throwing' | 'landed';

export class RockFlightState implements RockThrowStateHandler {
  private phase: FlightPhase = 'throwing';
  private activeProjectile: import('../../../Entity').Entity | null = null;
  private throwTimerMs = 0;
  private landedTimerMs = 0;

  constructor(private readonly ctx: RockThrowContext) {}

  get throwLockActive(): boolean {
    return this.phase === 'throwing' && this.throwTimerMs < THROW_LOCK_DURATION_MS;
  }

  enter(): void {
    this.phase = 'throwing';
    this.throwTimerMs = 0;
    this.landedTimerMs = 0;
    this.startThrow();
  }

  update(delta: number): void {
    if (this.phase === 'throwing') {
      this.throwTimerMs += delta;
    } else if (this.phase === 'landed') {
      this.landedTimerMs += delta;
      if (this.landedTimerMs >= LANDED_IDLE_DURATION_MS) {
        const rockSprite = this.ctx.entity.get(SpriteComponent);
        if (rockSprite) rockSprite.sprite.setVisible(true);
        this.ctx.setState('returning');
      }
    }
  }

  exit(): void {
    if (this.activeProjectile && !this.activeProjectile.isDestroyed) {
      this.activeProjectile.destroy();
    }
    this.activeProjectile = null;
  }

  private startThrow(): void {
    const playerAnim = this.ctx.playerEntity.get(AnimationComponent);
    if (playerAnim) {
      playerAnim.animationSystem.setTimeScale(ANIM_TIMESCALE_NORMAL);
    }

    const rockSprite = this.ctx.entity.get(SpriteComponent);
    if (rockSprite) {
      rockSprite.sprite.setVisible(false);
    }

    const rockTransform = this.ctx.entity.require(TransformComponent);
    const playerGridPos = this.ctx.playerEntity.get(GridPositionComponent);
    const startLayer = playerGridPos?.currentLayer ?? DEFAULT_LAYER;
    const playerCell = playerGridPos ? this.ctx.grid.getCell(playerGridPos.currentCell.col, playerGridPos.currentCell.row) : null;
    const startedOnStairs = playerCell ? this.ctx.grid.isTransition(playerCell) : false;

    const gameScene = this.ctx.scene as unknown as { entityManager?: EntityManager };
    const entityManager = gameScene.entityManager;
    if (!entityManager) {
      this.onProjectileLand(rockTransform.x, rockTransform.y);
      return;
    }

    const playerTransform = this.ctx.playerEntity.require(TransformComponent);
    const playerFeetY = playerTransform.y + PLAYER_FEET_OFFSET_Y_PX;
    const projectile = createRockProjectileEntity({
      scene: this.ctx.scene,
      x: rockTransform.x,
      y: rockTransform.y,
      dirX: this.ctx.throwDirX,
      dirY: this.ctx.throwDirY,
      speed: THROW_SPEED_PX_PER_SEC,
      maxDistance: THROW_DISTANCE_PX,
      damage: THROW_DAMAGE,
      arcHeight: THROW_ARC_HEIGHT_PX,
      grid: this.ctx.grid,
      blockedAreaManager: (this.ctx.scene as unknown as { blockedAreaManager?: import('../../../../systems/BlockedAreaManager').BlockedAreaManager }).blockedAreaManager,
      startLayer,
      startedOnStairs,
      playerFeetY,
      onLand: (x: number, y: number, landOffsetY: number) => {
        if (this.ctx.entity.isDestroyed) return;
        this.onProjectileLand(x, y, landOffsetY);
      },
      onHit: (x: number, y: number) => {
        if (this.ctx.entity.isDestroyed) return;
        this.onProjectileLand(x, y);
      },
    });

    this.activeProjectile = projectile;
    entityManager.add(projectile);
  }

  private onProjectileLand(x: number, y: number, landOffsetY: number = ROCK_LANDED_OFFSET_Y_PX): void {
    if (this.phase !== 'throwing') return;

    if (this.activeProjectile && !this.activeProjectile.isDestroyed) {
      this.activeProjectile.destroy();
    }
    this.activeProjectile = null;

    const rockTransform = this.ctx.entity.require(TransformComponent);
    rockTransform.x = x;
    rockTransform.y = y;

    const cell = this.ctx.grid.worldToCell(x, y);
    const cellData = this.ctx.grid.getCell(cell.col, cell.row);
    const landedInWater = cellData?.properties.has('water') ?? false;
    const landedInVoid = cellData?.properties.has('void') ?? false;

    const rockSprite = this.ctx.entity.get(SpriteComponent);
    if (landedInVoid) {
      if (rockSprite) {
        rockSprite.sprite.setVisible(true);
        rockSprite.visualOffsetYPx = landOffsetY;
      }
      this.phase = 'landed';
      this.landedTimerMs = 0;
      this.startVoidFall(rockTransform, rockSprite);
      return;
    } else if (landedInWater) {
      SoundManager.getInstance().play('splash1');
      const emitter = this.ctx.scene.add.particles(x, y, 'water_splash', {
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
      this.ctx.scene.time.delayedCall(SPLASH_EMIT_DURATION_MS, () => emitter.stop());
      this.ctx.scene.time.delayedCall(SPLASH_CLEANUP_DELAY_MS, () => emitter.destroy());
      if (rockSprite) rockSprite.sprite.setVisible(false);
    } else if (rockSprite) {
      rockSprite.sprite.setVisible(true);
      rockSprite.visualOffsetYPx = landOffsetY;
    }

    this.landedTimerMs = 0;
    this.phase = 'landed';
  }

  private startVoidFall(rockTransform: TransformComponent, rockSprite: SpriteComponent | undefined): void {
    const startY = rockTransform.y;
    const originalScale = rockTransform.scale;
    const startTime = this.ctx.scene.time.now;

    const updateFall = (): void => {
      const elapsed = this.ctx.scene.time.now - startTime;
      const progress = Math.min(1, elapsed / VOID_FALL_DURATION_MS);
      rockTransform.y = startY + progress * VOID_FALL_DRIFT_PX;
      rockTransform.scale = originalScale * (1 - progress);
      if (rockSprite) rockSprite.sprite.setAlpha(1 - progress);

      if (progress >= 1) {
        this.ctx.scene.events.off('update', updateFall);
        rockTransform.scale = originalScale;
        if (rockSprite) {
          rockSprite.sprite.setAlpha(1);
          rockSprite.sprite.setVisible(false);
        }
        this.ctx.setState('returning');
      }
    };

    this.ctx.scene.events.on('update', updateFall);
  }
}
