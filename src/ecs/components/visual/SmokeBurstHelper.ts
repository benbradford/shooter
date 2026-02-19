export function createSmokeBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  cellSize: number,
  burstCount: number,
  intervalMs: number,
  texture: string = 'smoke',
  spreadRadius: number = cellSize * 0.8
): void {
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

      emitter.setDepth(1000);
      scene.time.delayedCall(150, () => emitter.stop());
      scene.time.delayedCall(550, () => emitter.destroy());
    });
  }
}
