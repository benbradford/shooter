import type { Component } from '../../Component';
import { Depth } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { NPCManager } from '../../../systems/NPCManager';
import type GameScene from '../../../scenes/GameScene';
import { TOUCH_CONTROLS_SCALE } from '../../../constants/GameConstants';

const BASE_UNPRESSED_SCALE = 4.44;
const BASE_PRESSED_SCALE = 4.86;
const UNPRESSED_SCALE = BASE_UNPRESSED_SCALE * TOUCH_CONTROLS_SCALE;
const PRESSED_SCALE = BASE_PRESSED_SCALE * TOUCH_CONTROLS_SCALE;
const POS_X = 0.89;
const POS_Y = 0.787;
const ALPHA_UNPRESSED = 0.4;
const ALPHA_PRESSED = 0.9;

const BASE_CIRCLE_RADIUS_PX = 180;
const RING_SCALE = 1.6 * (BASE_CIRCLE_RADIUS_PX * 2 * TOUCH_CONTROLS_SCALE) / 128;

const PUNCH_TEXTURE = 'crosshair';
const LIPS_TEXTURE = 'lips_icon';

export class AttackButtonComponent implements Component {
  entity!: Entity;
  private isPressed: boolean = false;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly ring: Phaser.GameObjects.Sprite;
  private readonly bg: Phaser.GameObjects.Sprite;
  private posX: number = 0;
  private posY: number = 0;
  private initialized: boolean = false;
  private currentIcon: 'punch' | 'lips' = 'punch';

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
      this.ring.setAlpha(ALPHA_PRESSED);
      this.bg.setAlpha(ALPHA_PRESSED);
    }
  };

  private readonly handlePointerUp = (): void => {
    this.isPressed = false;
    this.sprite.setScale(UNPRESSED_SCALE);
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
    }

    this.sprite.setPosition(this.posX, this.posY);
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

    const newIcon = closestNPC ? 'lips' : 'punch';
    if (newIcon !== this.currentIcon) {
      this.currentIcon = newIcon;
      this.sprite.setTexture(newIcon === 'punch' ? PUNCH_TEXTURE : LIPS_TEXTURE);
    }
  }

  isAttackPressed(): boolean {
    return this.isPressed;
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.ring.setVisible(visible);
    this.bg.setVisible(visible);
  }

  onDestroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.sprite.destroy();
    this.ring.destroy();
  }
}
