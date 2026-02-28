import { Depth } from '../../../constants/DepthConstants';

export type SmokeBurstConfig = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  cellSize: number;
  burstCount: number;
  intervalMs: number;
  texture?: string;
  spreadRadius?: number;
}

export function createSmokeBurst(config: SmokeBurstConfig): void {
  const { scene, x, y, cellSize, burstCount, intervalMs, texture = 'smoke', spreadRadius = cellSize * 0.8 } = config;
  
  for (let i = 0; i < burstCount; i++) {
    scene.time.delayedCall(i * intervalMs, () => {
      const offsetX = (Math.random() - 0.5) * spreadRadius;
      const offsetY = (Math.random() - 0.5) * spreadRadius;

      const emitter = scene.add.particles(x + offsetX, y + offsetY, texture, {
        speed: { min: 40, max: 80 },
        angle: { min: 0, max: 360 },
        scale: { start: 3, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 600,
        frequency: 10,
        tint: [0x000000, 0xf5f5dc],
        blendMode: 'NORMAL'
      });

      emitter.setDepth(Depth.particle);
      scene.time.delayedCall(150, () => emitter.stop());
      scene.time.delayedCall(550, () => emitter.destroy());
    });
  }
}
