import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';

const FOLLOW_LERP = 0.03;
const OVERSHOOT_PX = 14;
const OVERSHOOT_LERP = 0.04;
const OFFSET_AHEAD_PX = 80;
const OFFSET_SIDE_PX = 32;
const TELEPORT_DISTANCE_PX = 600;

// Idle restlessness
const IDLE_ORBIT_RADIUS_PX = 28;
const IDLE_ORBIT_SPEED_RAD_PER_SEC = 0.8;
const RESTLESS_DELAY_MS = 2000;
const RESTLESS_RAMP_MS = 3000;

export class CompanionFollowComponent implements Component {
  entity!: Entity;

  private readonly playerEntity: Entity;
  private targetX = 0;
  private targetY = 0;
  private dirX = 0;
  private dirY = 1;
  private lastPlayerX = 0;
  private lastPlayerY = 0;
  private playerStoppedMs = 0;
  private orbitAngleRad = 0;
  private wasPlayerMoving = false;
  private overshootX = 0;
  private overshootY = 0;
  private isOvershooting = false;

  constructor(playerEntity: Entity) {
    this.playerEntity = playerEntity;
  }

  update(delta: number): void {
    const t = this.entity.require(TransformComponent);
    const pt = this.playerEntity.require(TransformComponent);
    const deltaSec = delta / 1000;

    const pdx = pt.x - this.lastPlayerX;
    const pdy = pt.y - this.lastPlayerY;
    const playerMoving = Math.hypot(pdx, pdy) > 0.5;

    if (playerMoving) {
      const len = Math.hypot(pdx, pdy);
      this.dirX = pdx / len;
      this.dirY = pdy / len;
      this.playerStoppedMs = 0;
      this.isOvershooting = false;
      this.wasPlayerMoving = true;

      // Target: ahead-right of player
      const perpX = -this.dirY;
      const perpY = this.dirX;
      this.targetX = pt.x + this.dirX * OFFSET_AHEAD_PX + perpX * OFFSET_SIDE_PX;
      this.targetY = pt.y + this.dirY * OFFSET_AHEAD_PX + perpY * OFFSET_SIDE_PX;

      // Smooth follow
      t.x += (this.targetX - t.x) * FOLLOW_LERP;
      t.y += (this.targetY - t.y) * FOLLOW_LERP;
    } else {
      this.playerStoppedMs += delta;

      // Overshoot on stop
      if (this.wasPlayerMoving && !this.isOvershooting) {
        this.overshootX = t.x + this.dirX * OVERSHOOT_PX;
        this.overshootY = t.y + this.dirY * OVERSHOOT_PX;
        this.isOvershooting = true;
        this.wasPlayerMoving = false;
      }

      if (this.isOvershooting) {
        t.x += (this.overshootX - t.x) * OVERSHOOT_LERP;
        t.y += (this.overshootY - t.y) * OVERSHOOT_LERP;
        if (Math.hypot(this.overshootX - t.x, this.overshootY - t.y) < 1) {
          this.isOvershooting = false;
        }
      }

      // Restless idle orbit — ramps up over time
      const restlessT = Math.max(0, this.playerStoppedMs - RESTLESS_DELAY_MS) / RESTLESS_RAMP_MS;
      const orbitStrength = Math.min(1, restlessT);

      if (orbitStrength > 0) {
        this.orbitAngleRad += IDLE_ORBIT_SPEED_RAD_PER_SEC * deltaSec;
        const radius = IDLE_ORBIT_RADIUS_PX * orbitStrength;
        const orbitX = pt.x + Math.cos(this.orbitAngleRad) * radius;
        const orbitY = pt.y + Math.sin(this.orbitAngleRad) * radius;
        t.x += (orbitX - t.x) * FOLLOW_LERP;
        t.y += (orbitY - t.y) * FOLLOW_LERP;
      } else if (!this.isOvershooting) {
        // Drift toward idle offset
        const perpX = -this.dirY;
        const perpY = this.dirX;
        const idleX = pt.x + perpX * OFFSET_SIDE_PX * 0.5;
        const idleY = pt.y + perpY * OFFSET_SIDE_PX * 0.5;
        t.x += (idleX - t.x) * OVERSHOOT_LERP;
        t.y += (idleY - t.y) * OVERSHOOT_LERP;
      }
    }

    this.lastPlayerX = pt.x;
    this.lastPlayerY = pt.y;

    // Teleport if too far
    if (Math.hypot(t.x - pt.x, t.y - pt.y) > TELEPORT_DISTANCE_PX) {
      t.x = pt.x + OFFSET_SIDE_PX;
      t.y = pt.y - OFFSET_AHEAD_PX;
    }
  }
}
