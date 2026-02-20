import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { CollisionComponent } from '../combat/CollisionComponent';
import { StateMachineComponent } from '../core/StateMachineComponent';
import { ShadowComponent } from './ShadowComponent';
import { createSmokeBurst } from './SmokeBurstHelper';

export type SkeletonRiseComponentProps = {
  scene: Phaser.Scene;
}

export class SkeletonRiseComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private elapsedMs = 0;
  private readonly durationMs = 1000;
  private isRising = true;
  private startY = 0;
  private targetY = 0;

  constructor(props: SkeletonRiseComponentProps) {
    this.scene = props.scene;
  }

  update(delta: number): void {
    if (this.isRising) {
      const sprite = this.entity.require(SpriteComponent);
      const transform = this.entity.require(TransformComponent);
      const collision = this.entity.require(CollisionComponent);
      const shadow = this.entity.get(ShadowComponent);

      if (this.elapsedMs === 0) {
        collision.enabled = false;
        if (shadow?.shadow) {
          shadow.shadow.setVisible(false);
        }
        this.targetY = transform.y;
        this.startY = this.targetY + sprite.sprite.displayHeight;
        transform.y = this.startY;

        createSmokeBurst({
          scene: this.scene,
          x: transform.x,
          y: this.targetY + 32,
          cellSize: sprite.sprite.displayHeight * 0.3,
          burstCount: 5,
          intervalMs: 75
        });
      }

      this.elapsedMs += delta;
      const progress = Math.min(this.elapsedMs / this.durationMs, 1);

      transform.y = this.startY + (this.targetY - this.startY) * progress;

      const spriteHeight = sprite.sprite.displayHeight;
      const visibleHeight = spriteHeight * progress;

      const maskY = sprite.sprite.y - spriteHeight / 2;
      const maskHeight = visibleHeight;

      if (!sprite.sprite.mask) {
        const mask = this.scene.make.graphics({});
        mask.fillStyle(0xffffff);
        mask.fillRect(
          sprite.sprite.x - sprite.sprite.displayWidth / 2,
          maskY,
          sprite.sprite.displayWidth,
          maskHeight
        );
        sprite.sprite.setMask(mask.createGeometryMask());
      } else if (sprite.sprite.mask) {
        const geomMask = sprite.sprite.mask as Phaser.Display.Masks.GeometryMask;
        const mask = geomMask.geometryMask;
        if (mask instanceof Phaser.GameObjects.Graphics) {
          mask.clear();
          mask.fillStyle(0xffffff);
          mask.fillRect(
            sprite.sprite.x - sprite.sprite.displayWidth / 2,
            maskY,
            sprite.sprite.displayWidth,
            maskHeight
          );
        }
      }

      if (progress >= 1) {
        this.isRising = false;
        sprite.sprite.clearMask();

        collision.enabled = true;

        if (shadow?.shadow) {
          shadow.shadow.setVisible(true);
        }

        const stateMachine = this.entity.get(StateMachineComponent);
        if (stateMachine) {
          stateMachine.stateMachine.enter('idle');
        }
      }
    }
  }

  onDestroy(): void {
    const sprite = this.entity.get(SpriteComponent);
    if (sprite?.sprite.mask) {
      sprite.sprite.clearMask();
    }
  }
}
