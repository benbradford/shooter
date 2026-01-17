export function preloadPlayerAssets(scene: Phaser.Scene) {
  const dirs = [
    "down",
    "up",
    "left",
    "right",
    "upleft",
    "upright",
    "downleft",
    "downright",
  ];

  dirs.forEach(dir => {
    for (let i = 1; i <= 3; i++) {
      scene.load.image(
        `walk_${dir}_${i}`,
        `assets/player/mc${dir}0${i}.png`
      );
    }

    scene.load.image(
      `idle_${dir}`,
      `assets/player/mc${dir}idle.png`
    );
  });
}
