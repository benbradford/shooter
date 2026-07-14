import type { Component } from '../../Component';
import { Depth } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { TOUCH_CONTROLS_SCALE } from '../../../constants/GameConstants';
import { PetManager } from '../../../systems/PetManager';
import { PET_REGISTRY } from '../../entities/pet/PetConfig';

const ICON_SCALE = 2 * TOUCH_CONTROLS_SCALE;
const POS_X_PERCENT = 0.93;
const POS_Y_PERCENT = 0.08;
const SLIDE_DURATION_MS = 200;
const SLIDE_OFFSET_PX = 60;
const RING_RADIUS_PX = 24;
const RING_LINE_WIDTH_PX = 2.5;
const RING_COLOR = 0xffffff;
const RING_ALPHA = 0.6;
const ARROW_HEAD_SIZE_PX = 6;
const RING_GAP_RAD = 0.5;

export class PetCarouselComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private readonly icons: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private ring!: Phaser.GameObjects.Graphics;
  private lastSelectedId: string | null = null;
  private isAnimating = false;
  private shouldShow = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(): void {
    const petManager = PetManager.getInstance();
    const collected = petManager.getCollectedPets();

    this.shouldShow = collected.length > 1;

    this.ring = this.scene.add.graphics();
    this.ring.setScrollFactor(0);
    this.ring.setDepth(Depth.hud);
    this.ring.setVisible(this.shouldShow);
    this.drawRing();

    for (const petId of collected) {
      const config = PET_REGISTRY[petId];
      if (!config) continue;
      const sprite = this.scene.add.sprite(0, 0, config.iconTexture);
      const iconScale = petId === 'bubble' ? ICON_SCALE * 0.5 : ICON_SCALE;
      sprite.setScale(iconScale);
      sprite.setScrollFactor(0);
      sprite.setDepth(Depth.hud + 1);
      sprite.setAlpha(0);
      sprite.setVisible(this.shouldShow);

      const hitRadius = RING_RADIUS_PX + ARROW_HEAD_SIZE_PX;
      sprite.setInteractive(
        new Phaser.Geom.Circle(sprite.width / 2, sprite.height / 2, hitRadius / ICON_SCALE),
        Phaser.Geom.Circle.Contains
      );
      sprite.on('pointerdown', () => {
        if (this.isAnimating) return;
        petManager.selectNext();
      });

      this.icons.set(petId, sprite);
    }

    this.lastSelectedId = petManager.getSelectedPetId();
    const selectedIcon = this.lastSelectedId ? this.icons.get(this.lastSelectedId) : undefined;
    if (selectedIcon) {
      selectedIcon.setAlpha(1);
    }
  }

  private drawRing(): void {
    const g = this.ring;
    g.clear();

    // Arc (circular arrow body)
    g.lineStyle(RING_LINE_WIDTH_PX, RING_COLOR, RING_ALPHA);
    g.beginPath();
    const startAngle = -Math.PI / 2 + RING_GAP_RAD;
    const endAngle = -Math.PI / 2 + Math.PI * 2 - RING_GAP_RAD;
    g.arc(0, 0, RING_RADIUS_PX, startAngle, endAngle, false);
    g.strokePath();

    // Arrowhead at the end of the arc
    const tipAngle = endAngle;
    const tipX = Math.cos(tipAngle) * RING_RADIUS_PX;
    const tipY = Math.sin(tipAngle) * RING_RADIUS_PX;

    // Two points forming the arrowhead, tangent to the circle
    const tangent = tipAngle + Math.PI / 2;
    const ax = tipX + Math.cos(tangent + 0.5) * ARROW_HEAD_SIZE_PX;
    const ay = tipY + Math.sin(tangent + 0.5) * ARROW_HEAD_SIZE_PX;
    const bx = tipX + Math.cos(tangent - 0.7) * ARROW_HEAD_SIZE_PX;
    const by = tipY + Math.sin(tangent - 0.7) * ARROW_HEAD_SIZE_PX;

    g.fillStyle(RING_COLOR, RING_ALPHA);
    g.fillTriangle(tipX, tipY, ax, ay, bx, by);
  }

  update(): void {
    if (this.isAnimating) return;

    const camera = this.scene.cameras.main;
    const centerX = camera.width * POS_X_PERCENT;
    const posY = camera.height * POS_Y_PERCENT;

    for (const sprite of this.icons.values()) {
      sprite.setPosition(centerX, posY);
    }
    this.ring.setPosition(centerX, posY);

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
    const centerX = camera.width * POS_X_PERCENT;
    const posY = camera.height * POS_Y_PERCENT;

    const oldSprite = oldId ? this.icons.get(oldId) : undefined;
    const newSprite = this.icons.get(newId);

    if (oldSprite) {
      this.scene.tweens.add({
        targets: oldSprite,
        x: centerX + SLIDE_OFFSET_PX,
        alpha: 0,
        duration: SLIDE_DURATION_MS,
        ease: 'Power2',
      });
    }

    if (newSprite) {
      newSprite.setPosition(centerX - SLIDE_OFFSET_PX, posY);
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

  setVisible(visible: boolean): void {
    const show = visible && this.shouldShow;
    for (const sprite of this.icons.values()) {
      sprite.setVisible(show);
    }
    this.ring.setVisible(show);
  }

  onDestroy(): void {
    for (const sprite of this.icons.values()) {
      sprite.destroy();
    }
    this.icons.clear();
    this.ring.destroy();
  }
}
