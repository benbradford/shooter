import type { Component } from '../../Component';
import { Depth } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import type { SlideAbilityComponent } from '../abilities/SlideAbilityComponent';
import type { AttackComboComponent } from '../combat/AttackComboComponent';
import { TOUCH_CONTROLS_SCALE } from '../../../constants/GameConstants';

const BASE_BUTTON_SCALE = 0.28;
const BUTTON_SCALE = BASE_BUTTON_SCALE * TOUCH_CONTROLS_SCALE;
const BUTTON_ALPHA_UNPRESSED = 0.5;
const BUTTON_ALPHA_PRESSED = 0.9;
const BUTTON_ALPHA_COOLDOWN = 0.3;
const BUTTON_SCALE_PRESSED = BUTTON_SCALE;
const BUTTON_TINT_PRESSED = 0xff0000;
const POS_X = 0.75;
const POS_Y = 0.85;
const BASE_CIRCLE_RADIUS_PX = 90;
const RING_SCALE = (BASE_CIRCLE_RADIUS_PX * 2 * TOUCH_CONTROLS_SCALE) / 128;
const COOLDOWN_RADIUS_PX = BASE_CIRCLE_RADIUS_PX * TOUCH_CONTROLS_SCALE;
const COOLDOWN_COLOR = 0xffffff;

export class SlideButtonComponent implements Component {
  entity!: Entity;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly ring: Phaser.GameObjects.Sprite;
  private readonly cooldownArc: Phaser.GameObjects.Graphics;
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
    this.sprite.setDepth(Depth.hud);
    this.sprite.setInteractive();

    this.ring = scene.add.sprite(0, 0, 'stone_ring');
    this.ring.setScale(RING_SCALE);
    this.ring.setScrollFactor(0);
    this.ring.setDepth(Depth.hudRing);
    this.ring.setAlpha(BUTTON_ALPHA_UNPRESSED);

    this.cooldownArc = scene.add.graphics();
    this.cooldownArc.setScrollFactor(0);
    this.cooldownArc.setDepth(Depth.hudButtonBg);

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
    this.ring.setPosition(this.posX, this.posY);

    const isPunching = this.attackCombo.isPunching();
    const canSlide = this.slideAbility.canSlide();
    const isSliding = this.slideAbility.getIsSliding();

    this.cooldownArc.clear();

    if (!isSliding && !canSlide) {
      const cooldownRatio = this.slideAbility.getCooldownRatio();
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * cooldownRatio);

      this.cooldownArc.lineStyle(4, COOLDOWN_COLOR, BUTTON_ALPHA_COOLDOWN);
      this.cooldownArc.beginPath();
      this.cooldownArc.arc(this.posX, this.posY, COOLDOWN_RADIUS_PX, startAngle, endAngle, false);
      this.cooldownArc.strokePath();
    }

    if (isPunching || !canSlide) {
      this.sprite.setAlpha(BUTTON_ALPHA_COOLDOWN);
      this.ring.setAlpha(BUTTON_ALPHA_COOLDOWN);
    } else if (this.isPressed || isSliding) {
      this.sprite.setAlpha(BUTTON_ALPHA_PRESSED);
      this.ring.setAlpha(BUTTON_ALPHA_PRESSED);
    } else {
      this.sprite.setAlpha(BUTTON_ALPHA_UNPRESSED);
      this.ring.setAlpha(BUTTON_ALPHA_UNPRESSED);
    }

    if (this.isPressed || isSliding) {
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
    this.ring.setVisible(visible);
    this.cooldownArc.setVisible(visible);
  }

  onDestroy(): void {
    this.sprite.destroy();
    this.ring.destroy();
    this.cooldownArc.destroy();
  }
}
