import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { TouchJoystickComponent } from './TouchJoystickComponent';
import { ControlModeComponent } from './ControlModeComponent';

export class CrosshairVisualsComponent implements Component {
  entity!: Entity;
  private sprite!: Phaser.GameObjects.Sprite;
  private readonly scale = 0.8;
  private readonly pressedScale = 1;

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
    const controlMode = this.entity.get(ControlModeComponent);
    const mode = controlMode?.getMode() ?? 1;

    // Only show in mode 1
    if (mode !== 1) {
      this.sprite.setVisible(false);
      return;
    }

    this.sprite.setVisible(true);
    const isPressed = this.joystick.isFireButtonPressed();
    
    if (isPressed) {
      // Scale up and tint blue when pressed
      this.sprite.setScale(this.pressedScale);
      this.sprite.setTint(0x6666ff); // Bright blue tint
    } else {
      // Normal state
      this.sprite.setScale(this.scale);
      this.sprite.clearTint();
    }
  }

  onDestroy(): void {
    this.sprite.destroy();
  }
}
