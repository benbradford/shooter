import type { IState } from '../../../ecs/systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { getThrowerDifficultyConfig } from './ThrowerDifficultyConfig';
import { dirFromDelta, directionToAnimationName } from '../../../constants/Direction';

const THROW_ANIMATION_DURATION_MS = 583;

export class ThrowerThrowingState implements IState {
  private elapsedMs: number = 0;
  private hasThrown: boolean = false;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly onThrow: (x: number, y: number, dirX: number, dirY: number, throwDistancePx: number) => void
  ) {}

  onEnter(): void {
    this.elapsedMs = 0;
    this.hasThrown = false;

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    
    const dir = dirFromDelta(dx, dy);
    const dirName = directionToAnimationName(dir);
    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.play(`thrower_throw_${dirName}`);
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    if (!this.hasThrown && this.elapsedMs >= THROW_ANIMATION_DURATION_MS / 2) {
      this.hasThrown = true;
      this.throwGrenade();
    }

    if (this.elapsedMs >= THROW_ANIMATION_DURATION_MS) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('running');
    }
  }

  private throwGrenade(): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const difficulty = this.entity.require(DifficultyComponent);
    const config = getThrowerDifficultyConfig(difficulty.difficulty);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const length = Math.hypot(dx, dy);

    this.onThrow(
      transform.x,
      transform.y,
      dx / length,
      dy / length,
      config.throwDistancePx
    );
  }
}
