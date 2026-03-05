import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { dirFromDelta } from '../../../constants/Direction';
import { getThrowerAnimKey } from './ThrowerAnimations';

const DEATH_ANIMATION_DURATION_MS = 583;
const FADE_START_MS = 300;

export class ThrowerDeathState implements IState {
  private elapsedMs: number = 0;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity
  ) {}

  onEnter(): void {
    this.elapsedMs = 0;
    
    const collision = this.entity.get(CollisionComponent);
    if (collision) {
      this.entity.remove(CollisionComponent);
    }
    
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const dir = dirFromDelta(dx, dy);
    
    const animKey = getThrowerAnimKey('death', dir);
    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.play(animKey);
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    if (this.elapsedMs >= FADE_START_MS) {
      const sprite = this.entity.require(SpriteComponent);
      const fadeProgress = (this.elapsedMs - FADE_START_MS) / (DEATH_ANIMATION_DURATION_MS - FADE_START_MS);
      sprite.sprite.setAlpha(Math.max(0, 1 - fadeProgress));
    }

    if (this.elapsedMs >= DEATH_ANIMATION_DURATION_MS) {
      this.entity.destroy();
    }
  }
}
