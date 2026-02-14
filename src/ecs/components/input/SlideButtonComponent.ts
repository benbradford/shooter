import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { SlideAbilityComponent } from '../abilities/SlideAbilityComponent';

const BUTTON_SCALE = 0.2;
const BUTTON_ALPHA_ACTIVE = 0.7;
const BUTTON_ALPHA_COOLDOWN = 0.3;
const BUTTON_SCALE_PRESSED = 0.22;
const BUTTON_TINT_PRESSED = 0x6666ff;

export class SlideButtonComponent implements Component {
  entity!: Entity;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly scene: Phaser.Scene;
  private readonly slideAbility: SlideAbilityComponent;
  private isPressed = false;
  private pointerId = -1;

  constructor(scene: Phaser.Scene, slideAbility: SlideAbilityComponent) {
    this.scene = scene;
    this.slideAbility = slideAbility;

    this.sprite = scene.add.sprite(0, 0, 'slide_icon');
    this.sprite.setScale(BUTTON_SCALE);
    this.sprite.setAlpha(BUTTON_ALPHA_ACTIVE);
    this.sprite.setScrollFactor(0);
    this.sprite.setDepth(2000);
    this.sprite.setInteractive();

    this.sprite.on('pointerdown', this.handlePointerDown, this);
    this.sprite.on('pointerup', this.handlePointerUp, this);
    this.sprite.on('pointerout', this.handlePointerUp, this);
  }

  init(): void {
    // Initialization if needed
  }

  update(): void {
    const displayWidth = this.scene.scale.displaySize.width;
    const displayHeight = this.scene.scale.displaySize.height;

    const x = displayWidth * 0.75;
    const y = displayHeight * 0.85;

    this.sprite.setPosition(x, y);

    if (this.slideAbility.canSlide()) {
      this.sprite.setAlpha(this.isPressed ? 1 : BUTTON_ALPHA_ACTIVE);
    } else {
      this.sprite.setAlpha(BUTTON_ALPHA_COOLDOWN);
    }

    if (this.isPressed) {
      this.sprite.setScale(BUTTON_SCALE_PRESSED);
      this.sprite.setTint(BUTTON_TINT_PRESSED);
    } else {
      this.sprite.setScale(BUTTON_SCALE);
      this.sprite.clearTint();
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId === -1) {
      this.pointerId = pointer.id;
      this.isPressed = true;

      if (this.slideAbility.canSlide()) {
        this.slideAbility.trySlide();
      }
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.pointerId) {
      this.pointerId = -1;
      this.isPressed = false;
    }
  }

  onDestroy(): void {
    this.sprite.destroy();
  }
}
