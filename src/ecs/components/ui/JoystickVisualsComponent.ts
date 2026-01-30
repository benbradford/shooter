import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { TouchJoystickComponent } from '../input/TouchJoystickComponent';
import { TOUCH_CONTROLS_SCALE } from '../../../constants/GameConstants';

export class JoystickVisualsComponent implements Component {
  entity!: Entity;
  private outerCircle!: Phaser.GameObjects.Arc;
  private innerCircle!: Phaser.GameObjects.Arc;
  private arrowsSprite!: Phaser.GameObjects.Sprite;
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

    // Create inner circle around arrows
    this.innerCircle = this.scene.add.circle(0, 0, this.joystick.innerRadius * TOUCH_CONTROLS_SCALE);
    this.innerCircle.setStrokeStyle(3 * TOUCH_CONTROLS_SCALE, 0xcccccc);
    this.innerCircle.setFillStyle(0x000000, 0); // Transparent fill
    this.innerCircle.setDepth(2000);
    this.innerCircle.setVisible(false);
    this.innerCircle.setScrollFactor(0);

    // Create arrows sprite
    this.arrowsSprite = this.scene.add.sprite(0, 0, 'arrows');
    this.arrowsSprite.setScale(TOUCH_CONTROLS_SCALE);
    this.arrowsSprite.setDepth(2001);
    this.arrowsSprite.setVisible(false);
    this.arrowsSprite.setScrollFactor(0); // Fixed to camera
  }

  update(_delta: number): void {
    const state = this.joystick.getJoystickState();
    const displayWidth = this.scene.scale.displaySize.width;
    const displayHeight = this.scene.scale.displaySize.height;

    // Always show circles
    this.outerCircle.setVisible(true);
    this.innerCircle.setVisible(true);
    this.arrowsSprite.setVisible(true);

    if (state.active) {
      // Fully opaque when touching
      this.outerCircle.setAlpha(1);
      this.innerCircle.setAlpha(1);
      this.arrowsSprite.setAlpha(1);

      // Position at touch location and remember it
      this.lastX = state.startX;
      this.lastY = state.startY;
      this.initialized = true;
      this.outerCircle.setPosition(state.startX, state.startY);
      this.innerCircle.setPosition(state.currentX, state.currentY);
      this.arrowsSprite.setPosition(state.currentX, state.currentY);
    } else {
      // Semi-transparent when not touching
      this.outerCircle.setAlpha(0.3);
      this.innerCircle.setAlpha(0.3);
      this.arrowsSprite.setAlpha(0.3);

      // Use last position, or recalculate default until touched
      if (!this.initialized || this.lastX === 0) {
        this.lastX = displayWidth * 0.1;
        this.lastY = displayHeight * 0.65;
      }
      this.outerCircle.setPosition(this.lastX, this.lastY);
      this.innerCircle.setPosition(this.lastX, this.lastY);
      this.arrowsSprite.setPosition(this.lastX, this.lastY);
    }
  }

  onDestroy(): void {
    this.outerCircle.destroy();
    this.innerCircle.destroy();
    this.arrowsSprite.destroy();
  }
}
