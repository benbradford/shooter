import { LuaFactory } from 'wasmoon';
import type { Entity } from '../ecs/Entity';
import type GameScene from '../scenes/GameScene';
import { CoinCounterComponent } from '../ecs/components/ui/CoinCounterComponent';
import { InteractionComponent } from '../ecs/components/interaction/InteractionComponent';
import { SpeechBoxComponent } from '../ecs/components/ui/SpeechBoxComponent';
import { Entity as EntityClass } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';

type Command = 
  | { type: 'wait'; ms: number }
  | { type: 'say'; name: string; text: string; speed: number; timeout: number; backgroundColor: string; textColor: string }
  | { type: 'moveTo'; col: number; row: number; speed: number }
  | { type: 'look'; direction: string };

export class LuaRuntime {
  private commandQueue: Command[] = [];
  private speechBackgroundColor: string = 'black';
  private speechTextColor: string = 'white';
  
  constructor(
    private readonly scene: GameScene,
    private readonly playerEntity: Entity
  ) {}
  
  async executeScript(scriptContent: string): Promise<void> {
    const factory = new LuaFactory();
    const lua = await factory.createEngine();
    
    try {
      this.commandQueue = [];
      this.speechBackgroundColor = 'black';
      this.speechTextColor = 'white';
      
      lua.global.set('wait', (ms: number) => {
        this.commandQueue.push({ type: 'wait', ms });
      });
      
      lua.global.set('say', (name: string, text: string, speed: number, timeout: number) => {
        this.commandQueue.push({
          type: 'say',
          name,
          text,
          speed,
          timeout,
          backgroundColor: this.speechBackgroundColor,
          textColor: this.speechTextColor
        });
      });
      
      const player = {
        moveTo: (col: number, row: number, speed: number) => {
          this.commandQueue.push({ type: 'moveTo', col, row, speed });
        },
        look: (direction: string) => {
          this.commandQueue.push({ type: 'look', direction });
        }
      };
      lua.global.set('player', player);
      
      const hudScene = this.scene.scene.get('HudScene') as any;
      const joystickEntity = hudScene?.getJoystickEntity?.();
      const coinCounter = joystickEntity?.get(CoinCounterComponent);
      
      if (!coinCounter) {
        throw new Error('[LuaRuntime] CoinCounterComponent not found in HUD');
      }
      
      const coins = {
        get: () => coinCounter.getCount(),
        spend: (amount: number) => coinCounter.removeCoins(amount),
        obtain: (amount: number) => coinCounter.addCoins(amount)
      };
      lua.global.set('coins', coins);
      
      const speech = {
        backgroundColor: (color: string) => {
          this.speechBackgroundColor = color;
        },
        textColor: (color: string) => {
          this.speechTextColor = color;
        }
      };
      lua.global.set('speech', speech);
      
      await lua.doString(scriptContent);
      
      for (const cmd of this.commandQueue) {
        await this.executeCommand(cmd);
      }
      
    } finally {
      lua.global.close();
    }
  }
  
  private async executeCommand(cmd: Command): Promise<void> {
    // Tag player for all commands (keeps state machine from interfering)
    this.playerEntity.tags.add('interaction_active');
    
    try {
      if (cmd.type === 'wait') {
        await new Promise(resolve => setTimeout(resolve, cmd.ms));
      } else if (cmd.type === 'say') {
        const speechEntity = new EntityClass('speech_box');
        speechEntity.tags.add('interaction_active');
        
        speechEntity.add(new TransformComponent(0, 0, 0, 1));
        
        const speechBox = speechEntity.add(new SpeechBoxComponent(
          this.scene,
          cmd.backgroundColor,
          cmd.textColor
        ));
        
        this.scene.entityManager.add(speechEntity);
        
        await speechBox.show(cmd.name, cmd.text, cmd.speed, cmd.timeout);
        
        speechEntity.destroy();
      } else if (cmd.type === 'moveTo') {
        const interactionComp = this.playerEntity.get(InteractionComponent);
        if (!interactionComp) {
          throw new Error('[LuaRuntime] Player missing InteractionComponent');
        }
        await interactionComp.moveTo(cmd.col, cmd.row, cmd.speed);
      } else if (cmd.type === 'look') {
        const interactionComp = this.playerEntity.get(InteractionComponent);
        if (!interactionComp) {
          throw new Error('[LuaRuntime] Player missing InteractionComponent');
        }
        await interactionComp.look(cmd.direction);
      }
    } finally {
      // Remove tag after command completes (before next command starts)
      this.playerEntity.tags.delete('interaction_active');
    }
  }
}
