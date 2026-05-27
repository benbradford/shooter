/**
 * Zero-allocation distance/proximity check used by AI components that follow the player
 * (or any moving target).
 *
 * Pattern eliminated: AI components compute `dx = target.x - self.x; dy = target.y - self.y;
 * distance = Math.hypot(dx, dy)` and then make threshold decisions (teleport / start following /
 * stop and wander). PetFollowComponent had this duplicated 4 times across its state handlers;
 * EscortComponent and BugChaseState have variants of the same shape.
 *
 * Result is a single mutable field — `result` — so per-frame calls allocate nothing.
 */
export type ProximityThresholds = {
  /** Distance above which the follower should teleport (catch-up). 0 disables. */
  teleportPx: number;
  /** Distance above which the follower should start moving toward the target. */
  followPx: number;
  /** Distance at or below which the follower should stop. */
  stopPx: number;
};

export type ProximityResult = {
  /** target.x - self.x */
  dx: number;
  /** target.y - self.y */
  dy: number;
  /** Math.hypot(dx, dy) */
  distancePx: number;
  shouldTeleport: boolean;
  shouldFollow: boolean;
  shouldStop: boolean;
};

export class PlayerProximityChecker {
  /** Mutated in place by every check() call. Treat as ephemeral — read-only between calls. */
  readonly result: ProximityResult = {
    dx: 0, dy: 0, distancePx: 0,
    shouldTeleport: false, shouldFollow: false, shouldStop: false,
  };

  constructor(private readonly thresholds: ProximityThresholds) {}

  check(fromX: number, fromY: number, toX: number, toY: number): ProximityResult {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy);
    const r = this.result;
    r.dx = dx;
    r.dy = dy;
    r.distancePx = dist;
    r.shouldTeleport = this.thresholds.teleportPx > 0 && dist > this.thresholds.teleportPx;
    r.shouldFollow = dist > this.thresholds.followPx;
    r.shouldStop = dist <= this.thresholds.stopPx;
    return r;
  }
}
