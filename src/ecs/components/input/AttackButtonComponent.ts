import type { Component } from '../../Component';
import { Depth } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { NPCManager } from '../../../systems/NPCManager';
import type GameScene from '../../../scenes/GameScene';
import { TOUCH_CONTROLS_SCALE } from '../../../constants/GameConstants';
import { WorldStateManager } from '../../../systems/WorldStateManager';

const BASE_UNPRESSED_SCALE = 4.44;
const BASE_PRESSED_SCALE = 4.86;
const UNPRESSED_SCALE = BASE_UNPRESSED_SCALE * TOUCH_CONTROLS_SCALE;
const PRESSED_SCALE = BASE_PRESSED_SCALE * TOUCH_CONTROLS_SCALE;
const POS_X = 0.89;
const POS_Y = 0.787;
const ALPHA_UNPRESSED = 0.9;
const ALPHA_PRESSED = 1;

const BASE_CIRCLE_RADIUS_PX = 180;
const RING_SCALE = 1.6 * (BASE_CIRCLE_RADIUS_PX * 2 * TOUCH_CONTROLS_SCALE) / 128;

const PUNCH_TEXTURE = 'crosshair';
const SPEECH_TEXTURE = 'speech_bubble';
const SPEECH_SCALE_FACTOR = 0.42;
const BOUNCE_DURATION_MS = 300;

export class AttackButtonComponent implements Component {
  entity!: Entity;
  private isPressed: boolean = false;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly ring: Phaser.GameObjects.Sprite;
  private readonly bg: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Graphics;
  private posX: number = 0;
  private posY: number = 0;
  private initialized: boolean = false;
  private currentIcon: 'punch' | 'speech' = 'punch';
  private isHudVisible: boolean = true;
  private bounceTween: Phaser.Tweens.Tween | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.sprite = scene.add.sprite(0, 0, 'crosshair');
    this.sprite.setScale(UNPRESSED_SCALE);
    this.sprite.setScrollFactor(0);
    this.sprite.setDepth(Depth.hud);
    this.sprite.setAlpha(ALPHA_UNPRESSED);

    this.ring = scene.add.sprite(0, 0, 'stone_ring');
    this.ring.setScale(RING_SCALE);
    this.ring.setScrollFactor(0);
    this.ring.setDepth(Depth.hudRing);
    this.ring.setAlpha(ALPHA_UNPRESSED);

    this.bg = scene.add.sprite(0, 0, 'stone_bg');
    this.bg.setScale(RING_SCALE * 0.85);
    this.bg.setScrollFactor(0);
    this.bg.setDepth(Depth.hudButtonBg);
    this.bg.setAlpha(ALPHA_UNPRESSED);

    this.shadow = scene.add.graphics();
    this.shadow.setScrollFactor(0);
    this.shadow.setDepth(Depth.hudShadow);
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
      const factor = this.currentIcon === 'speech' ? SPEECH_SCALE_FACTOR : 1;
      this.sprite.setScale(PRESSED_SCALE * factor);
      this.sprite.setAlpha(ALPHA_PRESSED);
      this.sprite.setTint(0xff6666);
      this.ring.setAlpha(ALPHA_PRESSED);
      this.bg.setAlpha(ALPHA_PRESSED);
    }
  };

  private readonly handlePointerUp = (): void => {
    this.isPressed = false;
    const factor = this.currentIcon === 'speech' ? SPEECH_SCALE_FACTOR : 1;
    this.sprite.setScale(UNPRESSED_SCALE * factor);
    this.sprite.setAlpha(ALPHA_UNPRESSED);
    this.sprite.clearTint();
    this.ring.setAlpha(ALPHA_UNPRESSED);
    this.bg.setAlpha(ALPHA_UNPRESSED);
  };

  update(): void {
    const camera = this.scene.cameras.main;
    const viewWidth = camera.width;
    const viewHeight = camera.height;

    if (!this.initialized || this.posX === 0) {
      this.posX = viewWidth * POS_X;
      this.posY = viewHeight * POS_Y;

      const shadowRadius = BASE_CIRCLE_RADIUS_PX * TOUCH_CONTROLS_SCALE * 1.15;
      this.shadow.clear();
      this.shadow.fillStyle(0x000000, 0.25);
      this.shadow.fillCircle(this.posX, this.posY + 4, shadowRadius);
    }

    const speechOffsetY = 0;
    this.sprite.setPosition(this.posX, this.posY + speechOffsetY);
    this.ring.setPosition(this.posX, this.posY);
    this.bg.setPosition(this.posX, this.posY);

    this.updateIcon();
  }

  private updateIcon(): void {
    const gameScene = this.scene.scene.get('game') as GameScene;
    if (!gameScene) return;

    const player = gameScene.entityManager.getFirst('player');
    if (!player) return;

    const npcManager = NPCManager.getInstance();
    const closestNPC = npcManager.getClosestInteractableNPC(player);

    const newIcon = closestNPC ? 'speech' : 'punch';
    if (newIcon !== this.currentIcon) {
      this.currentIcon = newIcon;
      this.sprite.setTexture(newIcon === 'punch' ? PUNCH_TEXTURE : SPEECH_TEXTURE);
      const baseScale = newIcon === 'punch' ? UNPRESSED_SCALE : UNPRESSED_SCALE * SPEECH_SCALE_FACTOR;
      this.sprite.setScale(baseScale);
      if (this.bounceTween) {
        this.bounceTween.destroy();
        this.bounceTween = null;
      }
      if (newIcon === 'speech') {
        this.bounceTween = this.scene.tweens.add({
          targets: this.sprite,
          scaleX: baseScale * 1.2,
          scaleY: baseScale * 1.2,
          duration: BOUNCE_DURATION_MS,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    if (this.isHudVisible) {
      const canPunch = WorldStateManager.getInstance().getFlag('canPunch') === 'true';
      const shouldShow = canPunch || closestNPC !== null;
      this.applyVisibility(shouldShow);
    }
  }

  isAttackPressed(): boolean {
    return this.isPressed;
  }

  setVisible(visible: boolean): void {
    this.isHudVisible = visible;
    this.applyVisibility(visible);
  }

  private applyVisibility(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.ring.setVisible(visible);
    this.bg.setVisible(visible);
    this.shadow.setVisible(visible);
  }

  onDestroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.sprite.destroy();
    this.ring.destroy();
    this.bg.destroy();
    this.shadow.destroy();
  }
}
