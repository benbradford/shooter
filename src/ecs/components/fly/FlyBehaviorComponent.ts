import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { HealthComponent } from '../core/HealthComponent';
import { CollisionComponent } from '../combat/CollisionComponent';
import { ShadowComponent } from '../visual/ShadowComponent';
import { getFlyAnimKey } from '../../entities/fly/FlyAnimations';
import { Direction, dirFromDelta } from '../../../constants/Direction';

const DETECT_RANGE_PX = 120;
const BOB_RADIUS_PX = 30;
const BOB_SPEED = 0.8;
const HOVER_HEIGHT_PX = 80;
const SWOOP_LOW_HEIGHT_PX = 15;
const SWOOP_SPEED_PX_PER_SEC = 150;
const SWOOP_RISE_SPEED_PX_PER_SEC = 200;
const SWOOP_COOLDOWN_MS = 2000;
const SWOOP_DAMAGE = 15;
const WIND_UP_MS = 300;
const OVERSHOOT_DISTANCE_PX = 80;

type FlyState = 'bob' | 'wind_up' | 'swoop_down' | 'swoop_overshoot' | 'swoop_up';

export type FlyBehaviorProps = {
  playerEntity: Entity;
  startX: number;
  startY: number;
};

export class FlyBehaviorComponent implements Component {
  entity!: Entity;
  private readonly playerEntity: Entity;
  private readonly startX: number;
  private readonly startY: number;
  private state: FlyState = 'bob';
  private bobAngle: number;
  private swoopTargetX = 0;
  private swoopTargetY = 0;
  private swoopDirX = 0;
  private swoopDirY = 0;
  private overshootX = 0;
  private overshootY = 0;
  private currentHeight = HOVER_HEIGHT_PX;
  private swoopCooldownMs = 0;
  private windUpTimerMs = 0;
  private hasHitPlayerThisSwoop = false;
  private lastDir: Direction = Direction.None;

  constructor(props: FlyBehaviorProps) {
    this.playerEntity = props.playerEntity;
    this.startX = props.startX;
    this.startY = props.startY;
    this.bobAngle = Math.random() * Math.PI * 2;
  }

  update(delta: number): void {
    switch (this.state) {
      case 'bob': this.updateBob(delta); break;
      case 'wind_up': this.updateWindUp(delta); break;
      case 'swoop_down': this.updateSwoopDown(delta); break;
      case 'swoop_overshoot': this.updateSwoopOvershoot(delta); break;
      case 'swoop_up': this.updateSwoopUp(delta); break;
    }
    this.updateVisuals();
  }

  isVulnerable(): boolean {
    return this.state === 'swoop_down' || this.state === 'swoop_overshoot';
  }

  private updateBob(delta: number): void {
    this.swoopCooldownMs = Math.max(0, this.swoopCooldownMs - delta);
    this.bobAngle += BOB_SPEED * (delta / 1000) * Math.PI * 2;

    const transform = this.entity.require(TransformComponent);
    transform.x = this.startX + Math.cos(this.bobAngle) * BOB_RADIUS_PX;
    transform.y = this.startY + Math.sin(this.bobAngle * 0.7) * BOB_RADIUS_PX * 0.5;
    this.currentHeight = HOVER_HEIGHT_PX;

    if (this.swoopCooldownMs <= 0) {
      const playerTransform = this.playerEntity.get(TransformComponent);
      if (playerTransform) {
        const dx = playerTransform.x - transform.x;
        const dy = playerTransform.y - transform.y;
        if (Math.hypot(dx, dy) < DETECT_RANGE_PX) {
          this.swoopTargetX = playerTransform.x;
          this.swoopTargetY = playerTransform.y;
          this.state = 'wind_up';
          this.windUpTimerMs = WIND_UP_MS;
        }
      }
    }
  }

  private updateWindUp(delta: number): void {
    this.windUpTimerMs -= delta;
    if (this.windUpTimerMs <= 0) {
      this.startSwoop();
    }
  }

  private startSwoop(): void {
    this.state = 'swoop_down';
    this.hasHitPlayerThisSwoop = false;
    const transform = this.entity.require(TransformComponent);
    const dx = this.swoopTargetX - transform.x;
    const dy = this.swoopTargetY - transform.y;
    const dist = Math.hypot(dx, dy);
    this.swoopDirX = dist > 0 ? dx / dist : 0;
    this.swoopDirY = dist > 0 ? dy / dist : 1;
    this.overshootX = this.swoopTargetX + this.swoopDirX * OVERSHOOT_DISTANCE_PX;
    this.overshootY = this.swoopTargetY + this.swoopDirY * OVERSHOOT_DISTANCE_PX;
  }

  private updateSwoopDown(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const dx = this.swoopTargetX - transform.x;
    const dy = this.swoopTargetY - transform.y;
    const dist = Math.hypot(dx, dy);

    const moveDist = SWOOP_SPEED_PX_PER_SEC * (delta / 1000);
    transform.x += this.swoopDirX * moveDist;
    transform.y += this.swoopDirY * moveDist;

    const totalDist = Math.hypot(this.swoopTargetX - this.startX, this.swoopTargetY - this.startY);
    const progress = 1 - (dist / Math.max(1, totalDist));
    this.currentHeight = HOVER_HEIGHT_PX - (HOVER_HEIGHT_PX - SWOOP_LOW_HEIGHT_PX) * Math.min(1, progress);

    this.checkSwoopDamage();

    if (dist <= moveDist) {
      this.currentHeight = SWOOP_LOW_HEIGHT_PX;
      this.state = 'swoop_overshoot';
    }
  }

  private updateSwoopOvershoot(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const dx = this.overshootX - transform.x;
    const dy = this.overshootY - transform.y;
    const dist = Math.hypot(dx, dy);

    const moveDist = SWOOP_SPEED_PX_PER_SEC * (delta / 1000);
    transform.x += this.swoopDirX * moveDist;
    transform.y += this.swoopDirY * moveDist;

    const progress = 1 - (dist / OVERSHOOT_DISTANCE_PX);
    this.currentHeight = SWOOP_LOW_HEIGHT_PX + (HOVER_HEIGHT_PX - SWOOP_LOW_HEIGHT_PX) * Math.min(1, progress) * 0.5;

    this.checkSwoopDamage();

    if (dist <= moveDist) {
      this.state = 'swoop_up';
    }
  }

  private updateSwoopUp(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const dx = this.startX - transform.x;
    const dy = this.startY - transform.y;
    const dist = Math.hypot(dx, dy);

    const moveDist = SWOOP_RISE_SPEED_PX_PER_SEC * (delta / 1000);
    if (dist > moveDist) {
      transform.x += (dx / dist) * moveDist;
      transform.y += (dy / dist) * moveDist;
    } else {
      transform.x = this.startX;
      transform.y = this.startY;
    }

    const totalReturn = Math.hypot(this.startX - this.overshootX, this.startY - this.overshootY);
    const progress = 1 - (dist / Math.max(1, totalReturn));
    this.currentHeight = (HOVER_HEIGHT_PX * 0.5) + (HOVER_HEIGHT_PX * 0.5) * Math.min(1, progress);

    if (dist <= moveDist) {
      this.currentHeight = HOVER_HEIGHT_PX;
      this.state = 'bob';
      this.swoopCooldownMs = SWOOP_COOLDOWN_MS;
      this.bobAngle = Math.random() * Math.PI * 2;
    }
  }

  private checkSwoopDamage(): void {
    if (this.hasHitPlayerThisSwoop) return;
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.get(TransformComponent);
    if (!playerTransform) return;

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    if (Math.hypot(dx, dy) < 32 && this.currentHeight < 30) {
      this.hasHitPlayerThisSwoop = true;
      const playerHealth = this.playerEntity.get(HealthComponent);
      if (playerHealth) {
        playerHealth.takeDamage(SWOOP_DAMAGE);
      }
    }
  }

  private updateVisuals(): void {
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.visualOffsetYPx = -this.currentHeight;
      const transform = this.entity.require(TransformComponent);
      const { dx, dy } = this.getMovementDirection(transform);
      if (Math.hypot(dx, dy) > 1) {
        const dir = dirFromDelta(dx, dy);
        if (dir !== this.lastDir) {
          this.lastDir = dir;
          const animKey = getFlyAnimKey(dir);
          if (sprite.sprite.anims.currentAnim?.key !== animKey) {
            sprite.sprite.play(animKey);
          }
        }
      }
    }

    const shadow = this.entity.get(ShadowComponent);
    if (shadow?.shadow) {
      const heightRatio = this.currentHeight / HOVER_HEIGHT_PX;
      shadow.shadow.setScale(0.4 + 0.2 * (1 - heightRatio));
      shadow.shadow.setAlpha(0.3 + 0.4 * (1 - heightRatio));
    }

    const collision = this.entity.get(CollisionComponent);
    if (collision) {
      collision.enabled = this.state === 'swoop_down' || this.state === 'swoop_overshoot';
      collision.box.offsetY = -16 - this.currentHeight;
    }
  }

  private getMovementDirection(transform: TransformComponent): { dx: number; dy: number } {
    if (this.state === 'swoop_down' || this.state === 'swoop_overshoot') {
      return { dx: this.swoopDirX, dy: this.swoopDirY };
    }
    if (this.state === 'swoop_up') {
      return { dx: this.startX - transform.x, dy: this.startY - transform.y };
    }
    return { dx: Math.cos(this.bobAngle), dy: Math.sin(this.bobAngle * 0.7) };
  }
}
