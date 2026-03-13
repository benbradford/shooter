import Phaser from 'phaser';
import { EntityManager } from '../ecs/EntityManager';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';
import { createJoystickEntity } from '../ecs/entities/hud/JoystickEntity';
import type { Entity } from '../ecs/Entity';
import { JoystickVisualsComponent } from '../ecs/components/ui/JoystickVisualsComponent';
import { AttackButtonComponent } from '../ecs/components/input/AttackButtonComponent';
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
    
    const gameScene = this.scene.get('game');
    const eventManager = (gameScene as { eventManager?: EventManagerSystem }).eventManager;
    
    if (!eventManager) {
      throw new Error('[HudScene] EventManager not found in GameScene');
    }
    
    this.joystickEntity = createJoystickEntity(this, eventManager);
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
    this.setVisible(this.isHudVisible);
  }

  setVisible(visible: boolean): void {
    this.isHudVisible = visible;
    
    const joystickVisuals = this.joystickEntity.get(JoystickVisualsComponent);
    if (joystickVisuals) {
      joystickVisuals.setVisible(visible);
    }

    const attackButton = this.joystickEntity.get(AttackButtonComponent);
    if (attackButton) {
      attackButton.setVisible(visible);
    }
    
    // Coin counter always visible (don't hide during interactions)
    // It will show/fade based on coin changes

    const gameScene = this.scene.get('game');
    if (gameScene && 'entityManager' in gameScene) {
      const player = (gameScene as { entityManager: EntityManager }).entityManager.getFirst('player');
      if (player) {
        const hudBars = player.get(HudBarComponent);
        if (hudBars) {
          hudBars.setVisible(visible);
        }
      }
    }
  }
}
