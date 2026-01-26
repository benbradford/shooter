import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';

export interface HudBarDataSource {
  getRatio(): number;
  isBarOverheated?(): boolean;
}

interface BarConfig {
  dataSource: HudBarDataSource;
  offsetY: number;
  fillColor: number;
  redOutlineOnLow?: boolean; // Optional: outline turns red as ratio decreases
  shakeOnLow?: boolean; // Optional: shake when ratio is low
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
    redOutlineOnLow: boolean;
    shakeOnLow: boolean;
    shakeTimer: number;
  }> = [];
  private readonly flashIntervalMs: number = 300;
  private readonly shakeSpeedMs: number = 100; // milliseconds per shake cycle
  private readonly shakeAmountPx: number = 2; // pixels
  private readonly shakeLowThreshold: number = 0.3; // 30% - shake when below this ratio
  private readonly shakeFrequency: number = 2; // full sine wave cycles per shake

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly configs: BarConfig[]
  ) {}

  init(): void {
    const transform = this.entity.require(TransformComponent);
    
    for (const config of this.configs) {
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
        redOutlineOnLow: config.redOutlineOnLow ?? false,
        shakeOnLow: config.shakeOnLow ?? false,
        shakeTimer: 0,
      });
    }
  }

  update(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    
    for (const bar of this.bars) {
      const ratio = bar.dataSource.getRatio();
      
      let barX = transform.x;
      const barY = transform.y + bar.offsetY;
      
      // Shake if enabled and ratio is low
      if (bar.shakeOnLow && ratio < this.shakeLowThreshold && ratio > 0) {
        bar.shakeTimer += delta;
        const shakeProgress = (bar.shakeTimer % this.shakeSpeedMs) / this.shakeSpeedMs;
        const shakeOffset = Math.sin(shakeProgress * Math.PI * this.shakeFrequency) * this.shakeAmountPx;
        barX += shakeOffset;
      } else {
        bar.shakeTimer = 0;
      }
      
      // Update positions (centered)
      bar.background.setPosition(barX, barY);
      bar.outline.setPosition(barX, barY);
      
      // Update fill width and position (left-aligned from left edge of bar)
      const fillWidth = this.barWidth * ratio;
      bar.fill.setSize(fillWidth, this.barHeight);
      const fillX = barX - this.barWidth / 2 + fillWidth / 2;
      bar.fill.setPosition(fillX, barY);
      
      // Check if overheated and change fill color
      const isOverheated = bar.dataSource.isBarOverheated?.() ?? false;
      if (isOverheated && ratio < 1) {
        bar.fill.setFillStyle(0xff0000); // Red when overheated
      } else {
        bar.fill.setFillStyle(bar.fillColor); // Normal color
      }
      
      // Update outline color if redOutlineOnLow is enabled
      if (bar.redOutlineOnLow) {
        // Interpolate from white (full) to red (empty)
        // ratio 1.0 = white (0xffffff), ratio 0.0 = red (0xff0000)
        const red = 255;
        const green = Math.floor(255 * ratio);
        const blue = Math.floor(255 * ratio);
        const color = (red << 16) | (green << 8) | blue;
        bar.outline.setStrokeStyle(2, color);
      }
      
      // Flash when empty (ratio at 0)
      if (ratio === 0) {
        bar.flashTimer += delta;
        if (bar.flashTimer >= this.flashIntervalMs) {
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
