import type { RockThrowContext, RockThrowStateHandler } from './RockThrowTypes';
import { TransformComponent } from '../../core/TransformComponent';
import { SpriteComponent } from '../../core/SpriteComponent';
import { AnimationComponent } from '../../core/AnimationComponent';
import { InputComponent } from '../../input/InputComponent';
import { PetAbilityComponent } from '../PetAbilityComponent';
import { Depth } from '../../../../constants/DepthConstants';
import { dirFromDelta } from '../../../../constants/Direction';
import { PLAYER_THROW_OFFSETS } from './RockChargingState';

const HOLD_FRAME_INDEX = 2;
const ANIM_TIMESCALE_PAUSED = 0;

export class RockAimingState implements RockThrowStateHandler {
  constructor(private readonly ctx: RockThrowContext) {}

  enter(): void {
    this.ctx.arrowIndicator.show();
  }

  update(_delta: number): void {
    const playerAnim = this.ctx.playerEntity.get(AnimationComponent);

    // Read joystick for direction
    const input = this.ctx.playerEntity.get(InputComponent);
    const rawInput = input?.getRawInputDelta();
    if (rawInput && (rawInput.dx !== 0 || rawInput.dy !== 0)) {
      const newDir = dirFromDelta(rawInput.dx, rawInput.dy);
      const len = Math.hypot(rawInput.dx, rawInput.dy);
      this.ctx.throwDirX = rawInput.dx / len;
      this.ctx.throwDirY = rawInput.dy / len;

      if (newDir !== this.ctx.throwDir) {
        this.ctx.throwDir = newDir;
        if (playerAnim) {
          playerAnim.animationSystem.play(`throw_${this.ctx.throwDir}`);
        }
        // Reposition rock to new offset
        const playerTransform = this.ctx.playerEntity.require(TransformComponent);
        const rockTransform = this.ctx.entity.require(TransformComponent);
        const offset = PLAYER_THROW_OFFSETS[this.ctx.throwDir];
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
        playerAnim.animationSystem.setTimeScale(ANIM_TIMESCALE_PAUSED);
      }
    }

    // Draw arrow
    const arrowPlayerTransform = this.ctx.playerEntity.require(TransformComponent);
    this.ctx.arrowIndicator.draw(arrowPlayerTransform.x, arrowPlayerTransform.y, this.ctx.throwDirX, this.ctx.throwDirY);

    // Check for release
    if (!this.isButtonHeld()) {
      this.ctx.setState('throwing');
    }
  }

  exit(): void {
    this.ctx.arrowIndicator.destroy();
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
