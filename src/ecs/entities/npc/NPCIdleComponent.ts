import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { TransformComponent } from '../../components/core/TransformComponent';
import { createNPCAnimations, getNPCAnimKey } from './NPCAnimations';
import { type Direction, dirFromDelta } from '../../../constants/Direction';

export type NPCTransformOverride = {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
};

export class NPCIdleComponent implements Component {
  entity!: Entity;
  private hasInitialized = false;
  private frameCount = 0;
  private _facePlayer: boolean;
  private paused = false;
  transformOverride: NPCTransformOverride;

  constructor(
    private direction: Direction,
    private readonly spritesheet: string,
    facePlayer = false,
    transformOverride?: Partial<NPCTransformOverride>
  ) {
    this._facePlayer = facePlayer;
    this.transformOverride = {
      scaleX: transformOverride?.scaleX ?? 1,
      scaleY: transformOverride?.scaleY ?? 1,
      offsetX: transformOverride?.offsetX ?? 0,
      offsetY: transformOverride?.offsetY ?? 0,
    };
  }

  update(_delta: number): void {
    const sprite = this.entity.require(SpriteComponent).sprite;
    const transform = this.entity.require(TransformComponent);

    sprite.setScale(this.transformOverride.scaleX, this.transformOverride.scaleY);
    sprite.x += this.transformOverride.offsetX;
    sprite.y += this.transformOverride.offsetY;
    
    const gameScene = sprite.scene.scene.get('game') as { entityManager?: { getFirst(type: string): Entity | undefined } } | undefined;
    if (gameScene?.entityManager) {
      const playerEntity = gameScene.entityManager.getFirst('player');
      if (playerEntity) {
        const playerTransform = playerEntity.require(TransformComponent);
        sprite.setDepth(transform.y > playerTransform.y ? 1 : -1);

        if (this._facePlayer && this.hasInitialized) {
          const dx = playerTransform.x - transform.x;
          const dy = playerTransform.y - transform.y;
          const newDir = dirFromDelta(dx, dy);
          if (newDir !== this.direction) {
            this.setDirection(newDir);
          }
        }
      }
    }
    
    if (this.hasInitialized) return;
    this.hasInitialized = true;

    const scene = sprite.scene;
    createNPCAnimations(scene, this.spritesheet);

    const texture = scene.textures.get(this.spritesheet);
    this.frameCount = texture.frameTotal - 1;

    const animKey = getNPCAnimKey(this.spritesheet, this.direction, this.frameCount);
    if (scene.anims.exists(animKey)) {
      sprite.play(animKey);
    }
  }

  setDirection(direction: Direction): void {
    this.direction = direction;
    if (this.paused) return;
    const sprite = this.entity.require(SpriteComponent).sprite;
    const animKey = getNPCAnimKey(this.spritesheet, this.direction, this.frameCount);
    if (sprite.scene.anims.exists(animKey)) {
      sprite.play(animKey);
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) {
      this.setDirection(this.direction);
    }
  }

  getDirection(): Direction {
    return this.direction;
  }

  get facePlayer(): boolean {
    return this._facePlayer;
  }

  set facePlayer(value: boolean) {
    this._facePlayer = value;
  }

  getSpritesheet(): string {
    return this.spritesheet;
  }
}
