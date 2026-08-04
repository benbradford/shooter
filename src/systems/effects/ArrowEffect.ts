import type GameScene from '../../scenes/GameScene';
import { registerEffect, type EffectArgs } from './EffectRegistry';
import { Depth } from '../../constants/DepthConstants';

const CELL_SIZE_PX = 64;
const HALF_CELL_PX = CELL_SIZE_PX / 2;

type CellArg = { col: number; row: number };

function parseCellArg(arg: unknown): CellArg {
  const obj = arg as Record<string, number>;
  return { col: obj.col ?? obj[1] ?? 0, row: obj.row ?? obj[2] ?? 0 };
}

function arrowHandler(scene: GameScene, args: EffectArgs): Promise<void> {
  const startCell = parseCellArg(args.startCell ?? args.start_cell);
  const endCell = parseCellArg(args.endCell ?? args.end_cell);
  const speed = (args.speed as number) ?? 300;

  const grid = scene.getGrid();
  const startWorld = grid.cellToWorld(startCell.col, startCell.row);
  const endWorld = grid.cellToWorld(endCell.col, endCell.row);
  const startX = startWorld.x + HALF_CELL_PX;
  const startY = startWorld.y + HALF_CELL_PX;
  const endX = endWorld.x + HALF_CELL_PX;
  const endY = endWorld.y + HALF_CELL_PX;

  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const durationMs = (dist / speed) * 1000;
  const angle = Math.atan2(dy, dx);

  const arrow = scene.add.image(startX, startY, 'silas_arrow');
  arrow.setDepth(Depth.projectile);
  arrow.setScale(0.033);
  arrow.setRotation(angle + Math.PI / 2);

  const onEnd = args.onEnd as (() => void) | undefined;

  return new Promise<void>(resolve => {
    scene.tweens.add({
      targets: arrow,
      x: endX,
      y: endY,
      duration: durationMs,
      ease: 'Linear',
      onComplete: () => {
        arrow.destroy();
        if (onEnd) {
          onEnd();
          // Execute any commands the callback pushed immediately
          const runtime = (scene as unknown as { _activeLuaRuntime?: { processCallbackCommands: () => Promise<void> } })._activeLuaRuntime;
          if (runtime) void runtime.processCallbackCommands();
        }
        resolve();
      },
    });
  });
}

registerEffect('arrow', arrowHandler);
