import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { dirFromDelta } from '../../../constants/Direction';
import type Phaser from 'phaser';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';

// Alert state configuration
const ALERT_DURATION_MS = 1000; // milliseconds
const EXCLAMATION_OFFSET_Y_PX = -120; // pixels above robot
const EXCLAMATION_RISE_Y_PX = -140; // final Y position
const EXCLAMATION_SCALE = 2;
const EXCLAMATION_DEPTH = 3;
const EXCLAMATION_ANIMATION_DURATION_MS = 300; // milliseconds

export class RobotAlertState implements IState {
  private readonly entity: Entity;
  private readonly playerEntity: Entity;
  private readonly scene: Phaser.Scene;
  private elapsedMs: number = 0;
  private exclamationSprite: Phaser.GameObjects.Sprite | null = null;

  constructor(entity: Entity, scene: Phaser.Scene, playerEntity: Entity) {
    this.entity = entity;
    this.scene = scene;
    this.playerEntity = playerEntity;
  }

  onEnter(): void {
    this.elapsedMs = 0;

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const direction = dirFromDelta(dx, dy);
    const frameIndex = this.getIdleFrameForDirection(direction);
    sprite.sprite.setFrame(frameIndex);

    // Create exclamation sprite above robot
    this.exclamationSprite = this.scene.add.sprite(
      transform.x,
      transform.y + EXCLAMATION_OFFSET_Y_PX,
      'exclamation'
    );
    this.exclamationSprite.setScale(EXCLAMATION_SCALE);
    this.exclamationSprite.setDepth(EXCLAMATION_DEPTH);
    this.exclamationSprite.setAlpha(0);

    // Animate exclamation rising
    this.scene.tweens.add({
      targets: this.exclamationSprite,
      y: transform.y + EXCLAMATION_RISE_Y_PX,
      alpha: 1,
      duration: EXCLAMATION_ANIMATION_DURATION_MS,
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
    this.elapsedMs += delta;

    const stateMachine = this.entity.require(StateMachineComponent);

    if (this.exclamationSprite) {
      const transform = this.entity.require(TransformComponent);
      this.exclamationSprite.setPosition(transform.x, transform.y + EXCLAMATION_RISE_Y_PX);
    }

    if (this.elapsedMs >= ALERT_DURATION_MS) {
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
