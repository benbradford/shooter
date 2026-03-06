import type { IState, IStateEnterProps } from '../../systems/state/IState';
import type { EntityManager } from '../../ecs/EntityManager';
import type { CollisionSystem } from '../../systems/CollisionSystem';
import type { Grid } from '../../systems/grid/Grid';
import type { LevelData } from '../../systems/level/LevelLoader';
import type GameScene from '../GameScene';
import type HudScene from '../HudScene';
import { InputComponent } from '../../ecs/components/input/InputComponent';
import { LuaRuntime } from '../../systems/LuaRuntime';

export type InteractionStateData = {
  scriptContent: string;
};

export class InteractionState implements IState<InteractionStateData> {
  constructor(
    private readonly scene: GameScene,
    private readonly getEntityManager: () => EntityManager,
    private readonly getCollisionSystem: () => CollisionSystem,
    private readonly getGrid: () => Grid,
    private readonly getLevelData: () => LevelData
  ) {}
  
  onEnter(props?: IStateEnterProps<InteractionStateData>): void {
    if (!props?.data) {
      throw new Error('[InteractionState] No script content provided');
    }
    
    const scene = this.scene;
    const entityManager = this.getEntityManager();
    
    scene.isInInteraction = true;
    
    const hudScene = scene.scene.get('HudScene') as HudScene;
    if (hudScene) {
      hudScene.setVisible(false);
    }
    
    const player = entityManager.getFirst('player');
    const input = player?.get(InputComponent);
    if (input) {
      input.setEnabled(false);
    }
    
    this.executeScript(props.data.scriptContent).then(() => {
      (scene as any).stateMachine.enter('inGame');
    }).catch(error => {
      console.error('[Interaction] Script error:', error);
      throw error;
    });
  }
  
  onExit(): void {
    const scene = this.scene;
    const entityManager = this.getEntityManager();
    
    scene.isInInteraction = false;
    
    const hudScene = scene.scene.get('HudScene') as HudScene;
    if (hudScene) {
      hudScene.setVisible(true);
    }
    
    const player = entityManager.getFirst('player');
    const input = player?.get(InputComponent);
    if (input) {
      input.setEnabled(true);
    }
  }
  
  onUpdate(delta: number): void {
    this.getEntityManager().update(delta);
    this.getCollisionSystem().update(this.getEntityManager().getAll());
    this.getGrid().render(this.getEntityManager(), this.getLevelData());
  }
  
  private async executeScript(scriptContent: string): Promise<void> {
    const player = this.getEntityManager().getFirst('player');
    if (!player) {
      throw new Error('[InteractionState] Player not found');
    }
    
    const runtime = new LuaRuntime(this.scene, player);
    await runtime.executeScript(scriptContent);
  }
}
