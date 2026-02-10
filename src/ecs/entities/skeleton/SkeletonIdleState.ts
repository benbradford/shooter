import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { Direction } from '../../../constants/Direction';

const IDLE_MIN_DURATION_MS = 500;
const IDLE_MAX_DURATION_MS = 1000;

export class SkeletonIdleState implements IState {
  private elapsedMs = 0;
  private durationMs = 0;

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    this.elapsedMs = 0;
    this.durationMs = IDLE_MIN_DURATION_MS + Math.random() * (IDLE_MAX_DURATION_MS - IDLE_MIN_DURATION_MS);

    const sprite = this.entity.require(SpriteComponent);
    const dirName = Direction[Direction.Down].toLowerCase();
    sprite.sprite.play(`skeleton_idle_${dirName}`);
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    if (this.elapsedMs >= this.durationMs) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('walk');
    }
  }
}
