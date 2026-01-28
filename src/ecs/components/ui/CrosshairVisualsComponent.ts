import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { TouchJoystickComponent } from '../input/TouchJoystickComponent';
import { TOUCH_CONTROLS_SCALE } from '../../../constants/GameConstants';

export class CrosshairVisualsComponent implements Component {
  entity!: Entity;
  private sprite!: Phaser.GameObjects.Sprite;
  private readonly scale = TOUCH_CONTROLS_SCALE;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly joystick: TouchJoystickComponent
  ) {}

  init(): void {
    const screenWidth = this.scene.cameras.main.width;
    const screenHeight = this.scene.cameras.main.height;

    // Position in lower-right quadrant, further right
    const x = screenWidth * 0.85;
    const y = screenHeight * 0.65;

    // Create sprite from crosshair.png
    this.sprite = this.scene.add.sprite(x, y, 'crosshair');
    this.sprite.setScale(this.scale);

    // Fix to camera
    this.sprite.setScrollFactor(0);

    // High depth to stay on top
    this.sprite.setDepth(2000);

    // Set touch bounds on joystick component
    const radius = (this.sprite.width / 2) * this.scale;
    this.joystick.setCrosshairBounds(x, y, radius);
  }

  update(_delta: number): void {
    // Hide crosshair in mode 1 (using aim joystick instead)
    this.sprite.setVisible(false);
  }

  onDestroy(): void {
    this.sprite.destroy();
  }
}
