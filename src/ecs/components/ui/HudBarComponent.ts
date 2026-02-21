import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { HealthComponent } from '../core/HealthComponent';
import { MedipackHealerComponent } from '../core/MedipackHealerComponent';

export type HudBarDataSource = {
  getRatio(): number;
  getMaxHealth?(): number;
  isBarOverheated?(): boolean;
}

type BarConfig = {
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
    overhealFill?: Phaser.GameObjects.Rectangle;
    sparkles?: Phaser.GameObjects.Particles.ParticleEmitter;
    outline: Phaser.GameObjects.Rectangle;
    dataSource: HudBarDataSource;
    offsetY: number;
    fillColor: number;
    flashTimer: number;
    redOutlineOnLow: boolean;
    shakeOnLow: boolean;
    shakeTimer: number;
    fullTimer: number;
    fadeTimer: number;
  }> = [];
  private readonly flashIntervalMs: number = 300;
  private readonly shakeSpeedMs: number = 100; // milliseconds per shake cycle
  private readonly shakeAmountPx: number = 2; // pixels
  private readonly shakeLowThreshold: number = 0.3; // 30% - shake when below this ratio
  private readonly shakeFrequency: number = 2;
  private readonly fullDelayMs: number = 1000;
  private readonly fadeDurationMs: number = 1000;

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
      outline.setFillStyle(0x000000, 0);
      
      const overhealFill = this.scene.add.rectangle(
        transform.x,
        transform.y + config.offsetY,
        20,
        this.barHeight,
        0xff00ff
      );
      overhealFill.setDepth(1002);
      
      const sparkles = this.scene.add.particles(transform.x, transform.y + config.offsetY, 'coin', {
        speed: { min: 10, max: 30 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.05, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 400,
        frequency: 50,
        blendMode: 'ADD',
        emitting: false
      });
      sparkles.setDepth(1003);
      
      this.bars.push({
        background,
        fill,
        overhealFill,
        sparkles,
        outline,
        dataSource: config.dataSource,
        offsetY: config.offsetY,
        fillColor: config.fillColor,
        flashTimer: 0,
        redOutlineOnLow: config.redOutlineOnLow ?? false,
        shakeOnLow: config.shakeOnLow ?? false,
        shakeTimer: 0,
        fullTimer: 0,
        fadeTimer: 0,
      });
    }
  }

  update(delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const health = this.entity.require(HealthComponent);
    const healer = this.entity.get(MedipackHealerComponent);
    
    for (const bar of this.bars) {
      const ratio = bar.dataSource.getRatio();
      const isHealing = healer?.isHealing() ?? false;
      const hasOverheal = health.isOverhealed();
      
      if (ratio >= 1 && !isHealing && !hasOverheal) {
        bar.fullTimer += delta;
        if (bar.fullTimer >= this.fullDelayMs) {
          bar.fadeTimer += delta;
          const fadeProgress = Math.min(1, bar.fadeTimer / this.fadeDurationMs);
          const alpha = 1 - fadeProgress;
          bar.background.setAlpha(alpha);
          bar.fill.setAlpha(alpha);
          bar.outline.setAlpha(alpha);
        }
      } else {
        bar.fullTimer = 0;
        bar.fadeTimer = 0;
        bar.background.setAlpha(1);
        bar.fill.setAlpha(1);
        bar.outline.setAlpha(1);
      }
      
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
      
      if (healer && bar.overhealFill) {
        const overhealAmount = health.getOverhealAmount();
        const maxHealth = bar.dataSource.getMaxHealth?.() ?? 100;
        const overhealRatio = overhealAmount / maxHealth;
        const overhealWidth = this.barWidth * overhealRatio;
        
        if (overhealWidth > 0) {
          bar.overhealFill.setSize(overhealWidth, this.barHeight);
          const overhealX = barX - this.barWidth / 2 + overhealWidth / 2;
          bar.overhealFill.setPosition(overhealX, barY);
          bar.overhealFill.setAlpha(0.8);
          bar.overhealFill.setVisible(true);
        } else {
          bar.overhealFill.setVisible(false);
        }
        
        if (bar.sparkles) {
          if (healer.isHealing()) {
            const sparkleX = barX - this.barWidth / 2 + overhealWidth;
            bar.sparkles.setPosition(sparkleX, barY);
            bar.sparkles.emitting = true;
          } else {
            bar.sparkles.emitting = false;
          }
        }
      }
      
      // Check if overheated and change fill color
      const isOverheated = bar.dataSource.isBarOverheated?.() ?? false;
      if (isOverheated && ratio < 1) {
        bar.fill.setFillStyle(0xff0000);
      } else {
        bar.fill.setFillStyle(bar.fillColor);
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

  setVisible(visible: boolean): void {
    for (const bar of this.bars) {
      bar.background.setVisible(visible);
      bar.fill.setVisible(visible);
      bar.outline.setVisible(visible);
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
