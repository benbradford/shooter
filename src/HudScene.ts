import Phaser from 'phaser';
import { EntityManager } from './ecs/EntityManager';
import { createJoystickEntity } from './hud/JoystickEntity';
import type { Entity } from './ecs/Entity';

export default class HudScene extends Phaser.Scene {
  private entityManager!: EntityManager;
  private joystickEntity!: Entity;
  private isEditorActive: boolean = false;

  constructor() {
    super({ key: 'HudScene', active: false });
  }

  create(): void {
    this.entityManager = new EntityManager();
    this.joystickEntity = createJoystickEntity(this);
    this.entityManager.add(this.joystickEntity);
  }

  update(_time: number, delta: number): void {
    if (!this.isEditorActive) {
      this.entityManager.update(delta);
    }
  }

  setEditorActive(active: boolean): void {
    this.isEditorActive = active;
  }

  getJoystickEntity(): Entity {
    return this.joystickEntity;
  }
}
