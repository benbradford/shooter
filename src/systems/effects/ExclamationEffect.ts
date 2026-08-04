import type GameScene from '../../scenes/GameScene';
import { registerEffect, type EffectArgs } from './EffectRegistry';
import { Depth } from '../../constants/DepthConstants';

const CELL_SIZE_PX = 64;
const HALF_CELL_PX = CELL_SIZE_PX / 2;
const Y_OFFSET_PX = -20;
const DURATION_MS = 800;
const SHAKE_DISTANCE_PX = 3;
const SHAKE_SPEED_MS = 50;
const ROTATION_DEGREES = 12;
const ROTATION_SPEED_MS = 120;
const SCALE = 0.4;

function exclamationHandler(scene: GameScene, args: EffectArgs): Promise<void> {
  const col = (args.col as number) ?? 0;
  const row = (args.row as number) ?? 0;
  const durationMs = (args.duration as number) ?? DURATION_MS;
  const offsetY = (args.offsetY as number) ?? Y_OFFSET_PX;

  const grid = scene.getGrid();
  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + HALF_CELL_PX;
  const y = worldPos.y + HALF_CELL_PX + offsetY;

  const img = scene.add.image(x, y, 'exclamation');
  img.setDepth(Depth.particle);
  img.setScale(0);

  // Pop in
  scene.tweens.add({
    targets: img,
    scale: SCALE,
    duration: 100,
    ease: 'Back.easeOut',
  });

  // Shake side to side
  scene.tweens.add({
    targets: img,
    x: { from: x - SHAKE_DISTANCE_PX, to: x + SHAKE_DISTANCE_PX },
    duration: SHAKE_SPEED_MS,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Rotate left/right
  const rotRad = (ROTATION_DEGREES * Math.PI) / 180;
  scene.tweens.add({
    targets: img,
    rotation: { from: -rotRad, to: rotRad },
    duration: ROTATION_SPEED_MS,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  return new Promise<void>(resolve => {
    scene.time.delayedCall(durationMs, () => {
      scene.tweens.add({
        targets: img,
        scale: 0,
        alpha: 0,
        duration: 150,
        ease: 'Power2',
        onComplete: () => {
          img.destroy();
          resolve();
        },
      });
    });
  });
}

registerEffect('exclamation', exclamationHandler);
