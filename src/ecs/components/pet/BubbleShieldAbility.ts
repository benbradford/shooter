import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { PetAbilityComponent } from './PetAbilityComponent';
import { HealthComponent } from '../core/HealthComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { WaterEffectComponent } from '../visual/WaterEffectComponent';
import { JumpComponent } from '../movement/JumpComponent';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { Depth } from '../../../constants/DepthConstants';

const SHIELD_SCALE = 1.44;
const TWEEN_DURATION_MS = 200;

export class BubbleShieldAbility implements Component {
  entity!: Entity;
  private readonly playerEntity: Entity;
  private readonly scene: Phaser.Scene;
  private shielding = false;
  private shieldSprite: Phaser.GameObjects.Image | null = null;
  private tweening = false;

  constructor(scene: Phaser.Scene, playerEntity: Entity) {
    this.scene = scene;
    this.playerEntity = playerEntity;
  }

  isActive(): boolean {
    return this.shielding;
  }

  activate(): void {
    // Block activation during swimming or jumping
    const water = this.playerEntity.get(WaterEffectComponent);
    if (water?.getIsInWater()) return;
    const jump = this.playerEntity.get(JumpComponent);
    if (jump?.isJumping()) return;

    this.shielding = true;
    this.playerEntity.require(HealthComponent).setInvulnerable(true);
    this.playerEntity.require(WalkComponent).resetVelocity(true, true);

    // Freeze player animation
    const playerSprite = this.playerEntity.get(SpriteComponent);
    if (playerSprite) playerSprite.sprite.anims.pause();

    // Hide the floating bubble pet sprite
    const petSprite = this.entity.get(SpriteComponent);
    const petTransform = this.entity.require(TransformComponent);
    if (petSprite) petSprite.sprite.setVisible(false);

    // Show shield visual — start at pet position/scale, tween to player
    const pt = this.playerEntity.require(TransformComponent);
    this.shieldSprite = this.scene.add.image(petTransform.x, petTransform.y, 'bubble');
    this.shieldSprite.setScale(petTransform.scale);
    this.shieldSprite.setAlpha(0.45);
    this.shieldSprite.setDepth(Depth.player + 1);

    this.tweening = true;
    this.scene.tweens.add({
      targets: this.shieldSprite,
      x: pt.x,
      y: pt.y,
      scale: SHIELD_SCALE,
      duration: TWEEN_DURATION_MS,
      ease: 'Quad.easeOut',
      onComplete: () => { this.tweening = false; },
    });
  }

  private deactivate(): void {
    this.shielding = false;
    this.playerEntity.require(HealthComponent).setInvulnerable(false);

    // Resume player animation
    const playerSprite = this.playerEntity.get(SpriteComponent);
    if (playerSprite) playerSprite.sprite.anims.resume();

    // Show the floating bubble pet sprite again
    const petSprite = this.entity.get(SpriteComponent);
    if (petSprite) petSprite.sprite.setVisible(true);

    if (this.shieldSprite) {
      this.shieldSprite.destroy();
      this.shieldSprite = null;
    }
  }

  update(): void {
    if (!this.shielding) return;

    const petAbility = this.playerEntity.get(PetAbilityComponent);
    if (!petAbility?.isAbilityHeld()) {
      this.deactivate();
      return;
    }

    // Keep player still and update shield position
    this.playerEntity.require(WalkComponent).resetVelocity(true, true);
    if (this.shieldSprite && !this.tweening) {
      const pt = this.playerEntity.require(TransformComponent);
      this.shieldSprite.setPosition(pt.x, pt.y);
    }
  }

  onDestroy(): void {
    if (this.shielding) {
      this.playerEntity.get(HealthComponent)?.setInvulnerable(false);
      const playerSprite = this.playerEntity.get(SpriteComponent);
      if (playerSprite) playerSprite.sprite.anims.resume();
    }
    this.shieldSprite?.destroy();
  }
}
