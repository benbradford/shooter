import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { GridPositionComponent } from './GridPositionComponent';
import { Depth } from '../../../constants/DepthConstants';

const HOP_DURATION_MS = 500;
const HOP_HEIGHT_PX = 30;

export class BugHopComponent implements Component {
  entity!: Entity;
  private isHopping = false;
  private wasHopping = false;
  private hopTimer = 0;
  private startX = 0;
  private startY = 0;
  private targetX = 0;
  private targetY = 0;
  private targetCol = 0;
  private targetRow = 0;

  hop(targetX: number, targetY: number, targetCol: number, targetRow: number): void {
    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    this.isHopping = true;
    this.hopTimer = 0;
    this.startX = transform.x;
    this.startY = transform.y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.targetCol = targetCol;
    this.targetRow = targetRow;

    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    let frame = 0;
    if (Math.abs(dx) > Math.abs(dy)) {
      frame = dx > 0 ? 12 : 8;
    } else {
      frame = dy > 0 ? 0 : 4;
    }
    sprite.sprite.setFrame(frame);
  }

  update(delta: number): void {
    this.wasHopping = this.isHopping;

    if (!this.isHopping) return;

    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    this.hopTimer += delta;
    const progress = Math.min(this.hopTimer / HOP_DURATION_MS, 1);

    transform.x = this.startX + (this.targetX - this.startX) * progress;
    transform.y = this.startY + (this.targetY - this.startY) * progress;

    const hopOffset = Math.sin(progress * Math.PI) * HOP_HEIGHT_PX;
    sprite.sprite.y = transform.y - hopOffset;
    sprite.sprite.setDepth(Depth.enemyFlying + Math.floor(hopOffset));

    if (progress >= 1) {
      this.isHopping = false;
      sprite.sprite.y = transform.y;
      sprite.sprite.setDepth(Depth.enemyFlying);
      transform.x = this.targetX;
      transform.y = this.targetY;

      const gridPos = this.entity.get(GridPositionComponent);
      if (gridPos) {
        gridPos.currentCell.col = this.targetCol;
        gridPos.currentCell.row = this.targetRow;
      }
    }
  }

  isActive(): boolean {
    return this.isHopping;
  }

  justEnded(): boolean {
    return this.wasHopping && !this.isHopping;
  }

}
