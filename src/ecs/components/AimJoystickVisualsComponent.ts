import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { AimJoystickComponent } from './AimJoystickComponent';
import { ControlModeComponent } from './ControlModeComponent';
import { TOUCH_CONTROLS_SCALE } from '../../main';

export class AimJoystickVisualsComponent implements Component {
  entity!: Entity;
  private outerCircle!: Phaser.GameObjects.Arc;
  private innerCircle!: Phaser.GameObjects.Arc;
  private lastX: number = 0;
  private lastY: number = 0;
  private initialized: boolean = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly aimJoystick: AimJoystickComponent
  ) {}

  init(): void {
    this.outerCircle = this.scene.add.circle(0, 0, this.aimJoystick.maxRadius * TOUCH_CONTROLS_SCALE, 0x0000ff, 0.1);
    this.outerCircle.setStrokeStyle(3 * TOUCH_CONTROLS_SCALE, 0x0000ff, 0.8);
    this.outerCircle.setScrollFactor(0);
    this.outerCircle.setDepth(2000);
    this.outerCircle.setVisible(false);

    this.innerCircle = this.scene.add.circle(0, 0, this.aimJoystick.innerRadius * TOUCH_CONTROLS_SCALE, 0x0000ff, 0.8);
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
    const displayWidth = this.scene.scale.displaySize.width;
    const displayHeight = this.scene.scale.displaySize.height;

    // Always show circles in mode 2
    this.outerCircle.setVisible(true);
    this.innerCircle.setVisible(true);

    if (state.active) {
      // Position at touch location and remember it
      this.lastX = state.startX;
      this.lastY = state.startY;
      this.initialized = true;
      this.outerCircle.setPosition(state.startX, state.startY);
      this.innerCircle.setPosition(state.currentX, state.currentY);
    } else {
      // Use last position, or recalculate default until touched
      if (!this.initialized || this.lastX === 0) {
        this.lastX = displayWidth * 0.95;
        this.lastY = displayHeight * 0.95;
      }
      this.outerCircle.setPosition(this.lastX, this.lastY);
      this.innerCircle.setPosition(this.lastX, this.lastY);
    }
  }

  onDestroy(): void {
    this.outerCircle.destroy();
    this.innerCircle.destroy();
  }
}
