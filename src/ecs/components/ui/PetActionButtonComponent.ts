import type { Component } from '../../Component';
import { Depth } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { TOUCH_CONTROLS_SCALE } from '../../../constants/GameConstants';
import { PetManager } from '../../../systems/PetManager';
import { PetAbilityComponent } from '../pet/PetAbilityComponent';
import { PET_REGISTRY } from '../../entities/pet/PetConfig';

const BUTTON_ALPHA_UNPRESSED = 0.9;
const BUTTON_ALPHA_PRESSED = 1;
const BUTTON_ALPHA_DISABLED = 0.3;
const ICON_SIZE = 150;
const SIZE_MULTIPLIER = 1.3;
const RING_SCALE = (120 * 2 * TOUCH_CONTROLS_SCALE * SIZE_MULTIPLIER) / 128;
const SHADOW_RADIUS_PX = 90 * TOUCH_CONTROLS_SCALE * SIZE_MULTIPLIER * 1.15;
const SHADOW_OFFSET_Y_PX = 4;
const POS_X = 0.68;
const POS_Y = 0.85;

export class PetActionButtonComponent implements Component {
  entity!: Entity;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly ring: Phaser.GameObjects.Sprite;
  private readonly bg: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly scene: Phaser.Scene;
  private isPressed = false;
  private pointerId = -1;
  private posX = 0;
  private posY = 0;
  private currentTextureKey = '';
  private isHudVisible = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.sprite = scene.add.sprite(0, 0, 'slide_icon');
    this.sprite.setAlpha(BUTTON_ALPHA_UNPRESSED);
    this.sprite.setScrollFactor(0);
    this.sprite.setDepth(Depth.hud);
    this.sprite.setInteractive();

    this.ring = scene.add.sprite(0, 0, 'stone_ring');
    this.ring.setScale(RING_SCALE);
    this.ring.setScrollFactor(0);
    this.ring.setDepth(Depth.hudRing);
    this.ring.setAlpha(BUTTON_ALPHA_UNPRESSED);

    this.bg = scene.add.sprite(0, 0, 'stone_bg');
    this.bg.setScale(RING_SCALE * 0.85);
    this.bg.setScrollFactor(0);
    this.bg.setDepth(Depth.hudButtonBg);
    this.bg.setAlpha(BUTTON_ALPHA_UNPRESSED);

    this.shadow = scene.add.graphics();
    this.shadow.setScrollFactor(0);
    this.shadow.setDepth(Depth.hudShadow);

    this.sprite.on('pointerdown', this.handlePointerDown, this);
    this.sprite.on('pointerup', this.handlePointerUp, this);
    this.sprite.on('pointerout', this.handlePointerOut, this);
    scene.input.on('pointerup', this.handleGlobalPointerUp, this);
  }

  update(): void {
    const camera = this.scene.cameras.main;
    if (this.posX === 0) {
      this.posX = camera.width * POS_X;
      this.posY = camera.height * POS_Y;

      this.shadow.clear();
      this.shadow.fillStyle(0x000000, 0.25);
      this.shadow.fillCircle(this.posX, this.posY + SHADOW_OFFSET_Y_PX, SHADOW_RADIUS_PX);
    }
    this.sprite.setPosition(this.posX, this.posY);
    this.ring.setPosition(this.posX, this.posY);
    this.bg.setPosition(this.posX, this.posY);

    // Swap texture based on selected pet
    const selectedPetId = PetManager.getInstance().getSelectedPetId();
    const config = selectedPetId ? PET_REGISTRY[selectedPetId] : null;

    // Hide button entirely if no pet selected or HUD hidden
    if (!selectedPetId || !this.isHudVisible) {
      this.sprite.setVisible(false);
      this.ring.setVisible(false);
      this.bg.setVisible(false);
      this.shadow.setVisible(false);
      return;
    }
    this.sprite.setVisible(true);
    this.ring.setVisible(true);
    this.bg.setVisible(true);
    this.shadow.setVisible(true);

    const desiredTexture = config?.iconTexture ?? 'slide_icon';
    if (desiredTexture !== this.currentTextureKey && this.scene.textures.exists(desiredTexture)) {
      this.sprite.setTexture(desiredTexture);
      this.currentTextureKey = desiredTexture;
      const frame = this.sprite.frame;
      const targetSizePx = ICON_SIZE * TOUCH_CONTROLS_SCALE * SIZE_MULTIPLIER;
      const iconScale = targetSizePx / Math.max(frame.width, frame.height);
      this.sprite.setScale(iconScale);
    }

    // Check ability state
    const gameScene = this.scene.scene.get('game') as unknown as { entityManager?: { getFirst(type: string): Entity | undefined } };
    const player = gameScene.entityManager?.getFirst('player');
    const petAbility = player?.get(PetAbilityComponent);

    if (!petAbility || !petAbility.canUseAbility()) {
      this.sprite.setAlpha(BUTTON_ALPHA_DISABLED);
      this.ring.setAlpha(BUTTON_ALPHA_DISABLED);
      this.bg.setAlpha(BUTTON_ALPHA_DISABLED);
    } else if (this.isPressed) {
      this.sprite.setAlpha(BUTTON_ALPHA_PRESSED);
      this.ring.setAlpha(BUTTON_ALPHA_PRESSED);
      this.bg.setAlpha(BUTTON_ALPHA_PRESSED);
    } else {
      this.sprite.setAlpha(BUTTON_ALPHA_UNPRESSED);
      this.ring.setAlpha(BUTTON_ALPHA_UNPRESSED);
      this.bg.setAlpha(BUTTON_ALPHA_UNPRESSED);
    }
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (this.pointerId === -1) {
      this.pointerId = pointer.id;
      this.isPressed = true;

      const gameScene = this.scene.scene.get('game') as unknown as { entityManager?: { getFirst(type: string): Entity | undefined } };
      const player = gameScene.entityManager?.getFirst('player');
      const petAbility = player?.get(PetAbilityComponent);
      if (petAbility) {
        petAbility.setAbilityHeld(true);
        petAbility.tryAbility();
      }
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.pointerId) {
      this.pointerId = -1;
      this.isPressed = false;

      const gameScene = this.scene.scene.get('game') as unknown as { entityManager?: { getFirst(type: string): Entity | undefined } };
      const player = gameScene.entityManager?.getFirst('player');
      const petAbility = player?.get(PetAbilityComponent);
      petAbility?.setAbilityHeld(false);
    }
  };

  private readonly handlePointerOut = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.pointerId) {
      this.pointerId = -1;
      this.isPressed = false;
    }
  };

  private readonly handleGlobalPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.pointerId) {
      this.pointerId = -1;
      this.isPressed = false;

      const gameScene = this.scene.scene.get('game') as unknown as { entityManager?: { getFirst(type: string): Entity | undefined } };
      const player = gameScene.entityManager?.getFirst('player');
      const petAbility = player?.get(PetAbilityComponent);
      petAbility?.setAbilityHeld(false);
    }
  };

  setVisible(visible: boolean): void {
    this.isHudVisible = visible;
    this.sprite.setVisible(visible);
    this.ring.setVisible(visible);
    this.bg.setVisible(visible);
    this.shadow.setVisible(visible);
  }

  onDestroy(): void {
    this.sprite.off('pointerdown', this.handlePointerDown, this);
    this.sprite.off('pointerup', this.handlePointerUp, this);
    this.sprite.off('pointerout', this.handlePointerOut, this);
    this.scene.input.off('pointerup', this.handleGlobalPointerUp, this);
    this.sprite.destroy();
    this.ring.destroy();
    this.bg.destroy();
    this.shadow.destroy();
  }
}
