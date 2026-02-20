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
    }
  }

  getHealth(): number {
    return this.currentHealth;
  }

  private breakApart(): void {
    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    const PIECE_COUNT = 8;
    const PIECE_SIZE = 16;
    const FALL_DURATION_MS = 800;

    for (let i = 0; i < PIECE_COUNT; i++) {
      const offsetX = (Math.random() - 0.5) * 64;
      const offsetY = (Math.random() - 0.5) * 32;

      const piece = this.scene.add.rectangle(
        transform.x + offsetX,
        transform.y + offsetY,
        PIECE_SIZE,
        PIECE_SIZE,
        sprite.sprite.tintTopLeft || 0x8b7355
      );
      piece.setDepth(-3);

      this.scene.tweens.add({
        targets: piece,
        y: piece.y + 30,
        alpha: 0,
        duration: FALL_DURATION_MS,
        ease: 'Cubic.easeIn',
        onComplete: () => piece.destroy()
      });

      this.scene.tweens.add({
        targets: piece,
        angle: (Math.random() - 0.5) * 360,
        duration: FALL_DURATION_MS,
        ease: 'Linear'
      });
    }

    this.entity.destroy();
  }

  onDestroy(): void {
    // Cleanup handled by breakApart
  }
}
