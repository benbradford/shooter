import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { createNPCAnimations, getNPCAnimKey } from './NPCAnimations';
import type { Direction } from '../../../constants/Direction';

export class NPCIdleComponent implements Component {
  entity!: Entity;
  private hasInitialized = false;
  private frameCount = 0;

  constructor(
    private direction: Direction,
    private readonly spritesheet: string
  ) {}

  update(_delta: number): void {
    if (this.hasInitialized) return;
    this.hasInitialized = true;

    const scene = this.entity.require(SpriteComponent).sprite.scene;
    createNPCAnimations(scene, this.spritesheet);

    const texture = scene.textures.get(this.spritesheet);
    this.frameCount = texture.frameTotal - 1;

    const animKey = getNPCAnimKey(this.spritesheet, this.direction, this.frameCount);
    const sprite = this.entity.require(SpriteComponent).sprite;
    if (scene.anims.exists(animKey)) {
      sprite.play(animKey);
    }
  }

  setDirection(direction: Direction): void {
    this.direction = direction;
    const sprite = this.entity.require(SpriteComponent).sprite;
    const animKey = getNPCAnimKey(this.spritesheet, this.direction, this.frameCount);
    if (sprite.scene.anims.exists(animKey)) {
      sprite.play(animKey);
    }
  }

  getDirection(): Direction {
    return this.direction;
  }

  getSpritesheet(): string {
    return this.spritesheet;
  }
}
