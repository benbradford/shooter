import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { dirFromDelta } from '../constants/Direction';
import type Phaser from 'phaser';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';

export class RobotAlertState implements IState {
  private entity: Entity;
  private playerEntity: Entity;
  private scene: Phaser.Scene;
  private alertDuration: number = 1000; // 1 second
  private elapsed: number = 0;
  private exclamationSprite: Phaser.GameObjects.Sprite | null = null;

  constructor(entity: Entity, scene: Phaser.Scene, playerEntity: Entity) {
    this.entity = entity;
    this.scene = scene;
    this.playerEntity = playerEntity;
  }

  onEnter(): void {
    this.elapsed = 0;

    const transform = this.entity.get(TransformComponent);
    const playerTransform = this.playerEntity.get(TransformComponent);
    const sprite = this.entity.get(SpriteComponent);

    if (!transform || !playerTransform || !sprite) return;

    // Face towards player
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const direction = dirFromDelta(dx, dy);
    const frameIndex = this.getIdleFrameForDirection(direction);
    sprite.sprite.setFrame(frameIndex);

    // Create exclamation sprite above robot
    this.exclamationSprite = this.scene.add.sprite(
      transform.x,
      transform.y - 120, // Higher above robot head
      'exclamation'
    );
    this.exclamationSprite.setScale(4); // 4x scale
    this.exclamationSprite.setDepth(3); // Above robot
    this.exclamationSprite.setAlpha(0);

    // Animate exclamation rising
    this.scene.tweens.add({
      targets: this.exclamationSprite,
      y: transform.y - 140,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  onExit(): void {
    if (this.exclamationSprite) {
      this.exclamationSprite.destroy();
      this.exclamationSprite = null;
    }
  }

  onUpdate(delta: number): void {
    this.elapsed += delta;

    const stateMachine = this.entity.get(StateMachineComponent);
    if (!stateMachine) return;

    // Keep exclamation above robot
    if (this.exclamationSprite) {
      const transform = this.entity.get(TransformComponent);
      if (transform) {
        this.exclamationSprite.setPosition(transform.x, transform.y - 140);
      }
    }

    // After 1 second, transition to stalking
    if (this.elapsed >= this.alertDuration) {
      stateMachine.stateMachine.enter('stalking');
    }
  }

  private getIdleFrameForDirection(direction: number): number {
    const directionMap: Record<number, number> = {
      0: 0, // None -> south
      1: 0, // Down
      2: 1, // Up
      3: 2, // Left
      4: 3, // Right
      5: 4, // UpLeft
      6: 5, // UpRight
      7: 6, // DownLeft
      8: 7, // DownRight
    };
    return directionMap[direction] || 0;
  }
}
