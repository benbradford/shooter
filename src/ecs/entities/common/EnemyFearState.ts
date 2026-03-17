import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { FearComponent } from '../../components/combat/FearComponent';
import { dirFromDelta, type Direction } from '../../../constants/Direction';

const FEAR_SPEED_MULTIPLIER = 1.2;
const FEAR_DIRECTION_JITTER_RAD = 0.26;

export class EnemyFearState {
  private fleeAngleRad = 0;

  constructor(
    private readonly entity: Entity,
    private readonly baseSpeedPxPerSec: number,
    private readonly onFlee: (direction: Direction) => void
  ) {}

  onEnter(): void {
    const fear = this.entity.get(FearComponent);
    if (!fear) return;

    const transform = this.entity.require(TransformComponent);
    const dx = transform.x - fear.sourceX;
    const dy = transform.y - fear.sourceY;
    const jitter = (Math.random() - 0.5) * 2 * FEAR_DIRECTION_JITTER_RAD;
    this.fleeAngleRad = Math.atan2(dy, dx) + jitter;

    const direction = dirFromDelta(Math.cos(this.fleeAngleRad), Math.sin(this.fleeAngleRad));
    this.onFlee(direction);
  }

  onUpdate(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const movePx = this.baseSpeedPxPerSec * FEAR_SPEED_MULTIPLIER * (delta / 1000);

    transform.x += Math.cos(this.fleeAngleRad) * movePx;
    transform.y += Math.sin(this.fleeAngleRad) * movePx;
  }
}
