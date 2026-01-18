import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { TouchJoystickComponent } from './TouchJoystickComponent';

export class JoystickVisualsComponent implements Component {
  entity!: Entity;
  private outerCircle!: Phaser.GameObjects.Arc;
  private innerCircle!: Phaser.GameObjects.Arc;
  private readonly outerRadius: number = 70;
  private readonly innerRadius: number = 30;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly joystick: TouchJoystickComponent
  ) {}

  init(): void {
    // Create outer circle (yellow outline)
    this.outerCircle = this.scene.add.circle(0, 0, this.outerRadius);
    this.outerCircle.setStrokeStyle(3, 0xffff00);
    this.outerCircle.setFillStyle(0x000000, 0); // Transparent fill
    this.outerCircle.setDepth(2000); // Very high depth for HUD
    this.outerCircle.setVisible(false);
    this.outerCircle.setScrollFactor(0); // Fixed to camera

    // Create inner circle (yellow filled)
    this.innerCircle = this.scene.add.circle(0, 0, this.innerRadius, 0xffff00);
    this.innerCircle.setDepth(2001);
    this.innerCircle.setVisible(false);
    this.innerCircle.setScrollFactor(0); // Fixed to camera
  }

  update(_delta: number): void {
    const state = this.joystick.getJoystickState();

    if (state.active) {
      // Show and position circles
      this.outerCircle.setVisible(true);
      this.innerCircle.setVisible(true);

      this.outerCircle.setPosition(state.startX, state.startY);
      this.innerCircle.setPosition(state.currentX, state.currentY);
    } else {
      // Hide circles
      this.outerCircle.setVisible(false);
      this.innerCircle.setVisible(false);
    }
  }

  onDestroy(): void {
    this.outerCircle.destroy();
    this.innerCircle.destroy();
  }
}
