import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';

const OFFSET_DISTANCE_PX = 20;
const HITBOX_LIFETIME_MS = 250;

export type PunchHitboxComponentProps = {
  playerEntity: Entity;
  dirX: number;
  dirY: number;
}

export class PunchHitboxComponent implements Component {
  entity!: Entity;
  private readonly playerEntity: Entity;
  private readonly dirX: number;
  private readonly dirY: number;
  private lifetime: number = 0;

  constructor(props: PunchHitboxComponentProps) {
    this.playerEntity = props.playerEntity;
    this.dirX = props.dirX;
    this.dirY = props.dirY;
  }

  update(delta: number): void {
    this.lifetime += delta;

    if (this.lifetime >= HITBOX_LIFETIME_MS) {
      this.entity.destroy();
      return;
    }

    const playerTransform = this.playerEntity.get(TransformComponent);
    const transform = this.entity.get(TransformComponent);

    if (playerTransform && transform) {
      transform.x = playerTransform.x + this.dirX * OFFSET_DISTANCE_PX;
      transform.y = playerTransform.y + this.dirY * OFFSET_DISTANCE_PX;
    }
  }

  onDestroy(): void {
    // No cleanup needed
  }
}
