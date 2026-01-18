import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { TransformComponent } from './TransformComponent';

export interface HudBarDataSource {
  getRatio(): number;
}

interface BarConfig {
  dataSource: HudBarDataSource;
  offsetY: number;
  fillColor: number;
}

export class HudBarComponent implements Component {
  entity!: Entity;
  private readonly barWidth: number = 64;
  private readonly barHeight: number = 8;
  private readonly bars: Array<{
    background: Phaser.GameObjects.Rectangle;
    fill: Phaser.GameObjects.Rectangle;
    outline: Phaser.GameObjects.Rectangle;
    dataSource: HudBarDataSource;
    offsetY: number;
    fillColor: number;
    flashTimer: number;
  }> = [];
  private readonly flashInterval: number = 300;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly configs: BarConfig[]
  ) {}

  init(): void {
    const transform = this.entity.get(TransformComponent)!;
    
    for (const config of this.configs) {
      // Background (black)
      const background = this.scene.add.rectangle(
        transform.x,
        transform.y + config.offsetY,
        this.barWidth,
        this.barHeight,
        0x000000
      );
      
      // Fill (configurable color)
      const fill = this.scene.add.rectangle(
        transform.x,
        transform.y + config.offsetY,
        this.barWidth,
        this.barHeight,
        config.fillColor
      );
      
      // Outline (white)
      const outline = this.scene.add.rectangle(
        transform.x,
        transform.y + config.offsetY,
        this.barWidth,
        this.barHeight
      );
      outline.setStrokeStyle(2, 0xffffff);
      outline.setFillStyle(0x000000, 0); // Transparent fill
      
      this.bars.push({
        background,
        fill,
        outline,
        dataSource: config.dataSource,
        offsetY: config.offsetY,
        fillColor: config.fillColor,
        flashTimer: 0,
      });
    }
  }

  update(delta: number): void {
    const transform = this.entity.get(TransformComponent)!;
    
    for (const bar of this.bars) {
      const ratio = bar.dataSource.getRatio();
      
      const barX = transform.x;
      const barY = transform.y + bar.offsetY;
      
      // Update positions (centered)
      bar.background.setPosition(barX, barY);
      bar.outline.setPosition(barX, barY);
      
      // Update fill width and position (left-aligned from left edge of bar)
      const fillWidth = this.barWidth * ratio;
      bar.fill.setSize(fillWidth, this.barHeight);
      const fillX = barX - this.barWidth / 2 + fillWidth / 2;
      bar.fill.setPosition(fillX, barY);
      
      // Flash when empty (ratio at 0)
      if (ratio === 0) {
        bar.flashTimer += delta;
        if (bar.flashTimer >= this.flashInterval) {
          bar.flashTimer = 0;
          // Toggle visibility
          const isVisible = bar.outline.visible;
          bar.outline.setVisible(!isVisible);
          bar.background.setVisible(!isVisible);
        }
      } else {
        // Ensure visible when not empty
        bar.outline.setVisible(true);
        bar.background.setVisible(true);
        bar.flashTimer = 0;
      }
    }
  }

  onDestroy(): void {
    for (const bar of this.bars) {
      bar.background.destroy();
      bar.fill.destroy();
      bar.outline.destroy();
    }
  }
}
