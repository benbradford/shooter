import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export class AttackButtonComponent implements Component {
  entity!: Entity;
  private isPressed: boolean = false;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private posX: number = 0;
  private posY: number = 0;
  private initialized: boolean = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.sprite = scene.add.sprite(0, 0, 'crosshair');
    this.sprite.setScale(0.8);
    this.sprite.setScrollFactor(0);
    this.sprite.setDepth(2000);
    this.sprite.setAlpha(0.7);
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
      this.sprite.setScale(1);
      this.sprite.setTint(0x6666ff);
    }
  };

  private readonly handlePointerUp = (): void => {
    this.isPressed = false;
    this.sprite.setScale(0.8);
    this.sprite.clearTint();
  };

  update(): void {
    const camera = this.scene.cameras.main;
    const viewWidth = camera.width;
    const viewHeight = camera.height;
    
    if (!this.initialized || this.posX === 0) {
      this.posX = viewWidth * 0.85;
      this.posY = viewHeight * 0.85;
    }
    
    this.sprite.setPosition(this.posX, this.posY);
  }

  isAttackPressed(): boolean {
    return this.isPressed;
  }

  onDestroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.sprite.destroy();
  }
}
