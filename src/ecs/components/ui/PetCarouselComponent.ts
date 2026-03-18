import type { Component } from '../../Component';
import { Depth } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { TOUCH_CONTROLS_SCALE } from '../../../constants/GameConstants';
import { PetManager } from '../../../systems/PetManager';
import { PET_REGISTRY } from '../../entities/pet/PetConfig';

const ICON_SCALE = 0.6 * TOUCH_CONTROLS_SCALE;
const ARROW_SIZE_PX = 14;
const ARROW_PADDING_PX = 32;
const POS_Y_PERCENT = 0.06;
const SLIDE_DURATION_MS = 200;
const SLIDE_OFFSET_PX = 60;

export class PetCarouselComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private readonly icons: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private leftArrow!: Phaser.GameObjects.Graphics;
  private rightArrow!: Phaser.GameObjects.Graphics;
  private lastSelectedId: string | null = null;
  private isAnimating = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(): void {
    const petManager = PetManager.getInstance();
    const collected = petManager.getCollectedPets();

    for (const petId of collected) {
      const config = PET_REGISTRY[petId];
      if (!config) continue;
      const sprite = this.scene.add.sprite(0, 0, config.spritesheet, 0);
      sprite.setScale(ICON_SCALE);
      sprite.setScrollFactor(0);
      sprite.setDepth(Depth.hud);
      sprite.setAlpha(0);
      this.icons.set(petId, sprite);
    }

    this.leftArrow = this.createArrowGraphics(true);
    this.rightArrow = this.createArrowGraphics(false);

    this.lastSelectedId = petManager.getSelectedPetId();
    const selectedIcon = this.lastSelectedId ? this.icons.get(this.lastSelectedId) : undefined;
    if (selectedIcon) {
      selectedIcon.setAlpha(1);
    }

    this.updateArrowVisibility(collected.length);
  }

  update(): void {
    if (this.isAnimating) return;

    const camera = this.scene.cameras.main;
    const centerX = camera.width / 2;
    const posY = camera.height * POS_Y_PERCENT;

    for (const sprite of this.icons.values()) {
      sprite.setPosition(centerX, posY);
    }

    this.leftArrow.setPosition(centerX - ARROW_PADDING_PX, posY);
    this.rightArrow.setPosition(centerX + ARROW_PADDING_PX, posY);

    const petManager = PetManager.getInstance();
    const currentId = petManager.getSelectedPetId();

    if (currentId !== this.lastSelectedId && currentId) {
      this.animateSwap(this.lastSelectedId, currentId);
      this.lastSelectedId = currentId;
    }
  }

  private animateSwap(oldId: string | null, newId: string): void {
    this.isAnimating = true;

    const camera = this.scene.cameras.main;
    const centerX = camera.width / 2;
    const posY = camera.height * POS_Y_PERCENT;

    const oldSprite = oldId ? this.icons.get(oldId) : undefined;
    const newSprite = this.icons.get(newId);

    const collected = PetManager.getInstance().getCollectedPets();
    const oldIndex = oldId ? collected.indexOf(oldId) : -1;
    const newIndex = collected.indexOf(newId);
    const isForward = newIndex > oldIndex || (oldIndex === collected.length - 1 && newIndex === 0);
    const slideDir = isForward ? -1 : 1;

    if (oldSprite) {
      this.scene.tweens.add({
        targets: oldSprite,
        x: centerX + SLIDE_OFFSET_PX * slideDir,
        alpha: 0,
        duration: SLIDE_DURATION_MS,
        ease: 'Power2',
      });
    }

    if (newSprite) {
      newSprite.setPosition(centerX - SLIDE_OFFSET_PX * slideDir, posY);
      newSprite.setAlpha(0);
      this.scene.tweens.add({
        targets: newSprite,
        x: centerX,
        alpha: 1,
        duration: SLIDE_DURATION_MS,
        ease: 'Power2',
        onComplete: () => {
          this.isAnimating = false;
        },
      });
    } else {
      this.isAnimating = false;
    }
  }

  private createArrowGraphics(isLeft: boolean): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.setScrollFactor(0);
    graphics.setDepth(Depth.hud);

    graphics.fillStyle(0xffffff, 0.7);
    if (isLeft) {
      graphics.fillTriangle(
        ARROW_SIZE_PX / 2, -ARROW_SIZE_PX,
        ARROW_SIZE_PX / 2, ARROW_SIZE_PX,
        -ARROW_SIZE_PX / 2, 0
      );
    } else {
      graphics.fillTriangle(
        -ARROW_SIZE_PX / 2, -ARROW_SIZE_PX,
        -ARROW_SIZE_PX / 2, ARROW_SIZE_PX,
        ARROW_SIZE_PX / 2, 0
      );
    }

    const hitArea = new Phaser.Geom.Rectangle(
      -ARROW_SIZE_PX, -ARROW_SIZE_PX,
      ARROW_SIZE_PX * 2, ARROW_SIZE_PX * 2
    );
    graphics.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    graphics.on('pointerdown', () => {
      if (this.isAnimating) return;
      const petManager = PetManager.getInstance();
      if (isLeft) {
        petManager.selectPrevious();
      } else {
        petManager.selectNext();
      }
    });

    return graphics;
  }

  private updateArrowVisibility(collectedCount: number): void {
    const showArrows = collectedCount > 1;
    this.leftArrow.setVisible(showArrows);
    this.rightArrow.setVisible(showArrows);
  }

  setVisible(visible: boolean): void {
    for (const sprite of this.icons.values()) {
      sprite.setVisible(visible);
    }
    const collected = PetManager.getInstance().getCollectedPets();
    const showArrows = visible && collected.length > 1;
    this.leftArrow.setVisible(showArrows);
    this.rightArrow.setVisible(showArrows);
  }

  onDestroy(): void {
    for (const sprite of this.icons.values()) {
      sprite.destroy();
    }
    this.icons.clear();
    this.leftArrow.destroy();
    this.rightArrow.destroy();
  }
}
