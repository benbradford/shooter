import type { Component } from '../../Component';
import { DEPTH_PARTICLE } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';

const RUBBLE_PIECE_COUNT = 6;
const RUBBLE_PIECE_SIZE_PX = 8;
const SAMPLE_AREA_PERCENT = 0.3;

export class BugBurstComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  burst(): void {
    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    const textureKey = 'bug_rubble_sheet';

    if (!this.scene.textures.exists(textureKey)) {
      const bugTexture = this.scene.textures.get('bug');
      const bugFrame = bugTexture.get(sprite.sprite.frame.name);
      const canvas = this.scene.textures.createCanvas(textureKey, RUBBLE_PIECE_SIZE_PX * RUBBLE_PIECE_COUNT, RUBBLE_PIECE_SIZE_PX);
      const ctx = canvas?.context;

      if (ctx && bugTexture.source[0]) {
        const centerX = bugFrame.cutX + bugFrame.width / 2;
        const centerY = bugFrame.cutY + bugFrame.height / 2;
        const sampleAreaSize = bugFrame.width * SAMPLE_AREA_PERCENT;
        const sampleAreaHalf = sampleAreaSize / 2;

        for (let i = 0; i < RUBBLE_PIECE_COUNT; i++) {
          const srcX = centerX - sampleAreaHalf + Math.random() * (sampleAreaSize - RUBBLE_PIECE_SIZE_PX);
          const srcY = centerY - sampleAreaHalf + Math.random() * (sampleAreaSize - RUBBLE_PIECE_SIZE_PX);

          ctx.drawImage(
            bugTexture.source[0].source as HTMLImageElement,
            srcX, srcY, RUBBLE_PIECE_SIZE_PX, RUBBLE_PIECE_SIZE_PX,
            i * RUBBLE_PIECE_SIZE_PX, 0, RUBBLE_PIECE_SIZE_PX, RUBBLE_PIECE_SIZE_PX
          );
        }
        canvas.refresh();

        this.scene.textures.addSpriteSheet(textureKey, canvas, {
          frameWidth: RUBBLE_PIECE_SIZE_PX,
          frameHeight: RUBBLE_PIECE_SIZE_PX
        });
      }
    }

    const emitter = this.scene.add.particles(transform.x, transform.y, textureKey, {
      speed: { min: 30, max: 90 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      frequency: 3,
      frame: [0, 1, 2, 3, 4, 5],
      blendMode: 'NORMAL',
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 14) } as Phaser.Types.GameObjects.Particles.EmitZoneData
    });

    emitter.setDepth(DEPTH_PARTICLE);

    this.scene.time.delayedCall(200, () => {
      emitter.stop();
    });

    this.scene.time.delayedCall(600, () => {
      emitter.destroy();
    });
  }

}
