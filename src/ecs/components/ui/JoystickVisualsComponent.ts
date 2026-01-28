import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { TouchJoystickComponent } from '../input/TouchJoystickComponent';
import { TOUCH_CONTROLS_SCALE } from '../../../constants/GameConstants';

export class JoystickVisualsComponent implements Component {
  entity!: Entity;
  private outerCircle!: Phaser.GameObjects.Arc;
  private innerCircle!: Phaser.GameObjects.Arc;
  private gradient!: Phaser.GameObjects.Graphics;
  private lastX: number = 0;
  private lastY: number = 0;
  private initialized: boolean = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly joystick: TouchJoystickComponent
  ) {}

  init(): void {
    // Create outer circle (light grey outline)
    this.outerCircle = this.scene.add.circle(0, 0, this.joystick.maxRadius * TOUCH_CONTROLS_SCALE);
    this.outerCircle.setStrokeStyle(5 * TOUCH_CONTROLS_SCALE, 0xcccccc);
    this.outerCircle.setFillStyle(0x000000, 0); // Transparent fill
    this.outerCircle.setDepth(2000); // Very high depth for HUD
    this.outerCircle.setVisible(false);
    this.outerCircle.setScrollFactor(0); // Fixed to camera
    this.outerCircle.setAlpha(0.3); // Start semi-transparent

    // Create inner circle with gradient effect
    this.innerCircle = this.scene.add.circle(0, 0, this.joystick.innerRadius * TOUCH_CONTROLS_SCALE, 0xcccccc);
    this.innerCircle.setDepth(2001);
    this.innerCircle.setVisible(false);
    this.innerCircle.setScrollFactor(0); // Fixed to camera
    this.innerCircle.setAlpha(0.3); // Start semi-transparent
    
    // Add gradient effect
    this.gradient = this.scene.add.graphics();
    this.gradient.setDepth(2000.5);
    this.gradient.setScrollFactor(0);
    this.gradient.setAlpha(0.3);
    this.gradient.setVisible(false);
  }

  update(_delta: number): void {
    const state = this.joystick.getJoystickState();
    const displayWidth = this.scene.scale.displaySize.width;
    const displayHeight = this.scene.scale.displaySize.height;

    // Always show circles
    this.outerCircle.setVisible(true);
    this.innerCircle.setVisible(true);
    this.gradient.setVisible(true);

    if (state.active) {
      // Fully opaque when touching
      this.outerCircle.setAlpha(1);
      this.innerCircle.setAlpha(0.6); // Slightly transparent for gradient effect
      this.gradient.setAlpha(1);
      
      // Position at touch location and remember it
      this.lastX = state.startX;
      this.lastY = state.startY;
      this.initialized = true;
      this.outerCircle.setPosition(state.startX, state.startY);
      this.innerCircle.setPosition(state.currentX, state.currentY);
      
      // Update gradient position
      this.gradient.clear();
      const radius = this.joystick.innerRadius * TOUCH_CONTROLS_SCALE;
      this.gradient.fillGradientStyle(0xffffff, 0xffffff, 0xcccccc, 0xcccccc, 1, 0.8, 0.3, 0);
      this.gradient.fillCircle(state.currentX, state.currentY, radius);
    } else {
      // Semi-transparent when not touching
      this.outerCircle.setAlpha(0.3);
      this.innerCircle.setAlpha(0.2);
      this.gradient.setAlpha(0.3);
      
      // Use last position, or recalculate default until touched
      if (!this.initialized || this.lastX === 0) {
        this.lastX = displayWidth * 0.15;
        this.lastY = displayHeight * 0.85;
      }
      this.outerCircle.setPosition(this.lastX, this.lastY);
      this.innerCircle.setPosition(this.lastX, this.lastY);
      
      // Update gradient position
      this.gradient.clear();
      const radius = this.joystick.innerRadius * TOUCH_CONTROLS_SCALE;
      this.gradient.fillGradientStyle(0xffffff, 0xffffff, 0xcccccc, 0xcccccc, 1, 0.8, 0.3, 0);
      this.gradient.fillCircle(this.lastX, this.lastY, radius);
    }
  }

  onDestroy(): void {
    this.outerCircle.destroy();
    this.innerCircle.destroy();
  }
}
