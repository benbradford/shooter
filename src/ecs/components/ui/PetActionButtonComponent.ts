import type { Component } from '../../Component';
import { Depth } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { TOUCH_CONTROLS_SCALE } from '../../../constants/GameConstants';
import { PetManager } from '../../../systems/PetManager';

const BASE_BUTTON_SCALE = 0.28;
const BUTTON_SCALE = BASE_BUTTON_SCALE * TOUCH_CONTROLS_SCALE;
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
  private currentTextureKey = 'slide_icon';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.sprite = scene.add.sprite(0, 0, 'slide_icon');
    this.sprite.setScale(BUTTON_SCALE);
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
    const viewWidth = camera.width;
    const viewHeight = camera.height;

    if (this.posX === 0) {
      this.posX = viewWidth * POS_X;
      this.posY = viewHeight * POS_Y;
    }

    this.sprite.setPosition(this.posX, this.posY);

    const selectedPetId = PetManager.getInstance().getSelectedPetId();
    const desiredTexture = selectedPetId === 'dog' ? 'bark_icon' : 'slide_icon';
    if (desiredTexture !== this.currentTextureKey) {
      this.sprite.setTexture(desiredTexture);
      this.currentTextureKey = desiredTexture;
    }

    const gameScene = this.scene.scene.get('game') as any;
    if (!gameScene?.entityManager) {
      this.sprite.setAlpha(BUTTON_ALPHA_DISABLED);
      return;
    }
    
    const player = gameScene.entityManager.getFirst('player');
    if (!player) {
      this.sprite.setAlpha(BUTTON_ALPHA_DISABLED);
      return;
    }
    
    const PetAbilityComp = (window as any).PetAbilityComponent;
    if (!PetAbilityComp) {
      this.sprite.setAlpha(BUTTON_ALPHA_DISABLED);
      return;
    }
    
    const petAbility = player.get(PetAbilityComp);
    if (!petAbility) {
      this.sprite.setAlpha(BUTTON_ALPHA_DISABLED);
      return;
    }
    
    const canUse = petAbility.canUseAbility();
    
    if (!canUse) {
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
      
      const gameScene = this.scene.scene.get('game') as any;
      if (gameScene && gameScene.entityManager) {
        const player = gameScene.entityManager.getFirst('player');
        const PetAbilityComp = (window as any).PetAbilityComponent;
        if (player && PetAbilityComp) {
          const petAbility = player.get(PetAbilityComp);
          if (petAbility) {
            petAbility.tryAbility();
          }
        }
      }
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.pointerId) {
      this.pointerId = -1;
      this.isPressed = false;
    }
  };

  onDestroy(): void {
    this.sprite.off('pointerdown', this.handlePointerDown, this);
    this.sprite.off('pointerup', this.handlePointerUp, this);
    this.sprite.off('pointerout', this.handlePointerUp, this);
    this.sprite.destroy();
  }
}
