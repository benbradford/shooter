import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type GameScene from '../../../scenes/GameScene';
import { WorldStateManager } from '../../../systems/WorldStateManager';

export class InteractionTriggerComponent implements Component {
  entity!: Entity;
  private hasTriggered = false;
  
  constructor(
    private readonly scene: GameScene,
    private readonly filename: string
  ) {}
  
  update(_delta: number): void {
    if (this.hasTriggered) return;
    this.hasTriggered = true;
    
    const worldState = WorldStateManager.getInstance();
    worldState.setFlag(`${this.filename}_live`, 'true');
    
    this.loadAndTrigger().catch(error => {
      console.error(`[Interaction] Failed to load ${this.filename}:`, error);
      worldState.setFlag(`${this.filename}_live`, 'false');
      throw error;
    });
  }
  
  private async loadAndTrigger(): Promise<void> {
    const response = await fetch(`/interactions/${this.filename}.lua`);
    if (!response.ok) {
      throw new Error(`Interaction script not found: ${this.filename}.lua (HTTP ${response.status})`);
    }
    const scriptContent = await response.text();
    
    if (scriptContent.startsWith('<!DOCTYPE')) {
      throw new Error(`Got HTML instead of Lua script for ${this.filename}.lua - check file path`);
    }
    
    this.scene.startInteraction(scriptContent, this.filename);
    this.entity.destroy();
  }
}
