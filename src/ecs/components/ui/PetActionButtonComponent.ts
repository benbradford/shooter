import type { Component } from '../../Component';
import { Depth } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { TOUCH_CONTROLS_SCALE } from '../../../constants/GameConstants';
import { PetManager } from '../../../systems/PetManager';
import { PetAbilityComponent } from '../pet/PetAbilityComponent';
import { PET_REGISTRY } from '../../entities/pet/PetConfig';

const BUTTON_ALPHA_UNPRESSED = 0.4;
const BUTTON_ALPHA_PRESSED = 0.9;
const BUTTON_ALPHA_DISABLED = 0.2;
const POS_X = 0.75;
const POS_Y = 0.85;

export class PetActionButtonComponent implements Component {
  entity!: Entity;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly scene: Phaser.Scene;
  private isPressed = false;
  private pointerId = -1;
  private posX = 0;
  private posY = 0;
  private currentTextureKey = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.sprite = scene.add.sprite(0, 0, 'slide_icon');
    this.sprite.setAlpha(BUTTON_ALPHA_UNPRESSED);
    this.sprite.setScrollFactor(0);
    this.sprite.setDepth(Depth.hud);
    this.sprite.setInteractive();

    this.sprite.on('pointerdown', this.handlePointerDown, this);
    this.sprite.on('pointerup', this.handlePointerUp, this);
    this.sprite.on('pointerout', this.handlePointerUp, this);
  }

  update(): void {
    const camera = this.scene.cameras.main;
    if (this.posX === 0) {
      this.posX = camera.width * POS_X;
      this.posY = camera.height * POS_Y;
    }
    this.sprite.setPosition(this.posX, this.posY);

    // Swap texture based on selected pet
    const selectedPetId = PetManager.getInstance().getSelectedPetId();
    const config = selectedPetId ? PET_REGISTRY[selectedPetId] : null;
    const desiredTexture = config?.iconTexture ?? 'slide_icon';
    if (desiredTexture !== this.currentTextureKey && this.scene.textures.exists(desiredTexture)) {
      this.sprite.setTexture(desiredTexture);
      this.currentTextureKey = desiredTexture;
      // Normalize scale: target ~190px display size regardless of source resolution
      const frame = this.sprite.frame;
      const targetSizePx = 190 * TOUCH_CONTROLS_SCALE;
      const iconScale = targetSizePx / Math.max(frame.width, frame.height);
      this.sprite.setScale(iconScale);
    }

    // Check ability state
    const gameScene = this.scene.scene.get('game') as unknown as { entityManager?: { getFirst(type: string): Entity | undefined } };
    const player = gameScene.entityManager?.getFirst('player');
    const petAbility = player?.get(PetAbilityComponent);

    if (!petAbility || !petAbility.canUseAbility()) {
      this.sprite.setAlpha(BUTTON_ALPHA_DISABLED);
    } else if (this.isPressed) {
      this.sprite.setAlpha(BUTTON_ALPHA_PRESSED);
    } else {
      this.sprite.setAlpha(BUTTON_ALPHA_UNPRESSED);
    }
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (this.pointerId === -1) {
      this.pointerId = pointer.id;
      this.isPressed = true;

      const gameScene = this.scene.scene.get('game') as unknown as { entityManager?: { getFirst(type: string): Entity | undefined } };
      const player = gameScene.entityManager?.getFirst('player');
      const petAbility = player?.get(PetAbilityComponent);
      petAbility?.tryAbility();
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.pointerId) {
      this.pointerId = -1;
      this.isPressed = false;
    }
  };

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
  }

  onDestroy(): void {
    this.sprite.off('pointerdown', this.handlePointerDown, this);
    this.sprite.off('pointerup', this.handlePointerUp, this);
    this.sprite.off('pointerout', this.handlePointerUp, this);
    this.sprite.destroy();
  }
}
