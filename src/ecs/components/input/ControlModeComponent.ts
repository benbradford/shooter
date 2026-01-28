import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export type ControlMode = 1 | 2;

export class ControlModeComponent implements Component {
  entity!: Entity;
  private mode: ControlMode = 1;
  private aimStopTime: number = 0;
  private readonly aimStopCooldownMs: number = 1000;

  constructor(private readonly scene: Phaser.Scene) {}

  init(): void {
    this.scene.input.keyboard?.addKey('ONE').on('down', () => {
      this.mode = 1;
      console.log('Control Mode: 1 (Crosshair)');
    });

    this.scene.input.keyboard?.addKey('TWO').on('down', () => {
      this.mode = 2;
      console.log('Control Mode: 2 (Aim Joystick)');
    });
  }

  update(delta: number): void {
    if (this.aimStopTime > 0) {
      this.aimStopTime -= delta;
      if (this.aimStopTime < 0) {
        this.aimStopTime = 0;
      }
    }
  }

  getMode(): ControlMode {
    return this.mode;
  }

  startAimStopCooldown(): void {
    this.aimStopTime = this.aimStopCooldownMs;
  }

  isInAimStopCooldown(): boolean {
    return this.aimStopTime > 0;
  }

}
