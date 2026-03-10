import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { dirFromDelta } from '../../../constants/Direction';
import { getPumaAnimKey } from './PumaAnimations';

const DEATH_DURATION_MS = 1000;
const KNOCKBACK_DISTANCE_PX = 80;
const BOUNCE_HEIGHT_PX = 40;
const ROTATION_SPEED_DEG = 360;

export class PumaDeathState implements IState {
  private elapsedMs = 0;
  private startX = 0;
  private startY = 0;
  private knockbackDirX = 0;
  private knockbackDirY = 0;
  private rotationDir = 1;

  constructor(
    private readonly entity: Entity,
    _scene: Phaser.Scene,
    private readonly playerEntity: Entity
  ) {}

  onEnter(): void {
    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);

    this.startX = transform.x;
    this.startY = transform.y;
    this.elapsedMs = 0;

    const dx = transform.x - playerTransform.x;
    const dy = transform.y - playerTransform.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0) {
      this.knockbackDirX = dx / dist;
      this.knockbackDirY = dy / dist;
    } else {
      this.knockbackDirX = 1;
      this.knockbackDirY = 0;
    }

    this.rotationDir = this.knockbackDirX > 0 ? 1 : -1;

    const direction = dirFromDelta(-dx, -dy);
    const animKey = getPumaAnimKey('idle', direction);
    sprite.sprite.play(animKey);
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);
    const shadow = this.entity.require(ShadowComponent);

    const progress = Math.min(1, this.elapsedMs / DEATH_DURATION_MS);

    const knockbackDist = KNOCKBACK_DISTANCE_PX * progress;
    transform.x = this.startX + this.knockbackDirX * knockbackDist;
    transform.y = this.startY + this.knockbackDirY * knockbackDist;

    const bounceOffset = Math.sin(progress * Math.PI) * BOUNCE_HEIGHT_PX;
    sprite.sprite.y = transform.y - bounceOffset;

    const rotation = this.rotationDir * ROTATION_SPEED_DEG * progress;
    sprite.sprite.angle = rotation;

    sprite.sprite.alpha = 1 - progress;
    shadow.shadow.alpha = 1 - progress;

    if (progress >= 1) {
      this.entity.destroy();
    }
  }
}
