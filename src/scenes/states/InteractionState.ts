import type { IState, IStateEnterProps } from '../../systems/state/IState';
import type { EntityManager } from '../../ecs/EntityManager';
import type { CollisionSystem } from '../../systems/CollisionSystem';
import type { Grid } from '../../systems/grid/Grid';
import type { LevelData } from '../../systems/level/LevelLoader';
import type GameScene from '../GameScene';
import type HudScene from '../HudScene';
import { InputComponent } from '../../ecs/components/input/InputComponent';
import { LuaRuntime } from '../../systems/LuaRuntime';
import { WorldStateManager } from '../../systems/WorldStateManager';

export type InteractionStateData = {
  scriptContent: string;
  filename?: string;
  npcId?: string;
};

export class InteractionState implements IState<InteractionStateData> {
  private currentFilename?: string;
  private currentNpcId?: string;
  
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
    
    this.currentFilename = props.data.filename;
    this.currentNpcId = props.data.npcId;
    
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
    
    this.executeScript(props.data.scriptContent, this.currentNpcId).then(() => {
      (scene as unknown as { stateMachine: { enter: (key: string) => void } }).stateMachine.enter('inGame');
    }).catch(error => {
      console.error('[Interaction] Script error:', error);
      throw error;
    });
  }
  
  onExit(): void {
    const scene = this.scene;
    const entityManager = this.getEntityManager();
    
    scene.isInInteraction = false;
    
    // Clear interaction live flag
    if (this.currentFilename) {
      const worldState = WorldStateManager.getInstance();
      worldState.setFlag(`${this.currentFilename}_live`, 'false');
      this.currentFilename = undefined;
    }
    this.currentNpcId = undefined;
    
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
  
  private async executeScript(scriptContent: string, npcId?: string): Promise<void> {
    const player = this.getEntityManager().getFirst('player');
    if (!player) {
      throw new Error('[InteractionState] Player not found');
    }
    
    const runtime = new LuaRuntime(this.scene, player);
    await runtime.executeScript(scriptContent, npcId);
  }
}
