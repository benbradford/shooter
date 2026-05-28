import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { TransformComponent } from '../../components/core/TransformComponent';

const SWING_DURATION_MS = 2500;
const INITIAL_AMPLITUDE_DEGREES = 25;
const SWING_FREQUENCY = 8;
const SHOCKWAVE_COUNT = 3;
const SHOCKWAVE_INTERVAL_MS = 400;

export type BellComponentProps = {
  scene: Phaser.Scene;
  barSprite: Phaser.GameObjects.Image;
  bodySprite: Phaser.GameObjects.Image;
  shadowSprite: Phaser.GameObjects.Image;
  eventManager: EventManagerSystem;
  eventName: string;
  alreadyRung: boolean;
  visualOffsetY: number;
  shadowOffsetY: number;
};

export class BellComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private readonly barSprite: Phaser.GameObjects.Image;
  private readonly bodySprite: Phaser.GameObjects.Image;
  private readonly shadowSprite: Phaser.GameObjects.Image;
  private readonly eventManager: EventManagerSystem;
  private readonly eventName: string;
  private isRinging = false;
  private rungAlready: boolean;
  private elapsedMs = 0;
  private shockwavesFired = 0;
  private readonly visualOffsetY: number;
  private readonly shadowOffsetY: number;

  constructor(props: BellComponentProps) {
    this.scene = props.scene;
    this.barSprite = props.barSprite;
    this.bodySprite = props.bodySprite;
    this.shadowSprite = props.shadowSprite;
    this.eventManager = props.eventManager;
    this.eventName = props.eventName;
    this.rungAlready = props.alreadyRung;
    this.visualOffsetY = props.visualOffsetY;
    this.shadowOffsetY = props.shadowOffsetY;

    if (this.rungAlready) {
      this.swapToCracked();
    }
  }

  ring(): void {
    if (this.isRinging || this.rungAlready) return;
    this.isRinging = true;
    this.elapsedMs = 0;
    this.shockwavesFired = 0;
    this.scene.sound.play('bell_ding');
  }

  update(delta: number): void {
    this.syncPosition();
    this.updateDepthSort();
    if (!this.isRinging) return;

    this.elapsedMs += delta;
    const progress = Math.min(this.elapsedMs / SWING_DURATION_MS, 1);

    const decay = 1 - progress;
    const angle = Math.sin((this.elapsedMs / 1000) * SWING_FREQUENCY * Math.PI) * INITIAL_AMPLITUDE_DEGREES * decay;

    this.bodySprite.setAngle(angle);

    if (this.shockwavesFired < SHOCKWAVE_COUNT) {
      const nextShockwaveTime = this.shockwavesFired * SHOCKWAVE_INTERVAL_MS + 100;
      if (this.elapsedMs >= nextShockwaveTime) {
        this.emitShockwave();
        this.shockwavesFired++;
      }
    }

    if (progress >= 0.6 && this.bodySprite.texture.key !== 'bell_cracked') {
      this.swapToCracked();
    }

    if (progress >= 1) {
      this.finishRinging();
    }
  }

  private syncPosition(): void {
    const transform = this.entity.require(TransformComponent);
    const x = transform.x;
    const visualY = transform.y + this.visualOffsetY;
    this.barSprite.setPosition(x, visualY);
    this.bodySprite.setPosition(x, visualY + 8);
    this.shadowSprite.setPosition(x, visualY + this.shadowOffsetY);
  }

  private updateDepthSort(): void {
    const scene = this.scene.scene.get('game') as { entityManager?: { getFirst(type: string): import('../../Entity').Entity | undefined } } | undefined;
    const playerEntity = scene?.entityManager?.getFirst('player');
    if (!playerEntity) return;
    const playerTransform = playerEntity.require(TransformComponent);
    const bellSortY = this.shadowSprite.y - 10;
    const depth = bellSortY > playerTransform.y ? 1 : -1;
    this.barSprite.setDepth(depth);
    this.bodySprite.setDepth(depth);
  }

  private swapToCracked(): void {
    this.bodySprite.setTexture('bell_cracked');
  }

  private emitShockwave(): void {
    const x = this.bodySprite.x;
    const y = this.bodySprite.y + 30;

    const ring = this.scene.add.circle(x, y, 16, 0xffffff, 0.8);
    ring.setDepth(this.bodySprite.depth - 1);
    ring.setStrokeStyle(3, 0xffd700, 0.9);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 8,
      scaleY: 8,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private finishRinging(): void {
    this.isRinging = false;
    this.bodySprite.setAngle(0);
    this.rungAlready = true;

    WorldStateManager.getInstance().setFlag(this.eventName, 'true');
    this.eventManager.raiseEvent(this.eventName);
  }

  onDestroy(): void {
    this.barSprite.destroy();
    this.bodySprite.destroy();
    this.shadowSprite.destroy();
  }
}
