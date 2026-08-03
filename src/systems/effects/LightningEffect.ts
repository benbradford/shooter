import type GameScene from '../../scenes/GameScene';
import { registerEffect, type EffectArgs } from './EffectRegistry';
import { Depth } from '../../constants/DepthConstants';

const CELL_SIZE_PX = 64;
const HALF_CELL_PX = CELL_SIZE_PX / 2;
const SEGMENT_LENGTH_PX = 12;
const LATERAL_JITTER_PX = 14;
const BOLT_THICKNESS_PX = 3;
const GLOW_THICKNESS_PX = 8;
const GLOW_ALPHA = 0.4;
const BOLT_COLOR = 0xffffff;
const GLOW_COLOR = 0x4488ff;
const FLICKER_INTERVAL_MS = 60;
const BRANCH_CHANCE = 0.2;
const BRANCH_LENGTH_SEGMENTS = 3;
const BRANCH_THICKNESS_PX = 1.5;
const FLASH_ALPHA = 0.15;
const FLASH_FADE_MS = 200;

type CellArg = { col: number; row: number };

function parseCellArg(arg: unknown): CellArg {
  const obj = arg as Record<string, number>;
  return { col: obj.col ?? obj[1] ?? 0, row: obj.row ?? obj[2] ?? 0 };
}

function generateBolt(
  startX: number, startY: number, endX: number, endY: number
): { x: number; y: number }[] {
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const segmentCount = Math.max(2, Math.round(dist / SEGMENT_LENGTH_PX));

  const points: { x: number; y: number }[] = [{ x: startX, y: startY }];
  const perpX = -dy / dist;
  const perpY = dx / dist;

  for (let i = 1; i < segmentCount; i++) {
    const t = i / segmentCount;
    const baseX = startX + dx * t;
    const baseY = startY + dy * t;
    const jitter = (Math.random() - 0.5) * 2 * LATERAL_JITTER_PX;
    points.push({
      x: baseX + perpX * jitter,
      y: baseY + perpY * jitter,
    });
  }

  points.push({ x: endX, y: endY });
  return points;
}

function drawBolt(
  graphics: Phaser.GameObjects.Graphics,
  points: { x: number; y: number }[],
  thickness: number,
  color: number,
  alpha: number
): void {
  graphics.lineStyle(thickness, color, alpha);
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    graphics.lineTo(points[i].x, points[i].y);
  }
  graphics.strokePath();
}

function drawBranches(
  graphics: Phaser.GameObjects.Graphics,
  mainPoints: { x: number; y: number }[]
): void {
  for (let i = 1; i < mainPoints.length - 1; i++) {
    if (Math.random() < BRANCH_CHANCE) {
      const origin = mainPoints[i];
      const branchPoints: { x: number; y: number }[] = [origin];
      const angle = Math.random() * Math.PI * 2;
      let bx = origin.x;
      let by = origin.y;
      for (let j = 0; j < BRANCH_LENGTH_SEGMENTS; j++) {
        const jitteredAngle = angle + (Math.random() - 0.5) * 0.8;
        bx += Math.cos(jitteredAngle) * SEGMENT_LENGTH_PX * 0.7;
        by += Math.sin(jitteredAngle) * SEGMENT_LENGTH_PX * 0.7;
        branchPoints.push({ x: bx, y: by });
      }
      drawBolt(graphics, branchPoints, BRANCH_THICKNESS_PX, BOLT_COLOR, 0.6);
    }
  }
}

function lightningHandler(scene: GameScene, args: EffectArgs): Promise<void> {
  const startCell = parseCellArg(args.startCell ?? args.start_cell);
  const endCell = parseCellArg(args.endCell ?? args.end_cell);
  const durationMs = (args.duration as number) ?? 500;

  const grid = scene.getGrid();
  const startWorld = grid.cellToWorld(startCell.col, startCell.row);
  const endWorld = grid.cellToWorld(endCell.col, endCell.row);
  const startX = startWorld.x + HALF_CELL_PX;
  const startY = startWorld.y + HALF_CELL_PX;
  const endX = endWorld.x + HALF_CELL_PX;
  const endY = endWorld.y + HALF_CELL_PX;

  const graphics = scene.add.graphics();
  graphics.setDepth(Depth.particle);

  // Flash overlay for impact feel
  const cam = scene.cameras.main;
  const flash = scene.add.rectangle(
    cam.scrollX + cam.width / 2,
    cam.scrollY + cam.height / 2,
    cam.width, cam.height,
    GLOW_COLOR, FLASH_ALPHA
  );
  flash.setScrollFactor(0);
  flash.setDepth(Depth.particle);
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: FLASH_FADE_MS,
    onComplete: () => flash.destroy(),
  });

  let elapsed = 0;
  let flickerAccumulator = 0;

  const redraw = () => {
    graphics.clear();
    const mainPoints = generateBolt(startX, startY, endX, endY);
    // Glow layer (wide, blue, semi-transparent)
    drawBolt(graphics, mainPoints, GLOW_THICKNESS_PX, GLOW_COLOR, GLOW_ALPHA);
    // Core bolt (thin, white, bright)
    drawBolt(graphics, mainPoints, BOLT_THICKNESS_PX, BOLT_COLOR, 1);
    // Branches
    drawBranches(graphics, mainPoints);
  };

  redraw();

  return new Promise<void>(resolve => {
    const timerEvent = scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        elapsed += 16;
        flickerAccumulator += 16;

        if (elapsed >= durationMs) {
          timerEvent.destroy();
          graphics.destroy();
          resolve();
          return;
        }

        if (flickerAccumulator >= FLICKER_INTERVAL_MS) {
          flickerAccumulator = 0;
          redraw();
        }
      },
    });
  });
}

registerEffect('lightning', lightningHandler);
