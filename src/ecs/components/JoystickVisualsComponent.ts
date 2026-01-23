import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { TouchJoystickComponent } from './TouchJoystickComponent';

export class JoystickVisualsComponent implements Component {
  entity!: Entity;
  private outerCircle!: Phaser.GameObjects.Arc;
  private innerCircle!: Phaser.GameObjects.Arc;
  private lastX: number = 0;
  private lastY: number = 0;
  private initialized: boolean = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly joystick: TouchJoystickComponent
  ) {}

  init(): void {
    // Create outer circle (yellow outline)
    this.outerCircle = this.scene.add.circle(0, 0, this.joystick.maxRadius);
    this.outerCircle.setStrokeStyle(5, 0xffff00);
    this.outerCircle.setFillStyle(0x000000, 0); // Transparent fill
    this.outerCircle.setDepth(2000); // Very high depth for HUD
    this.outerCircle.setVisible(false);
    this.outerCircle.setScrollFactor(0); // Fixed to camera

    // Create inner circle (yellow filled)
    this.innerCircle = this.scene.add.circle(0, 0, this.joystick.innerRadius, 0xffff00);
    this.innerCircle.setDepth(2001);
    this.innerCircle.setVisible(false);
    this.innerCircle.setScrollFactor(0); // Fixed to camera
  }

  update(_delta: number): void {
    const state = this.joystick.getJoystickState();
    const displayWidth = this.scene.scale.displaySize.width;
    const displayHeight = this.scene.scale.displaySize.height;

    // Always show circles
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
      // Use last position, or default if never touched
      if (!this.initialized) {
        this.lastX = displayWidth * 0.15;
        this.lastY = displayHeight * 0.75;
        this.initialized = true;
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
