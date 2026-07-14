import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';

const FOLLOW_LERP = 0.04;
const FLOAT_OFFSET_X_PX = 28;
const FLOAT_OFFSET_Y_PX = -20;
const BOB_AMPLITUDE_PX = 4;
const BOB_SPEED = 3;
const BASE_SCALE = 0.4;
const SCALE_PULSE_AMPLITUDE = 0.05;
const SCALE_PULSE_SPEED = 2.5;

export class BubbleFollowComponent implements Component {
  entity!: Entity;
  private readonly playerEntity: Entity;
  private elapsedSec = 0;

  constructor(playerEntity: Entity) {
    this.playerEntity = playerEntity;
  }

  update(delta: number): void {
    this.elapsedSec += delta / 1000;
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);

    const targetX = playerTransform.x + FLOAT_OFFSET_X_PX;
    const bobY = Math.sin(this.elapsedSec * BOB_SPEED) * BOB_AMPLITUDE_PX;
    const targetY = playerTransform.y + FLOAT_OFFSET_Y_PX + bobY;

    transform.x += (targetX - transform.x) * FOLLOW_LERP;
    transform.y += (targetY - transform.y) * FOLLOW_LERP;

    transform.scale = BASE_SCALE + Math.sin(this.elapsedSec * SCALE_PULSE_SPEED) * SCALE_PULSE_AMPLITUDE;
  }
}
