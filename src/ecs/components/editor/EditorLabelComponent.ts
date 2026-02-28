import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { Depth } from '../../../constants/DepthConstants';

export class EditorLabelComponent implements Component {
  entity!: Entity;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, label: string) {
    this.text = scene.add.text(0, 0, label, {
      fontSize: '48px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
      fontStyle: 'bold'
    });
    this.text.setOrigin(0.5, 0.5);
    this.text.setDepth(Depth.editor);
    this.text.setScrollFactor(1);
  }

  update(): void {
    const transform = this.entity.get(TransformComponent);
    if (transform) {
      this.text.setPosition(transform.x, transform.y);
    }
  }

  onDestroy(): void {
    this.text.destroy();
  }
}
