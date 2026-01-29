import type Phaser from 'phaser';

const DIRECTIONS = ['south', 'south_east', 'east', 'north_east', 'north', 'north_west', 'west', 'south_west'];

export function createThrowerAnimations(scene: Phaser.Scene): void {
  DIRECTIONS.forEach((dir, index) => {
    scene.anims.create({
      key: `thrower_idle_${dir}`,
      frames: [{ key: 'thrower', frame: index * 7 }],
      frameRate: 1,
      repeat: 0
    });

    scene.anims.create({
      key: `thrower_walk_${dir}`,
      frames: scene.anims.generateFrameNumbers('thrower', { start: 56 + index * 7, end: 56 + index * 7 + 3 }),
      frameRate: 10,
      repeat: -1
    });

    scene.anims.create({
      key: `thrower_throw_${dir}`,
      frames: scene.anims.generateFrameNumbers('thrower', { start: 112 + index * 7, end: 112 + index * 7 + 6 }),
      frameRate: 12,
      repeat: 0
    });

    scene.anims.create({
      key: `thrower_death_${dir}`,
      frames: scene.anims.generateFrameNumbers('thrower', { start: 168 + index * 7, end: 168 + index * 7 + 6 }),
      frameRate: 12,
      repeat: 0
    });
  });
}
