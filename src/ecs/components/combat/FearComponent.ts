import type Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { StateMachineComponent } from '../core/StateMachineComponent';
import { Depth } from '../../../constants/DepthConstants';

const ICON_OFFSET_Y_PX = -40;
const ICON_JITTER_PX = 1;
const ICON_FADE_DURATION_MS = 300;
const ICON_POP_DURATION_MS = 200;
const ICON_POP_OVERSHOOT_SCALE = 1.2;

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
  private fearIcon: Phaser.GameObjects.Sprite | null = null;
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
    this.fearIcon = this.scene.add.sprite(
      transform.x,
      transform.y + ICON_OFFSET_Y_PX,
      'fear_icon'
    );
    this.fearIcon.setDepth(Depth.particle);
    this.fearIcon.setScale(0);

    this.scene.tweens.add({
      targets: this.fearIcon,
      scaleX: { from: 0, to: ICON_POP_OVERSHOOT_SCALE },
      scaleY: { from: 0, to: ICON_POP_OVERSHOOT_SCALE },
      duration: ICON_POP_DURATION_MS * 0.6,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (!this.fearIcon) return;
        this.scene.tweens.add({
          targets: this.fearIcon,
          scaleX: 1,
          scaleY: 1,
          duration: ICON_POP_DURATION_MS * 0.4,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  resetTimer(): void {
    this.elapsedMs = 0;
  }

  update(delta: number): void {
    if (this.isEnding) return;

    this.elapsedMs += delta;

    if (this.fearIcon) {
      const transform = this.entity.require(TransformComponent);
      this.fearIcon.x = transform.x + (Math.random() - 0.5) * 2 * ICON_JITTER_PX;
      this.fearIcon.y = transform.y + ICON_OFFSET_Y_PX + (Math.random() - 0.5) * 2 * ICON_JITTER_PX;
    }

    if (this.elapsedMs >= this.durationMs) {
      this.endFear();
    }
  }

  private endFear(): void {
    this.isEnding = true;

    if (this.fearIcon) {
      this.scene.tweens.add({
        targets: this.fearIcon,
        alpha: 0,
        duration: ICON_FADE_DURATION_MS,
        onComplete: () => {
          this.fearIcon?.destroy();
          this.fearIcon = null;
        }
      });
    }

    const sm = this.entity.get(StateMachineComponent);
    if (sm) {
      sm.stateMachine.enter(this.returnState);
    }

    this.entity.remove(FearComponent);
  }

  onDestroy(): void {
    this.fearIcon?.destroy();
    this.fearIcon = null;
  }
}
