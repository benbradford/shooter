import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { SlideAbilityComponent } from '../abilities/SlideAbilityComponent';
import type { AttackComboComponent } from '../combat/AttackComboComponent';

const BUTTON_SCALE = 0.2;
const BUTTON_ALPHA_UNPRESSED = 0.4;
const BUTTON_ALPHA_PRESSED = 0.9;
const BUTTON_ALPHA_COOLDOWN = 0.2;
const BUTTON_SCALE_PRESSED = 0.22;
const BUTTON_TINT_PRESSED = 0x6666ff;
const POS_X = 0.75;
const POS_Y = 0.85;

export class SlideButtonComponent implements Component {
  entity!: Entity;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly scene: Phaser.Scene;
  private readonly slideAbility: SlideAbilityComponent;
  private readonly attackCombo: AttackComboComponent;
  private isPressed = false;
  private pointerId = -1;
  private posX = 0;
  private posY = 0;

  constructor(scene: Phaser.Scene, slideAbility: SlideAbilityComponent, attackCombo: AttackComboComponent) {
    this.scene = scene;
    this.slideAbility = slideAbility;
    this.attackCombo = attackCombo;

    this.sprite = scene.add.sprite(0, 0, 'slide_icon');
    this.sprite.setScale(BUTTON_SCALE);
    this.sprite.setAlpha(BUTTON_ALPHA_UNPRESSED);
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
    const camera = this.scene.cameras.main;
    const viewWidth = camera.width;
    const viewHeight = camera.height;

    if (this.posX === 0) {
      this.posX = viewWidth * POS_X;
      this.posY = viewHeight * POS_Y;
    }

    this.sprite.setPosition(this.posX, this.posY);

    const isPunching = this.attackCombo.isPunching();
    const canSlide = this.slideAbility.canSlide();

    if (isPunching || !canSlide) {
      this.sprite.setAlpha(BUTTON_ALPHA_COOLDOWN);
    } else if (this.isPressed) {
      this.sprite.setAlpha(BUTTON_ALPHA_PRESSED);
    } else {
      this.sprite.setAlpha(BUTTON_ALPHA_UNPRESSED);
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

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
  }

  onDestroy(): void {
    this.sprite.destroy();
  }
}
