import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { AimJoystickComponent } from './AimJoystickComponent';
import { ControlModeComponent } from './ControlModeComponent';

export class AimJoystickVisualsComponent implements Component {
  entity!: Entity;
  private outerCircle!: Phaser.GameObjects.Arc;
  private innerCircle!: Phaser.GameObjects.Arc;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly aimJoystick: AimJoystickComponent
  ) {}

  init(): void {
    this.outerCircle = this.scene.add.circle(0, 0, this.aimJoystick.maxRadius, 0x0000ff, 0.1);
    this.outerCircle.setStrokeStyle(3, 0x0000ff, 0.8);
    this.outerCircle.setScrollFactor(0);
    this.outerCircle.setDepth(2000);
    this.outerCircle.setVisible(false);

    this.innerCircle = this.scene.add.circle(0, 0, this.aimJoystick.innerRadius, 0x0000ff, 0.8);
    this.innerCircle.setScrollFactor(0);
    this.innerCircle.setDepth(2001);
    this.innerCircle.setVisible(false);
  }

  update(_delta: number): void {
    const controlMode = this.entity.get(ControlModeComponent);
    const mode = controlMode?.getMode() ?? 1;

    // Only show in mode 2
    if (mode !== 2) {
      this.outerCircle.setVisible(false);
      this.innerCircle.setVisible(false);
      return;
    }

    const state = this.aimJoystick.getJoystickState();

    if (state.active) {
      this.outerCircle.setPosition(state.startX, state.startY);
      this.innerCircle.setPosition(state.currentX, state.currentY);
      this.outerCircle.setVisible(true);
      this.innerCircle.setVisible(true);
    } else {
      this.outerCircle.setVisible(false);
      this.innerCircle.setVisible(false);
    }
  }

  onDestroy(): void {
    this.outerCircle.destroy();
    this.innerCircle.destroy();
  }
}
