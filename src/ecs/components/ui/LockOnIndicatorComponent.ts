import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';

const INDICATOR_OFFSET_Y_PX = -40;
const INDICATOR_RADIUS_PX = 20;
const PULSE_SPEED = 0.003;
const PULSE_MIN_SCALE = 0.8;
const PULSE_MAX_SCALE = 1.2;

export type LockOnIndicatorComponentProps = {
  scene: Phaser.Scene;
  targetEntity: Entity;
}

export class LockOnIndicatorComponent implements Component {
  entity!: Entity;
  private readonly circle: Phaser.GameObjects.Graphics;
  private readonly targetEntity: Entity;
  private pulseTime: number = 0;

  constructor(props: LockOnIndicatorComponentProps) {
    this.targetEntity = props.targetEntity;
    this.circle = props.scene.add.graphics();
    this.circle.setDepth(1000);
  }

  update(delta: number): void {
    if (this.targetEntity.isDestroyed) {
      this.entity.destroy();
      return;
    }

    const targetTransform = this.targetEntity.get(TransformComponent);
    if (!targetTransform) {
      this.entity.destroy();
      return;
    }

    this.pulseTime += delta * PULSE_SPEED;
    const scale = PULSE_MIN_SCALE + (Math.sin(this.pulseTime) * 0.5 + 0.5) * (PULSE_MAX_SCALE - PULSE_MIN_SCALE);

    this.circle.clear();
    this.circle.lineStyle(3, 0x0088ff, 1);
    this.circle.strokeCircle(
      targetTransform.x,
      targetTransform.y + INDICATOR_OFFSET_Y_PX,
      INDICATOR_RADIUS_PX * scale
    );
  }

  onDestroy(): void {
    this.circle.destroy();
  }
}
