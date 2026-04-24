import type { TransformComponent } from '../../components/core/TransformComponent';
import { Direction, dirFromDelta } from '../../../constants/Direction';

export type PathNode = { col: number; row: number };

export type PathFollowerResult = {
  readonly dx: number;
  readonly dy: number;
  readonly arrived: boolean;
  readonly direction: Direction;
};

const ARRIVED_RESULT: PathFollowerResult = { dx: 0, dy: 0, arrived: true, direction: Direction.None };

export class PathFollower {
  private path: PathNode[] | null = null;
  private currentPathIndex = 0;

  constructor(
    private readonly cellSizePx: number,
    private readonly arrivalThresholdPx: number
  ) {}

  setPath(path: PathNode[] | null, startIndex = 1): void {
    this.path = path;
    this.currentPathIndex = startIndex;
  }

  hasPath(): boolean {
    return this.path !== null && this.currentPathIndex < this.path.length;
  }

  getPath(): PathNode[] | null {
    return this.path;
  }

  clear(): void {
    this.path = null;
    this.currentPathIndex = 0;
  }

  follow(transform: TransformComponent, speedPxPerSec: number, delta: number): PathFollowerResult {
    if (!this.path || this.currentPathIndex >= this.path.length) {
      this.path = null;
      return ARRIVED_RESULT;
    }

    const target = this.path[this.currentPathIndex];
    const targetX = target.col * this.cellSizePx + this.cellSizePx / 2;
    const targetY = target.row * this.cellSizePx + this.cellSizePx / 2;
    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.arrivalThresholdPx) {
      this.currentPathIndex++;
      if (this.currentPathIndex >= this.path.length) {
        this.path = null;
        return ARRIVED_RESULT;
      }
      return { dx, dy, arrived: false, direction: dirFromDelta(dx, dy) };
    }

    const moveDist = speedPxPerSec * (delta / 1000);
    if (moveDist >= dist) {
      transform.x = targetX;
      transform.y = targetY;
    } else {
      transform.x += (dx / dist) * moveDist;
      transform.y += (dy / dist) * moveDist;
    }

    return { dx, dy, arrived: false, direction: dirFromDelta(dx, dy) };
  }
}
