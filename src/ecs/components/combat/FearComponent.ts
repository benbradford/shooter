import type Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { StateMachineComponent } from '../core/StateMachineComponent';
import { Depth } from '../../../constants/DepthConstants';

const ICON_OFFSET_Y_PX = -20;
const PARTICLE_FREQUENCY_MS = 400;
const PARTICLE_LIFESPAN_MS = 800;
const PARTICLE_SPEED_PX = 40;
const PARTICLE_SPREAD_PX = 20;
const PARTICLE_SCALE_START = 0.6;
const PARTICLE_SCALE_END = 0.2;
const FEAR_TINT_COLOR = 0x8888ff;
const TINT_PULSE_SPEED = 0.008;

export type FearComponentProps = {
  sourceX: number;
  sourceY: number;
  durationMs: number;
  returnState: string;
  scene: Phaser.Scene;
}

export class FearComponent implements Component {
  entity!: Entity;
  readonly sourceX: number;
  readonly sourceY: number;
  private readonly durationMs: number;
  private readonly returnState: string;
  private readonly scene: Phaser.Scene;
  private elapsedMs = 0;
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private isEnding = false;

  constructor(props: FearComponentProps) {
    this.sourceX = props.sourceX;
    this.sourceY = props.sourceY;
    this.durationMs = props.durationMs;
    this.returnState = props.returnState;
    this.scene = props.scene;
  }

  init(): void {
    const transform = this.entity.require(TransformComponent);
    this.emitter = this.scene.add.particles(
      transform.x, transform.y + ICON_OFFSET_Y_PX,
      'fear_icon',
      {
        frequency: PARTICLE_FREQUENCY_MS,
        lifespan: PARTICLE_LIFESPAN_MS,
        speed: { min: PARTICLE_SPEED_PX * 0.5, max: PARTICLE_SPEED_PX },
        angle: { min: 220, max: 320 },
        scale: { start: PARTICLE_SCALE_START, end: PARTICLE_SCALE_END },
        alpha: { start: 0.9, end: 0 },
        gravityY: -30,
        x: { min: -PARTICLE_SPREAD_PX, max: PARTICLE_SPREAD_PX },
        y: { min: -PARTICLE_SPREAD_PX, max: PARTICLE_SPREAD_PX }
      }
    );
    this.emitter.setDepth(Depth.particle);

    // Initial blue flash
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.sprite.setTint(FEAR_TINT_COLOR);
    }
  }

  resetTimer(): void {
    this.elapsedMs = 0;
  }

  update(delta: number): void {
    if (this.isEnding) return;

    this.elapsedMs += delta;

    if (this.emitter) {
      const transform = this.entity.require(TransformComponent);
      this.emitter.setPosition(transform.x, transform.y + ICON_OFFSET_Y_PX);
    }

    // Pulse blue tint - oscillates between subtle blue and white
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      const t = 0.5 + 0.5 * Math.sin(this.elapsedMs * TINT_PULSE_SPEED);
      const r = Math.floor(0x88 + (0xff - 0x88) * t);
      const g = Math.floor(0x88 + (0xff - 0x88) * t);
      const b = 0xff;
      sprite.sprite.setTint((r << 16) | (g << 8) | b);
    }

    if (this.elapsedMs >= this.durationMs) {
      this.endFear();
    }
  }

  private endFear(): void {
    this.isEnding = true;

    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.sprite.clearTint();
    }

    if (this.emitter) {
      this.emitter.stop();
      this.scene.time.delayedCall(PARTICLE_LIFESPAN_MS, () => {
        this.emitter?.destroy();
        this.emitter = null;
      });
    }

    const sm = this.entity.get(StateMachineComponent);
    if (sm) {
      sm.stateMachine.enter(this.returnState);
    }

    this.entity.remove(FearComponent);
  }

  onDestroy(): void {
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.sprite.clearTint();
    }
    this.emitter?.destroy();
    this.emitter = null;
  }
}
