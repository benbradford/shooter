import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

const UNPRESSED_SCALE = 1.26;
const PRESSED_SCALE = 1.4;
const POS_X = 0.915;
const POS_Y = 0.85;
const ALPHA_UNPRESSED = 0.4;
const ALPHA_PRESSED = 0.9;

const CIRCLE_RADIUS_PX = 60;
const CIRCLE_COLOR = 0xffffff;
const CIRCLE_ALPHA = 0.6;

export class AttackButtonComponent implements Component {
  entity!: Entity;
  private isPressed: boolean = false;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly circle: Phaser.GameObjects.Graphics;
  private posX: number = 0;
  private posY: number = 0;
  private initialized: boolean = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.sprite = scene.add.sprite(0, 0, 'crosshair');
    this.sprite.setScale(UNPRESSED_SCALE);
    this.sprite.setScrollFactor(0);
    this.sprite.setDepth(2000);
    this.sprite.setAlpha(ALPHA_UNPRESSED);

    this.circle = scene.add.graphics();
    this.circle.setScrollFactor(0);
    this.circle.setDepth(1999);
  }

  init(): void {
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);

    const keyboard = this.scene.input.keyboard;
    if (keyboard) {
      const spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      spaceKey.on('down', () => { this.isPressed = true; });
      spaceKey.on('up', () => { this.isPressed = false; });
    }
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    this.initialized = true;

    const distance = Math.hypot(pointer.x - this.posX, pointer.y - this.posY);
    const radius = (this.sprite.width / 2) * this.sprite.scale;

    if (distance <= radius) {
      this.isPressed = true;
      this.sprite.setScale(PRESSED_SCALE);
      this.sprite.setAlpha(ALPHA_PRESSED);
      this.sprite.setTint(0xff6666);
    }
  };

  private readonly handlePointerUp = (): void => {
    this.isPressed = false;
    this.sprite.setScale(UNPRESSED_SCALE);
    this.sprite.setAlpha(ALPHA_UNPRESSED);
    this.sprite.clearTint();
  };

  update(): void {
    const camera = this.scene.cameras.main;
    const viewWidth = camera.width;
    const viewHeight = camera.height;

    if (!this.initialized || this.posX === 0) {
      this.posX = viewWidth * POS_X;
      this.posY = viewHeight * POS_Y;
    }

    this.sprite.setPosition(this.posX, this.posY);

    this.circle.clear();
    this.circle.lineStyle(2, CIRCLE_COLOR, CIRCLE_ALPHA);
    this.circle.strokeCircle(this.posX, this.posY, CIRCLE_RADIUS_PX);
  }

  isAttackPressed(): boolean {
    return this.isPressed;
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.circle.setVisible(visible);
  }

  onDestroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.sprite.destroy();
    this.circle.destroy();
  }
}
