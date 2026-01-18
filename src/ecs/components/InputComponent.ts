import Phaser from 'phaser';
import type { Component } from '../ecs/Component';
import type { Entity } from '../ecs/Entity';

export class InputComponent implements Component {
  entity!: Entity;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: any;

  constructor(scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D');
  }

  update(delta: number): void {}

  onDestroy(): void {}

  getInputDelta(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;
    return { dx, dy };
  }
}
