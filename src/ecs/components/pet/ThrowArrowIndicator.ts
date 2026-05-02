import Phaser from 'phaser';

const ARROW_LENGTH_PX = 36;
const ARROW_COLOR_START = 0x66ccff;
const ARROW_COLOR_END = 0x2266aa;
const ARROW_LINE_WIDTH_PX = 2.5;
const ARROW_DEPTH = 2000;
const ARROW_OFFSET_FROM_PLAYER_PX = 30;
const ARROW_HEAD_LENGTH_PX = 8;
const ARROW_HEAD_ANGLE_RAD = Math.PI / 6;
const ARROW_LINE_ALPHA = 0.8;
const ARROW_HEAD_ALPHA = 0.9;

export class ThrowArrowIndicator {
  private graphics: Phaser.GameObjects.Graphics | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  show(): void {
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics();
      this.graphics.setDepth(ARROW_DEPTH);
    }
  }

  draw(playerX: number, playerY: number, dirX: number, dirY: number): void {
    if (!this.graphics) return;
    this.graphics.clear();

    const startX = playerX + dirX * ARROW_OFFSET_FROM_PLAYER_PX;
    const startY = playerY + dirY * ARROW_OFFSET_FROM_PLAYER_PX;
    const endX = startX + dirX * ARROW_LENGTH_PX;
    const endY = startY + dirY * ARROW_LENGTH_PX;

    this.graphics.lineStyle(ARROW_LINE_WIDTH_PX, ARROW_COLOR_START, ARROW_LINE_ALPHA);
    this.graphics.beginPath();
    this.graphics.moveTo(startX, startY);
    this.graphics.lineTo(endX, endY);
    this.graphics.strokePath();

    const angle = Math.atan2(dirY, dirX);
    this.graphics.lineStyle(ARROW_LINE_WIDTH_PX, ARROW_COLOR_END, ARROW_HEAD_ALPHA);
    this.graphics.beginPath();
    this.graphics.moveTo(endX, endY);
    this.graphics.lineTo(
      endX - ARROW_HEAD_LENGTH_PX * Math.cos(angle - ARROW_HEAD_ANGLE_RAD),
      endY - ARROW_HEAD_LENGTH_PX * Math.sin(angle - ARROW_HEAD_ANGLE_RAD)
    );
    this.graphics.moveTo(endX, endY);
    this.graphics.lineTo(
      endX - ARROW_HEAD_LENGTH_PX * Math.cos(angle + ARROW_HEAD_ANGLE_RAD),
      endY - ARROW_HEAD_LENGTH_PX * Math.sin(angle + ARROW_HEAD_ANGLE_RAD)
    );
    this.graphics.strokePath();
  }

  destroy(): void {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
