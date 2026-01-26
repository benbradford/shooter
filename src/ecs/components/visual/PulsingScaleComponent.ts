import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';

export interface PulsingScaleComponentProps {
  baseScale: number;
  amplitude: number;
  frequency: number;
}

export class PulsingScaleComponent implements Component {
  entity!: Entity;
  private readonly baseScale: number;
  private readonly amplitude: number;
  private readonly frequency: number;
  private scaleTimer: number = 0;

  constructor(props: PulsingScaleComponentProps) {
    this.baseScale = props.baseScale;
    this.amplitude = props.amplitude;
    this.frequency = props.frequency;
  }

  update(delta: number): void {
    const transform = this.entity.require(TransformComponent);

    this.scaleTimer += delta;
    const scalePhase = (this.scaleTimer / 1000) * this.frequency * Math.PI * 2;
    const scaleFactor = 1 + Math.sin(scalePhase) * this.amplitude;
    transform.scale = this.baseScale * scaleFactor;
  }

  onDestroy(): void {}
}
