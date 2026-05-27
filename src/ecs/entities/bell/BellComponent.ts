import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { WorldStateManager } from '../../../systems/WorldStateManager';

const SWING_DURATION_MS = 2500;
const INITIAL_AMPLITUDE_DEGREES = 25;
const SWING_FREQUENCY = 8;
const SHOCKWAVE_COUNT = 3;
const SHOCKWAVE_INTERVAL_MS = 400;

export type BellComponentProps = {
  scene: Phaser.Scene;
  barSprite: Phaser.GameObjects.Image;
  bodySprite: Phaser.GameObjects.Image;
  clapperSprite: Phaser.GameObjects.Image;
  eventManager: EventManagerSystem;
  eventName: string;
  alreadyRung: boolean;
};

export class BellComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private readonly barSprite: Phaser.GameObjects.Image;
  private readonly bodySprite: Phaser.GameObjects.Image;
  private readonly clapperSprite: Phaser.GameObjects.Image;
  private readonly eventManager: EventManagerSystem;
  private readonly eventName: string;
  private isRinging = false;
  private rungAlready: boolean;
  private elapsedMs = 0;
  private shockwavesFired = 0;

  constructor(props: BellComponentProps) {
    this.scene = props.scene;
    this.barSprite = props.barSprite;
    this.bodySprite = props.bodySprite;
    this.clapperSprite = props.clapperSprite;
    this.eventManager = props.eventManager;
    this.eventName = props.eventName;
    this.rungAlready = props.alreadyRung;

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
    if (!this.isRinging) return;

    this.elapsedMs += delta;
    const progress = Math.min(this.elapsedMs / SWING_DURATION_MS, 1);

    const decay = 1 - progress;
    const angle = Math.sin((this.elapsedMs / 1000) * SWING_FREQUENCY * Math.PI) * INITIAL_AMPLITUDE_DEGREES * decay;

    this.bodySprite.setAngle(angle);
    this.clapperSprite.setAngle(angle * -0.3);

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

  private swapToCracked(): void {
    const displayW = this.bodySprite.displayWidth;
    const displayH = this.bodySprite.displayHeight;
    this.bodySprite.setTexture('bell_cracked');
    this.bodySprite.setDisplaySize(displayW, displayH);
  }

  private emitShockwave(): void {
    const x = this.bodySprite.x;
    const y = this.bodySprite.y;

    const ring = this.scene.add.circle(x, y, 10, 0xffffff, 0.6);
    ring.setDepth(this.bodySprite.depth - 1);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private finishRinging(): void {
    this.isRinging = false;
    this.bodySprite.setAngle(0);
    this.clapperSprite.setAngle(0);
    this.rungAlready = true;

    WorldStateManager.getInstance().setFlag(this.eventName, 'true');
    this.eventManager.raiseEvent(this.eventName);
  }

  onDestroy(): void {
    this.barSprite.destroy();
    this.bodySprite.destroy();
    this.clapperSprite.destroy();
  }
}
