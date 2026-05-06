import type { RockThrowContext, RockThrowStateHandler } from './RockThrowTypes';
import { TransformComponent } from '../../core/TransformComponent';
import { SpriteComponent } from '../../core/SpriteComponent';
import { AnimationComponent } from '../../core/AnimationComponent';
import { GridCollisionComponent } from '../../movement/GridCollisionComponent';
import { PetFollowComponent } from '../PetFollowComponent';
import { PetAbilityComponent } from '../PetAbilityComponent';
import { Depth } from '../../../../constants/DepthConstants';

const ROCK_RETURN_SPEED_PX_PER_SEC = 600;
const RETURN_ARRIVE_THRESHOLD_PX = 5;
const ANIM_TIMESCALE_NORMAL = 1;

export class RockReturningState implements RockThrowStateHandler {
  constructor(private readonly ctx: RockThrowContext) {}

  update(delta: number): void {
    const playerTransform = this.ctx.playerEntity.get(TransformComponent);
    if (!playerTransform) {
      this.returnToIdle();
      return;
    }

    const rockTransform = this.ctx.entity.require(TransformComponent);
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

  private returnToIdle(): void {
    const rockSprite = this.ctx.entity.get(SpriteComponent);
    if (rockSprite) {
      rockSprite.sprite.setVisible(true);
      rockSprite.sprite.setDepth(Depth.pet);
      rockSprite.visualOffsetYPx = 0;
    }

    const follow = this.ctx.entity.get(PetFollowComponent);
    follow?.setBarking(false);
    const gridCollision = this.ctx.entity.get(GridCollisionComponent);
    if (gridCollision) gridCollision.enabled = true;

    const playerAnim = this.ctx.playerEntity.get(AnimationComponent);
    if (playerAnim) {
      playerAnim.animationSystem.setTimeScale(ANIM_TIMESCALE_NORMAL);
    }

    const petAbility = this.ctx.playerEntity.get(PetAbilityComponent);
    petAbility?.startCooldown();

    this.ctx.setState('idle');
  }
}
