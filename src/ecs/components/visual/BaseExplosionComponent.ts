import type { Component } from '../../Component';
import { DEPTH_PARTICLE } from '../../../constants/DepthConstants';
import type { EntityManager } from '../../EntityManager';
import { SpriteComponent } from '../core/SpriteComponent';
import { CollisionComponent } from '../combat/CollisionComponent';
import { GridCellBlocker } from '../movement/GridCellBlocker';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { createExhaustedBugBaseEntity } from '../../entities/bug/ExhaustedBugBaseEntity';
import type { Grid } from '../../../systems/grid/Grid';

export type BaseExplosionComponentProps = {
  scene: Phaser.Scene;
  grid: Grid;
  col: number;
  row: number;
  entityManager: EntityManager;
}

export class BaseExplosionComponent implements Component {
  entity!: import('../../Entity').Entity;
  private readonly scene: Phaser.Scene;
  private readonly grid: Grid;
  private readonly col: number;
  private readonly row: number;
  private readonly entityManager: EntityManager;
  private changeSpriteTime = 0;
  private hasExploded = false;

  constructor(props: BaseExplosionComponentProps) {
    this.scene = props.scene;
    this.grid = props.grid;
    this.col = props.col;
    this.row = props.row;
    this.entityManager = props.entityManager;
  }

  update(delta: number): void {
    if (this.hasExploded) {
      this.changeSpriteTime += delta;
      if (this.changeSpriteTime > 300) {
        const exhaustedId = `${this.entity.id}_exhausted`;

        const exhaustedEntity = createExhaustedBugBaseEntity({
          scene: this.scene,
          col: this.col,
          row: this.row,
          grid: this.grid,
          entityId: exhaustedId
        });
        exhaustedEntity.levelName = this.entity.levelName;

        this.entityManager.add(exhaustedEntity);

        if (this.entity.levelName) {
          const worldState = WorldStateManager.getInstance();
          worldState.addLiveEntity(this.entity.levelName, exhaustedId);
        }

        this.scene.time.delayedCall(0, () => this.entity.destroy());
      }
    }
  }

  explode(): void {
    this.hasExploded = true;
    const sprite = this.entity.require(SpriteComponent);
    const collision = this.entity.require(CollisionComponent);

    collision.enabled = false;
    this.entity.remove(GridCellBlocker);

    sprite.sprite.clearTint();
    this.entity.setUpdateOrder([BaseExplosionComponent]);

    const RUBBLE_PIECE_COUNT = 6;
    const RUBBLE_PIECE_SIZE = 8;
    const textureKey = 'base_rubble_sheet';

    if (!this.scene.textures.exists(textureKey)) {
      const baseTexture = this.scene.textures.get('base_destroyed');
      const baseFrame = baseTexture.get(0);
      const canvas = this.scene.textures.createCanvas(textureKey, RUBBLE_PIECE_SIZE * RUBBLE_PIECE_COUNT, RUBBLE_PIECE_SIZE);
      const ctx = canvas?.context;

      if (ctx && baseTexture.source[0]) {
        const centerX = baseFrame.cutX + baseFrame.width / 2;
        const centerY = baseFrame.cutY + baseFrame.height / 2;
        const sampleAreaSize = baseFrame.width * 0.4;
        const sampleAreaHalf = sampleAreaSize / 2;

        for (let i = 0; i < RUBBLE_PIECE_COUNT; i++) {
          const srcX = centerX - sampleAreaHalf + Math.random() * (sampleAreaSize - RUBBLE_PIECE_SIZE);
          const srcY = centerY - sampleAreaHalf + Math.random() * (sampleAreaSize - RUBBLE_PIECE_SIZE);

          ctx.drawImage(
            baseTexture.source[0].source as HTMLImageElement,
            srcX, srcY, RUBBLE_PIECE_SIZE, RUBBLE_PIECE_SIZE,
            i * RUBBLE_PIECE_SIZE, 0, RUBBLE_PIECE_SIZE, RUBBLE_PIECE_SIZE
          );
        }
        canvas.refresh();

        this.scene.textures.addSpriteSheet(textureKey, canvas, {
          frameWidth: RUBBLE_PIECE_SIZE,
          frameHeight: RUBBLE_PIECE_SIZE
        });
      }
    }

    const emitter = this.scene.add.particles(sprite.sprite.x, sprite.sprite.y, textureKey, {
      speed: { min: 40, max: 80 },
      angle: { min: -120, max: -60 },
      scale: { start: 0.5, end: 0.2 },
      alpha: { start: 1, end: 0 },
      lifespan: 1200,
      frequency: 25,
      quantity: 30,
      blendMode: 'NORMAL',
      gravityY: 120,
      frame: [0, 1, 2, 3, 4, 5],
      emitZone: {
        type: 'random' as const,
        source: new Phaser.Geom.Circle(0, 0, 50) as Phaser.Types.GameObjects.Particles.RandomZoneSource
      }
    });

    emitter.setDepth(DEPTH_PARTICLE);
    this.scene.time.delayedCall(300, () => emitter.stop());
    this.scene.time.delayedCall(3000, () => emitter.destroy());
  }

}
