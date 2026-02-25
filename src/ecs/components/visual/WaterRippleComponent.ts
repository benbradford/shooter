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
    ripple.setDepth(-8);
    ripple.play({ key: 'water_ripple_anim', frameRate: RIPPLE_FRAME_RATE, repeat: 0 });
    ripple.on('animationcomplete', () => ripple.destroy());
  }
}
