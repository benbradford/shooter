import type Phaser from 'phaser';
import type { RockThrowContext, RockThrowStateHandler } from './RockThrowTypes';
import { TransformComponent } from '../../core/TransformComponent';
import { SpriteComponent } from '../../core/SpriteComponent';
import { AnimationComponent } from '../../core/AnimationComponent';
import { HealthComponent } from '../../core/HealthComponent';
import { WalkComponent } from '../../movement/WalkComponent';
import { PetFollowComponent } from '../PetFollowComponent';
import { PetAbilityComponent } from '../PetAbilityComponent';
import { GridCollisionComponent } from '../../movement/GridCollisionComponent';
import { Depth } from '../../../../constants/DepthConstants';
import { Direction } from '../../../../constants/Direction';

const ROCK_CHARGE_TWEEN_DURATION_MS = 300;
const HOLD_FRAME_INDEX = 2;
const ANIM_TIMESCALE_NORMAL = 1;
const ANIM_TIMESCALE_PAUSED = 0;
const DEFAULT_HEALTH = 100;

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

export { PLAYER_THROW_OFFSETS };

export class RockChargingState implements RockThrowStateHandler {
  private chargeTween: Phaser.Tweens.Tween | null = null;
  private chargeComplete = false;

  constructor(private readonly ctx: RockThrowContext) {}

  enter(): void {
    this.chargeComplete = false;

    // Get player's current facing direction
    const walk = this.ctx.playerEntity.get(WalkComponent);
    if (walk) {
      this.ctx.throwDir = walk.lastDir;
      this.ctx.throwDirX = walk.lastMoveX;
      this.ctx.throwDirY = walk.lastMoveY;
    }

    // Normalize throw direction
    const len = Math.hypot(this.ctx.throwDirX, this.ctx.throwDirY);
    if (len > 0) {
      this.ctx.throwDirX /= len;
      this.ctx.throwDirY /= len;
    }

    this.updateRockDepth();

    // Store health for damage polling
    const health = this.ctx.playerEntity.get(HealthComponent);
    this.ctx.lastKnownHealth = health?.getHealth() ?? DEFAULT_HEALTH;

    // Pause pet follow and disable grid collision
    const follow = this.ctx.entity.get(PetFollowComponent);
    follow?.setBarking(true);
    const gridCollision = this.ctx.entity.get(GridCollisionComponent);
    if (gridCollision) gridCollision.enabled = false;

    // Play player throw animation, freeze at frame 2
    const playerAnim = this.ctx.playerEntity.get(AnimationComponent);
    if (playerAnim) {
      playerAnim.animationSystem.play(`throw_${this.ctx.throwDir}`);
      playerAnim.animationSystem.setTimeScale(ANIM_TIMESCALE_NORMAL);
    }

    // Tween rock to player offset position
    const playerTransform = this.ctx.playerEntity.require(TransformComponent);
    const rockTransform = this.ctx.entity.require(TransformComponent);
    const offset = PLAYER_THROW_OFFSETS[this.ctx.throwDir];
    const targetX = playerTransform.x + offset.x;
    const targetY = playerTransform.y + offset.y;

    this.chargeTween = this.ctx.scene.tweens.add({
      targets: rockTransform,
      x: targetX,
      y: targetY,
      duration: ROCK_CHARGE_TWEEN_DURATION_MS,
      ease: 'Quad.Out',
      onComplete: () => {
        const pt = this.ctx.playerEntity.require(TransformComponent);
        const off = PLAYER_THROW_OFFSETS[this.ctx.throwDir];
        rockTransform.x = pt.x + off.x;
        rockTransform.y = pt.y + off.y;
        this.chargeComplete = true;
      }
    });
  }

  update(_delta: number): void {
    // Freeze player at throw frame 2
    const playerAnim = this.ctx.playerEntity.get(AnimationComponent);
    if (playerAnim) {
      const currentAnim = playerAnim.animationSystem.getCurrentAnimation();
      if (currentAnim && currentAnim.getIndex() >= HOLD_FRAME_INDEX) {
        currentAnim.setIndex(HOLD_FRAME_INDEX);
        playerAnim.animationSystem.setTimeScale(ANIM_TIMESCALE_PAUSED);
      }
    }

    if (!this.chargeComplete) return;

    if (this.isButtonHeld()) {
      this.ctx.setState('aiming');
      return;
    }

    // Button released — go to throwing
    this.ctx.setState('throwing');
  }

  exit(): void {
    this.chargeTween?.stop();
    this.chargeTween = null;
  }

  stopTween(): void {
    this.chargeTween?.stop();
    this.chargeTween = null;
  }

  private isButtonHeld(): boolean {
    const petAbility = this.ctx.playerEntity.get(PetAbilityComponent);
    return petAbility?.isAbilityHeld() ?? false;
  }

  private updateRockDepth(): void {
    const sprite = this.ctx.entity.get(SpriteComponent);
    if (!sprite) return;
    const z = PLAYER_THROW_OFFSETS[this.ctx.throwDir].z;
    sprite.sprite.setDepth(Depth.player + z);
  }
}
