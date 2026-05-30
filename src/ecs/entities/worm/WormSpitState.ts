import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { Direction } from '../../../constants/Direction';
import { getWormAnimKey } from './WormAnimations';

const SPIT_EMIT_FRAME = 2;
const SPIT_ANIM_DURATION_MS = 500;

export class WormSpitState implements IState {
  private elapsedMs = 0;
  private hasEmitted = false;
  private spitDirection = Direction.Down;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly onSpit: (x: number, y: number, dirX: number, dirY: number) => void
  ) {}

  onEnter(): void {
    this.elapsedMs = 0;
    this.hasEmitted = false;

    // Face the player in nearest cardinal direction
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;

    // Pick cardinal direction
    if (Math.abs(dx) > Math.abs(dy)) {
      this.spitDirection = dx > 0 ? Direction.Right : Direction.Left;
    } else {
      this.spitDirection = dy > 0 ? Direction.Down : Direction.Up;
    }

    const animKey = getWormAnimKey('spit', this.spitDirection);
    this.entity.require(SpriteComponent).sprite.play(animKey);
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    // Emit projectile on frame 3 (index 2) — roughly 40% through the animation
    const emitTimeMs = (SPIT_EMIT_FRAME / 5) * SPIT_ANIM_DURATION_MS;
    if (!this.hasEmitted && this.elapsedMs >= emitTimeMs) {
      this.hasEmitted = true;
      const transform = this.entity.require(TransformComponent);

      const dirMap: Record<number, { dx: number; dy: number }> = {
        [Direction.Up]: { dx: 0, dy: -1 },
        [Direction.Down]: { dx: 0, dy: 1 },
        [Direction.Left]: { dx: -1, dy: 0 },
        [Direction.Right]: { dx: 1, dy: 0 },
      };
      const dir = dirMap[this.spitDirection] ?? { dx: 0, dy: 1 };
      this.onSpit(transform.x, transform.y, dir.dx, dir.dy);
    }

    if (this.elapsedMs >= SPIT_ANIM_DURATION_MS) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('wander');
    }
  }
}
