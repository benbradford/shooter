The sheet is located at public/assets/cell_renderables/water_ripple_spritesheet.md

Total size: 1024 × 1024 px

Layout: 2 × 2 grid

Frame size: 512 × 512 px each

Padding: none

Alpha: background is already transparent

📐 Frame Coordinates (Top-Left Origin)

Phaser uses top-left origin (0,0).

Frame 0 (Top-Left)
x: 0
y: 0
width: 512
height: 512
Frame 1 (Top-Right)
x: 512
y: 0
width: 512
height: 512
Frame 2 (Bottom-Left)
x: 0
y: 512
width: 512
height: 512
Frame 3 (Bottom-Right)
x: 512
y: 512
width: 512
height: 512
🎮 Phaser Implementation (Clean Method)

Instead of manually slicing, just load it as a spritesheet:

this.load.spritesheet('ripple', 'assets/ripple.png', {
  frameWidth: 512,
  frameHeight: 512
});

Then create animation:

this.anims.create({
  key: 'ripple_anim',
  frames: this.anims.generateFrameNumbers('ripple', { start: 0, end: 3 }),
  frameRate: 12,
  repeat: 0
});

Spawn ripple:

const ripple = this.add.sprite(player.x, player.y, 'ripple');
ripple.setScale(0.25); // important — 512 is large
ripple.play('ripple_anim');

ripple.on('animationcomplete', () => {
  ripple.destroy();
});