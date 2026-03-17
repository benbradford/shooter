import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { FearComponent } from '../../components/combat/FearComponent';
import { dirFromDelta, type Direction } from '../../../constants/Direction';

const FEAR_SPEED_MULTIPLIER = 0.6;
const FEAR_ZIGZAG_AMPLITUDE_RAD = 1.2;
const FEAR_DIRECTION_CHANGE_INTERVAL_MS = 300;

export class EnemyFearState {
  private baseFleeAngleRad = 0;
  private currentAngleRad = 0;
  private timeSinceChangeMs = 0;

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
    this.baseFleeAngleRad = Math.atan2(dy, dx);
    this.timeSinceChangeMs = FEAR_DIRECTION_CHANGE_INTERVAL_MS;
    this.pickNewZigzagAngle();
  }

  onUpdate(delta: number): void {
    this.timeSinceChangeMs += delta;
    if (this.timeSinceChangeMs >= FEAR_DIRECTION_CHANGE_INTERVAL_MS) {
      this.timeSinceChangeMs = 0;
      this.pickNewZigzagAngle();
    }

    const transform = this.entity.require(TransformComponent);
    const movePx = this.baseSpeedPxPerSec * FEAR_SPEED_MULTIPLIER * (delta / 1000);

    transform.x += Math.cos(this.currentAngleRad) * movePx;
    transform.y += Math.sin(this.currentAngleRad) * movePx;
  }

  private pickNewZigzagAngle(): void {
    const jitter = (Math.random() - 0.5) * 2 * FEAR_ZIGZAG_AMPLITUDE_RAD;
    this.currentAngleRad = this.baseFleeAngleRad + jitter;

    const direction = dirFromDelta(Math.cos(this.currentAngleRad), Math.sin(this.currentAngleRad));
    this.onFlee(direction);
  }
}
