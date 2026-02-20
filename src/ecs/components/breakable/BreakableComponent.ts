import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';

export type BreakableComponentProps = {
  maxHealth: number;
  scene: Phaser.Scene;
}

export class BreakableComponent implements Component {
  entity!: Entity;
  private currentHealth: number;
  private readonly scene: Phaser.Scene;

  constructor(props: BreakableComponentProps) {
    this.currentHealth = props.maxHealth;
    this.scene = props.scene;
  }

  takeDamage(amount: number): void {
    this.currentHealth -= amount;
    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.breakApart();
    } else {
      this.spawnSingleShard();
      this.shakeSprite();
    }
  }

  private shakeSprite(): void {
    const transform = this.entity.require(TransformComponent);
    const originalX = transform.x;
    const originalY = transform.y;

    const SHAKE_AMOUNT_PX = 3;
    const SHAKE_DURATION_MS = 100;

    this.scene.tweens.add({
      targets: transform,
      x: originalX + SHAKE_AMOUNT_PX,
      duration: SHAKE_DURATION_MS / 4,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        transform.x = originalX;
        transform.y = originalY;
      }
    });
  }

  private spawnSingleShard(): void {
    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    const GRID_SIZE = 3;
    const FADE_DURATION_MS = 800;
    const EXPLOSION_SPEED_PX_PER_SEC = 40;
    const INITIAL_UPWARD_VELOCITY_PX_PER_SEC = 50;
    const GRAVITY_PX_PER_SEC_SQ = 150;
    const ROTATION_SPEED_DEG_PER_SEC = 120;

    const texture = sprite.sprite.texture;
    const frame = sprite.sprite.frame;
    const pieceWidth = frame.width / GRID_SIZE;
    const pieceHeight = frame.height / GRID_SIZE;
    const scale = sprite.sprite.scaleX;

    const col = Math.floor(Math.random() * GRID_SIZE);
    const row = Math.floor(Math.random() * GRID_SIZE);

    const cropX = frame.cutX + col * pieceWidth;
    const cropY = frame.cutY + row * pieceHeight;

    const offsetX = (col - 1);
    const offsetY = (row - 1);

    const shard = this.scene.add.sprite(transform.x + offsetX, transform.y + offsetY, texture.key);
    shard.setCrop(cropX, cropY, pieceWidth, pieceHeight);
    shard.setOrigin(0.5, 0.5);
    shard.setScale(scale);
    shard.setDepth(sprite.sprite.depth);

    const centerDx = col - 1;
    const centerDy = row - 1;

    const baseAngle = Math.atan2(centerDy, centerDx);
    const finalAngle = baseAngle + (Math.random() - 0.5) * (Math.PI / 4);

    const velocityX = Math.cos(finalAngle) * EXPLOSION_SPEED_PX_PER_SEC;
    const velocityY = Math.sin(finalAngle) * EXPLOSION_SPEED_PX_PER_SEC;

    const rotationDir = col > 1 ? 1 : col < 1 ? -1 : 0;
    const rotationSpeed = rotationDir * ROTATION_SPEED_DEG_PER_SEC;

    const startTime = this.scene.time.now;
    const startX = shard.x;
    const startY = shard.y;
    const maxY = transform.y + (pieceHeight * scale) / 2;

    const updateShard = () => {
      const elapsed = this.scene.time.now - startTime;
      if (elapsed >= FADE_DURATION_MS) {
        shard.destroy();
        return;
      }

      const elapsedInSec = elapsed / 1000;

      shard.x = startX + velocityX * elapsedInSec;
      const newY = startY + velocityY * elapsedInSec - INITIAL_UPWARD_VELOCITY_PX_PER_SEC * elapsedInSec + (GRAVITY_PX_PER_SEC_SQ * elapsedInSec * elapsedInSec) / 2;
      shard.y = Math.min(newY, maxY);
      shard.angle = rotationSpeed * elapsedInSec;
      shard.alpha = 1 - (elapsed / FADE_DURATION_MS);
    };

    this.scene.events.on('update', updateShard);
    this.scene.time.delayedCall(FADE_DURATION_MS, () => {
      this.scene.events.off('update', updateShard);
    });
  }

  getHealth(): number {
    return this.currentHealth;
  }

  private breakApart(): void {
    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    const GRID_SIZE = 3;
    const FADE_DURATION_MS = 2000;
    const EXPLOSION_SPEED_PX_PER_SEC = 40;
    const INITIAL_UPWARD_VELOCITY_PX_PER_SEC = 70;
    const GRAVITY_PX_PER_SEC_SQ = 450;
    const ROTATION_SPEED_DEG_PER_SEC = 60;
    const RANDOM_ANGLE_RANGE_DEG = 50;
    const RANDOMNESS_FACTOR = 0.8;

    const texture = sprite.sprite.texture;
    const frame = sprite.sprite.frame;
    const pieceWidth = frame.width / GRID_SIZE;
    const pieceHeight = frame.height / GRID_SIZE;
    const scale = sprite.sprite.scaleX;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cropX = frame.cutX + col * pieceWidth;
        const cropY = frame.cutY + row * pieceHeight;

        const offsetX = (col - 1);
        const offsetY = (row - 1);

        const shard = this.scene.add.sprite(transform.x + offsetX, transform.y + offsetY, texture.key);
        shard.setCrop(cropX, cropY, pieceWidth, pieceHeight);
        shard.setOrigin(0.5, 0.5);
        shard.setScale(scale);
        shard.setDepth(sprite.sprite.depth);

        const centerDx = col - 1;
        const centerDy = row - 1;

        const baseAngle = Math.atan2(centerDy, centerDx);
        const randomOffset = (Math.random() - 0.5) * RANDOM_ANGLE_RANGE_DEG * (Math.PI / 180);
        const finalAngle = baseAngle + randomOffset;

        const velocityX = Math.cos(finalAngle) * EXPLOSION_SPEED_PX_PER_SEC * (1 - RANDOMNESS_FACTOR + Math.random() * RANDOMNESS_FACTOR * 2);
        const velocityY = Math.sin(finalAngle) * EXPLOSION_SPEED_PX_PER_SEC * (1 - RANDOMNESS_FACTOR + Math.random() * RANDOMNESS_FACTOR * 2);

        const rotationDir = col > 1 ? 1 : col < 1 ? -1 : 0;
        const rotationSpeed = rotationDir * ROTATION_SPEED_DEG_PER_SEC * (1 - RANDOMNESS_FACTOR + Math.random() * RANDOMNESS_FACTOR * 2);
        const gravityMultiplier = 1 - RANDOMNESS_FACTOR + Math.random() * RANDOMNESS_FACTOR * 2;

        const startTime = this.scene.time.now;
        const startX = shard.x;
        const startY = shard.y;
        const maxY = transform.y + (pieceHeight * scale) / 2;

        const updateShard = () => {
          const elapsed = this.scene.time.now - startTime;
          if (elapsed >= FADE_DURATION_MS) {
            shard.destroy();
            return;
          }

          const elapsedInSec = elapsed / 1000;

          shard.x = startX + velocityX * elapsedInSec;
          const newY = startY + velocityY * elapsedInSec - INITIAL_UPWARD_VELOCITY_PX_PER_SEC * elapsedInSec + (GRAVITY_PX_PER_SEC_SQ * gravityMultiplier * elapsedInSec * elapsedInSec) / 2;
          shard.y = Math.min(newY, maxY);
          shard.angle = rotationSpeed * elapsedInSec;

          if (col === 1) {
            const scaleProgress = (elapsed / FADE_DURATION_MS) * Math.PI * 4;
            shard.scaleY = scale * Math.sin(scaleProgress);
          }

          shard.alpha = 1 - (elapsed / FADE_DURATION_MS);
        };

        this.scene.events.on('update', updateShard);
        this.scene.time.delayedCall(FADE_DURATION_MS, () => {
          this.scene.events.off('update', updateShard);
        });
      }
    }

    this.entity.destroy();
  }

  onDestroy(): void {
    // Cleanup handled by breakApart
  }
}
