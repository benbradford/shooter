import Phaser from 'phaser';
import { EntityManager } from '../ecs/EntityManager';
import { createJoystickEntity } from '../ecs/entities/hud/JoystickEntity';
import type { Entity } from '../ecs/Entity';
import { JoystickVisualsComponent } from '../ecs/components/ui/JoystickVisualsComponent';
import { AttackButtonComponent } from '../ecs/components/input/AttackButtonComponent';
import { SlideButtonComponent } from '../ecs/components/input/SlideButtonComponent';
import { HudBarComponent } from '../ecs/components/ui/HudBarComponent';

export default class HudScene extends Phaser.Scene {
  private entityManager!: EntityManager;
  private joystickEntity!: Entity;
  private isEditorActive: boolean = false;
  private isHudVisible: boolean = true;

  constructor() {
    super({ key: 'HudScene', active: false });
  }

  create(): void {
    this.entityManager = new EntityManager();
    this.joystickEntity = createJoystickEntity(this);
    this.entityManager.add(this.joystickEntity);

    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.V).on('down', () => {
      this.toggleHud();
    });
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

  toggleHud(): void {
    this.isHudVisible = !this.isHudVisible;
    
    const joystickVisuals = this.joystickEntity.get(JoystickVisualsComponent);
    if (joystickVisuals) {
      joystickVisuals.setVisible(this.isHudVisible);
    }

    const attackButton = this.joystickEntity.get(AttackButtonComponent);
    if (attackButton) {
      attackButton.setVisible(this.isHudVisible);
    }

    const gameScene = this.scene.get('game');
    if (gameScene && 'entityManager' in gameScene) {
      const player = (gameScene as { entityManager: EntityManager }).entityManager.getFirst('player');
      if (player) {
        const hudBars = player.get(HudBarComponent);
        if (hudBars) {
          hudBars.setVisible(this.isHudVisible);
        }

        const slideButton = player.get(SlideButtonComponent);
        if (slideButton) {
          slideButton.setVisible(this.isHudVisible);
        }
      }
    }
  }
}
