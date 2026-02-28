import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { WaterEffectComponent } from './WaterEffectComponent';
import type { Grid } from '../../../systems/grid/Grid';

const RIPPLE_INTERVAL_MS = 250;
const RIPPLE_INTERVAL_VARIANCE_MS = 100;
const RIPPLE_SCALE = 0.2;
const RIPPLE_FRAME_RATE = 6;
const RIPPLE_OFFSET_VARIANCE_PX = 15;

export class WaterRippleComponent implements Component {
  entity!: Entity;
  private timeSinceLastRippleMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: Grid
  ) {}

  update(delta: number): void {
    const water = this.entity.get(WaterEffectComponent);
    if (water?.isHopping()) {
      this.timeSinceLastRippleMs = 0;
      return;
    }

    this.timeSinceLastRippleMs += delta;

    const interval = RIPPLE_INTERVAL_MS + (Math.random() - 0.5) * RIPPLE_INTERVAL_VARIANCE_MS;

    if (this.timeSinceLastRippleMs >= interval) {
      const gridPos = this.entity.get(GridPositionComponent);
      if (!gridPos) return;

      const cell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
      const isWater = cell?.properties.has('water') ?? false;
      const isBridge = cell?.properties.has('bridge') ?? false;
      
      if (isWater && (!isBridge || water?.getIsInWater())) {
        const transform = this.entity.require(TransformComponent);
        const offsetX = (Math.random() - 0.5) * RIPPLE_OFFSET_VARIANCE_PX;
        const offsetY = (Math.random() - 0.5) * RIPPLE_OFFSET_VARIANCE_PX;
        this.spawnRipple(transform.x + offsetX, transform.y + offsetY);
        this.timeSinceLastRippleMs = 0;
      } else {
        this.timeSinceLastRippleMs = 0;
      }
    }
  }

  private spawnRipple(x: number, y: number): void {
    const ripple = this.scene.add.sprite(x, y, 'water_ripple', 0);
    ripple.setScale(RIPPLE_SCALE);
    ripple.setDepth(-9);
    
    // Create mask for this ripple based on water cells it overlaps
    const rippleRadius = (ripple.displayWidth / 2) * RIPPLE_SCALE;
    const maskGraphics = this.scene.add.graphics();
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.setVisible(false); // Mask graphics should be invisible
    
    // Check cells within ripple radius
    const centerCell = this.grid.worldToCell(x, y);
    const cellRadius = Math.ceil(rippleRadius / this.grid.cellSize);
    
    for (let row = centerCell.row - cellRadius; row <= centerCell.row + cellRadius; row++) {
      for (let col = centerCell.col - cellRadius; col <= centerCell.col + cellRadius; col++) {
        const cell = this.grid.getCell(col, row);
        
        if (cell?.properties.has('water')) {
          const world = this.grid.cellToWorld(col, row);
          
          // Check neighbors to determine which edges border land
          const hasWaterLeft = this.grid.getCell(col - 1, row)?.properties.has('water') ?? false;
          const hasWaterRight = this.grid.getCell(col + 1, row)?.properties.has('water') ?? false;
          const hasWaterUp = this.grid.getCell(col, row - 1)?.properties.has('water') ?? false;
          const hasWaterDown = this.grid.getCell(col, row + 1)?.properties.has('water') ?? false;
          
          // Inset edges that border land
          const inset = 8;
          const left = world.x + (hasWaterLeft ? 0 : inset);
          const top = world.y + (hasWaterUp ? 0 : inset);
          const right = world.x + this.grid.cellSize - (hasWaterRight ? 0 : inset);
          const bottom = world.y + this.grid.cellSize - (hasWaterDown ? 0 : inset);
          
          maskGraphics.fillRect(left, top, right - left, bottom - top);
        }
      }
    }
    
    const mask = maskGraphics.createGeometryMask();
    ripple.setMask(mask);
    
    ripple.play({ key: 'water_ripple_anim', frameRate: RIPPLE_FRAME_RATE, repeat: 0 });
    ripple.on('animationcomplete', () => {
      ripple.destroy();
      maskGraphics.destroy();
    });
  }
}
