import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { AimJoystickComponent } from '../input/AimJoystickComponent';
import { TOUCH_CONTROLS_SCALE } from '../../../constants/GameConstants';

export class AimJoystickVisualsComponent implements Component {
  entity!: Entity;
  private outerCircle!: Phaser.GameObjects.Arc;
  private crosshairSprite!: Phaser.GameObjects.Sprite;
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

    this.crosshairSprite = this.scene.add.sprite(0, 0, 'crosshair');
    this.crosshairSprite.setScale(TOUCH_CONTROLS_SCALE * 0.5);
    this.crosshairSprite.setScrollFactor(0);
    this.crosshairSprite.setDepth(2001);
    this.crosshairSprite.setVisible(false);
  }

  update(_delta: number): void {
    const state = this.aimJoystick.getJoystickState();
    const displayWidth = this.scene.scale.displaySize.width;
    const displayHeight = this.scene.scale.displaySize.height;

    // Always show
    this.outerCircle.setVisible(true);
    this.crosshairSprite.setVisible(true);

    if (state.active) {
      // Fully opaque when touching
      this.outerCircle.setAlpha(1);
      this.crosshairSprite.setAlpha(1);

      // Remember positions
      this.lastX = state.startX;
      this.lastY = state.startY;
      this.initialized = true;

      // Position at touch location
      this.outerCircle.setPosition(state.startX, state.startY);

      // Crosshair: center when auto-aim, follow when manual aim
      this.crosshairSprite.setPosition(state.currentX, state.currentY);
    } else {
      // Semi-transparent when not aiming
      this.outerCircle.setAlpha(0.3);
      this.crosshairSprite.setAlpha(0.3);

      // Use last position, or recalculate default until touched
      if (!this.initialized || this.lastX === 0) {
        this.lastX = displayWidth * 0.7;
        this.lastY = displayHeight * 0.5;
      }

      // Keep last position, crosshair centered
      this.outerCircle.setPosition(this.lastX, this.lastY);
      this.crosshairSprite.setPosition(this.lastX, this.lastY);
    }
  }

  onDestroy(): void {
    this.outerCircle.destroy();
    this.crosshairSprite.destroy();
  }
}
