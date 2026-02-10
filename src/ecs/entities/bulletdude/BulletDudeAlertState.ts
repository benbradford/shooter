import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { dirFromDelta, Direction } from '../../../constants/Direction';
import type Phaser from 'phaser';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';

const ALERT_DURATION_MS = 500;
const EXCLAMATION_OFFSET_Y_PX = -120;
const EXCLAMATION_RISE_Y_PX = -140;
const EXCLAMATION_SCALE = 2;
const EXCLAMATION_DEPTH = 3;
const EXCLAMATION_ANIMATION_DURATION_MS = 300;

export class BulletDudeAlertState implements IState {
  private elapsedMs = 0;
  private exclamationSprite: Phaser.GameObjects.Sprite | null = null;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly scene: Phaser.Scene
  ) {}

  onEnter(): void {
    this.elapsedMs = 0;

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const direction = dirFromDelta(dx, dy);
    const dirName = Direction[direction].toLowerCase();
    sprite.sprite.play(`bulletdude_idle_${dirName}`);

    this.exclamationSprite = this.scene.add.sprite(
      transform.x,
      transform.y + EXCLAMATION_OFFSET_Y_PX,
      'exclamation'
    );
    this.exclamationSprite.setScale(EXCLAMATION_SCALE);
    this.exclamationSprite.setDepth(EXCLAMATION_DEPTH);
    this.exclamationSprite.setAlpha(0);

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

    if (this.exclamationSprite) {
      const transform = this.entity.require(TransformComponent);
      this.exclamationSprite.setPosition(transform.x, transform.y + EXCLAMATION_RISE_Y_PX);
    }

    if (this.elapsedMs >= ALERT_DURATION_MS) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('shooting');
    }
  }
}
