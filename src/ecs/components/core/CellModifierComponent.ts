import { SoundManager } from '../../../systems/SoundManager';
import type { Component } from '../../Component';
import type { Grid, CellProperty } from '../../../systems/grid/Grid';
import { Depth } from '../../../constants/DepthConstants';

import { bgTextureKey, type SingleBackgroundTexture } from '../../../systems/level/LevelLoader';

export type CellModification = {
  col: number;
  row: number;
  properties?: CellProperty[];
  backgroundTexture?: SingleBackgroundTexture;
  layer?: number;
}

export type CellModifierComponentProps = {
  cellsToModify: CellModification[];
  grid: Grid;
  scene: Phaser.Scene;
}

const FADE_DURATION_MS = 500;

export class CellModifierComponent implements Component {
  entity!: import('../../Entity').Entity;
  public readonly cellsToModify: CellModification[];
  private readonly grid: Grid;
  private readonly scene: Phaser.Scene;
  private executed: boolean = false;

  constructor(props: CellModifierComponentProps) {
    this.cellsToModify = props.cellsToModify;
    this.grid = props.grid;
    this.scene = props.scene;
  }

  update(_delta: number): void {
    if (this.executed) return;
    this.executed = true;

    for (const mod of this.cellsToModify) {
      const cell = this.grid.getCell(mod.col, mod.row);
      if (!cell) {
        console.warn(`[CellModifier] Cell (${mod.col}, ${mod.row}) not found`);
        continue;
      }

      const updates: { properties?: Set<CellProperty>; backgroundTexture?: string; layer?: number } = {};

      if ('properties' in mod) {
         updates.properties = mod.properties ? new Set(mod.properties) : new Set();
      } else {
        updates.properties = new Set();
      }

      if ('backgroundTexture' in mod) {
        if (mod.backgroundTexture) {
          updates.backgroundTexture = bgTextureKey(mod.backgroundTexture);
        } else {
          updates.backgroundTexture = undefined;
        }
      }

      if (mod.layer !== undefined) {
        updates.layer = mod.layer;
      }
      this.grid.setCell(mod.col, mod.row, updates);
    }

    const gameScene = this.scene as unknown as {
      sceneRenderer?: {
        invalidateCells: (cells: Array<{ col: number; row: number }>) => void;
        updateGraphics: (grid: Grid, levelData?: unknown) => void;
      };
      getLevelData: () => { cells: Array<{ col: number; row: number; backgroundTexture?: SingleBackgroundTexture | SingleBackgroundTexture[]; properties?: string[]; layer?: number }> };
    };

    if (gameScene.sceneRenderer && gameScene.getLevelData) {
      const levelData = gameScene.getLevelData();
      const cellsWithNewTextures: Array<{ col: number; row: number; texture: SingleBackgroundTexture }> = [];

      for (const mod of this.cellsToModify) {
        let levelCell = levelData.cells.find(c => c.col === mod.col && c.row === mod.row);
        if (!levelCell) {
          levelCell = { col: mod.col, row: mod.row };
          levelData.cells.push(levelCell);
        }
        if ('backgroundTexture' in mod) {
          if (mod.backgroundTexture) {
            levelCell.backgroundTexture = mod.backgroundTexture;
            cellsWithNewTextures.push({ col: mod.col, row: mod.row, texture: mod.backgroundTexture });
          } else {
            delete levelCell.backgroundTexture;
          }
        }
      }

      gameScene.sceneRenderer.invalidateCells(this.cellsToModify);

      SoundManager.getInstance().play('shimmer1');

      // Create spark texture at runtime if needed
      if (!this.scene.textures.exists('spark')) {
        const g = this.scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('spark', 8, 8);
        g.destroy();
      }

      // Sparkle + flash on each modified cell, staggered as a wave
      this.cellsToModify.forEach((mod, i) => {
        this.scene.time.delayedCall(i * 30, () => {
          const worldPos = this.grid.cellToWorld(mod.col, mod.row);
          const cx = worldPos.x + this.grid.cellSize / 2;
          const cy = worldPos.y + this.grid.cellSize / 2;

          // Flash
          const flash = this.scene.add.circle(cx, cy, 12, 0xffffff, 0.3);
          flash.setDepth(Depth.cellTextureModified + 2);
          this.scene.tweens.add({
            targets: flash,
            scale: 2,
            alpha: 0,
            duration: 200,
            onComplete: () => { flash.destroy(); }
          });

          // Sparkle particles
          const halfCell = this.grid.cellSize / 2;
          const emitter = this.scene.add.particles(cx, cy, 'spark', {
            lifespan: { min: 300, max: 600 },
            speed: { min: 20, max: 80 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            gravityY: -30,
            tint: [0x88ffff, 0xffffff, 0xfff2aa],
            quantity: 2,
            frequency: 30,
            emitZone: { type: 'random' as const, source: new Phaser.Geom.Rectangle(-halfCell, -halfCell, this.grid.cellSize, this.grid.cellSize) } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig,
            blendMode: 'ADD',
          });
          emitter.setDepth(Depth.cellTextureModified + 2);
          this.scene.time.delayedCall(200, () => { emitter.stop(); });
          this.scene.time.delayedCall(800, () => { emitter.destroy(); });
        });
      });

      // Re-render grid graphics after fade completes
      const renderer = gameScene.sceneRenderer;
      this.scene.time.delayedCall(500, () => {
        renderer?.updateGraphics(this.grid, levelData);
      });

      for (const cell of cellsWithNewTextures) {
        const worldPos = this.grid.cellToWorld(cell.col, cell.row);
        const key = bgTextureKey(cell.texture);
        const sprite = this.scene.add.image(
          worldPos.x + this.grid.cellSize / 2,
          worldPos.y + this.grid.cellSize / 2,
          key
        );
        const t = typeof cell.texture === 'object' ? cell.texture.transformOverride : undefined;
        if (t) {
          sprite.setScale(t.scaleX * this.grid.cellSize / sprite.width, t.scaleY * this.grid.cellSize / sprite.height);
          sprite.setPosition(sprite.x + t.offsetX, sprite.y + t.offsetY);
        } else {
          sprite.setDisplaySize(this.grid.cellSize, this.grid.cellSize);
        }
        sprite.setDepth(Depth.cellTextureModified);
        sprite.setAlpha(0);

        this.scene.tweens.add({
          targets: sprite,
          alpha: 1,
          duration: FADE_DURATION_MS
        });
      }
    }

    this.entity.destroy();
  }

  onDestroy(): void {
    // Cleanup if needed
  }
}
