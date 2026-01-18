import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { TransformComponent } from './TransformComponent';

export interface HudBarDataSource {
  getRatio(): number;
}

export class HudBarComponent implements Component {
  entity!: Entity;
  private readonly barWidth: number = 64;
  private readonly barHeight: number = 8;
  private background!: Phaser.GameObjects.Rectangle;
  private fill!: Phaser.GameObjects.Rectangle;
  private outline!: Phaser.GameObjects.Rectangle;
  private flashTimer: number = 0;
  private readonly flashInterval: number = 300;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly dataSource: HudBarDataSource,
    private readonly offsetY: number,
    private readonly fillColor: number = 0x0000ff
  ) {}

  init(): void {
    const transform = this.entity.get(TransformComponent)!;
    
    // Background (black)
    this.background = this.scene.add.rectangle(
      transform.x,
      transform.y + this.offsetY,
      this.barWidth,
      this.barHeight,
      0x000000
    );
    
    // Fill (configurable color)
    this.fill = this.scene.add.rectangle(
      transform.x,
      transform.y + this.offsetY,
      this.barWidth,
      this.barHeight,
      this.fillColor
    );
    // Keep default origin (0.5, 0.5) for centered positioning
    
    // Outline (white)
    this.outline = this.scene.add.rectangle(
      transform.x,
      transform.y + this.offsetY,
      this.barWidth,
      this.barHeight
    );
    this.outline.setStrokeStyle(2, 0xffffff);
    this.outline.setFillStyle(0x000000, 0); // Transparent fill
  }

  update(delta: number): void {
    const transform = this.entity.get(TransformComponent)!;
    const ratio = this.dataSource.getRatio();
    
    const barX = transform.x;
    const barY = transform.y + this.offsetY;
    
    // Update positions (centered)
    this.background.setPosition(barX, barY);
    this.outline.setPosition(barX, barY);
    
    // Update fill width and position (left-aligned from left edge of bar)
    const fillWidth = this.barWidth * ratio;
    this.fill.setSize(fillWidth, this.barHeight);
    // Position at left edge: barX - half of total bar width + half of fill width
    const fillX = barX - this.barWidth / 2 + fillWidth / 2;
    this.fill.setPosition(fillX, barY);
    
    // Flash when empty (ratio at 0)
    if (ratio === 0) {
      this.flashTimer += delta;
      if (this.flashTimer >= this.flashInterval) {
        this.flashTimer = 0;
        // Toggle visibility
        const isVisible = this.outline.visible;
        this.outline.setVisible(!isVisible);
        this.background.setVisible(!isVisible);
      }
    } else {
      // Ensure visible when not empty
      this.outline.setVisible(true);
      this.background.setVisible(true);
      this.flashTimer = 0;
    }
  }

  onDestroy(): void {
    this.background.destroy();
    this.fill.destroy();
    this.outline.destroy();
  }
}
