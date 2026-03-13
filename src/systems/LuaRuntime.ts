import { LuaFactory } from 'wasmoon';
import { Entity } from '../ecs/Entity';
import type GameScene from '../scenes/GameScene';
import { CoinCounterComponent } from '../ecs/components/ui/CoinCounterComponent';
import { InteractionComponent } from '../ecs/components/interaction/InteractionComponent';
import { SpeechBoxComponent } from '../ecs/components/ui/SpeechBoxComponent';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { WorldStateManager } from './WorldStateManager';
import { NPCIdleComponent } from '../ecs/entities/npc/NPCIdleComponent';
import { Direction, dirFromDelta } from '../constants/Direction';

const DIRECTION_MAP: Record<string, Direction> = {
  'down': Direction.Down,
  'up': Direction.Up,
  'left': Direction.Left,
  'right': Direction.Right,
  'up_left': Direction.UpLeft,
  'up_right': Direction.UpRight,
  'down_left': Direction.DownLeft,
  'down_right': Direction.DownRight,
};

const DIRECTION_TO_STRING: Record<Direction, string> = Object.fromEntries(
  Object.entries(DIRECTION_MAP).map(([k, v]) => [v, k])
) as Record<Direction, string>;

type Command = 
  | { type: 'wait'; ms: number }
  | { type: 'say'; name: string; text: string; speed: number; timeout: number; backgroundColor: string; textColor: string }
  | { type: 'moveTo'; col: number; row: number; speed: number }
  | { type: 'look'; direction: string }
  | { type: 'npcLook'; npcId: string; direction: Direction }
  | { type: 'spendCoins'; amount: number }
  | { type: 'obtainCoins'; amount: number }
  | { type: 'fadeOut'; durationMs: number }
  | { type: 'fadeIn'; durationMs: number };

export class LuaRuntime {
  private commandQueue: Command[] = [];
  private speechBackgroundColor: string = 'black';
  private speechTextColor: string = 'white';
  private fadeRectangle: Phaser.GameObjects.Rectangle | null = null;
  
  constructor(
    private readonly scene: GameScene,
    private readonly playerEntity: Entity
  ) {}
  
  async executeScript(scriptContent: string, npcId?: string): Promise<void> {
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
      
      lua.global.set('calculateDirection', (fromCol: number, fromRow: number, toCol: number, toRow: number): string => {
        const dx = toCol - fromCol;
        const dy = toRow - fromRow;
        return DIRECTION_TO_STRING[dirFromDelta(dx, dy)] ?? 'down';
      });
      
      if (npcId) {
        const npc = {
          look: (direction: string) => {
            const dir = DIRECTION_MAP[direction];
            if (dir === undefined) {
              throw new Error(`[LuaRuntime] Invalid direction: ${direction}`);
            }
            this.commandQueue.push({ type: 'npcLook', npcId, direction: dir });
          }
        };
        lua.global.set('npc', npc);
      }
      
      const hudScene = this.scene.scene.get('HudScene');
      const joystickEntity = (hudScene as { getJoystickEntity?: () => Entity })?.getJoystickEntity?.();
      const coinCounter = joystickEntity?.get(CoinCounterComponent);
      
      if (!coinCounter) {
        throw new Error('[LuaRuntime] CoinCounterComponent not found in HUD');
      }
      
      const coins = {
        get: () => coinCounter.getCount(),
        spend: (amount: number) => {
          this.commandQueue.push({ type: 'spendCoins', amount });
        },
        obtain: (amount: number) => {
          this.commandQueue.push({ type: 'obtainCoins', amount });
        }
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
      
      lua.global.set('fadeOut', (durationMs: number) => {
        this.commandQueue.push({ type: 'fadeOut', durationMs });
      });
      
      lua.global.set('fadeIn', (durationMs: number) => {
        this.commandQueue.push({ type: 'fadeIn', durationMs });
      });
      
      lua.global.set('setFlag', (name: string, value: string | number) => {
        const worldState = WorldStateManager.getInstance();
        worldState.setFlag(name, value);
      });
      
      lua.global.set('isFlagCondition', (name: string, condition: string, value: string | number): boolean => {
        const worldState = WorldStateManager.getInstance();
        const validConditions = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte'];
        if (!validConditions.includes(condition)) {
          console.error(`[LuaRuntime] Invalid condition: ${condition}`);
          return false;
        }
        return worldState.isFlagCondition(name, condition as 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte', value);
      });
      
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
        const speechEntity = new Entity('speech_box');
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
        interactionComp.look(cmd.direction);
      } else if (cmd.type === 'npcLook') {
        const npcEntity = this.scene.entityManager.getAll().find(e => e.id === cmd.npcId);
        const idle = npcEntity?.get(NPCIdleComponent);
        if (idle) {
          idle.setDirection(cmd.direction);
        }
      } else if (cmd.type === 'spendCoins') {
        const hudScene = this.scene.scene.get('HudScene');
        const joystickEntity = (hudScene as { getJoystickEntity?: () => Entity })?.getJoystickEntity?.();
        const coinCounter = joystickEntity?.get(CoinCounterComponent);
        if (coinCounter) {
          await coinCounter.removeCoinsAnimated(cmd.amount);
        }
      } else if (cmd.type === 'obtainCoins') {
        const hudScene = this.scene.scene.get('HudScene');
        const joystickEntity = (hudScene as { getJoystickEntity?: () => Entity })?.getJoystickEntity?.();
        const coinCounter = joystickEntity?.get(CoinCounterComponent);
        if (coinCounter) {
          await coinCounter.addCoinsAnimated(cmd.amount);
        }
      } else if (cmd.type === 'fadeOut') {
        if (!this.fadeRectangle) {
          const width = this.scene.cameras.main.width;
          const height = this.scene.cameras.main.height;
          this.fadeRectangle = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000);
          this.fadeRectangle.setScrollFactor(0);
          this.fadeRectangle.setDepth(100000);
          this.fadeRectangle.setAlpha(0);
        }
        
        await new Promise<void>(resolve => {
          this.scene.tweens.add({
            targets: this.fadeRectangle,
            alpha: 1,
            duration: cmd.durationMs,
            onComplete: () => resolve()
          });
        });
      } else if (cmd.type === 'fadeIn') {
        if (this.fadeRectangle) {
          await new Promise<void>(resolve => {
            this.scene.tweens.add({
              targets: this.fadeRectangle,
              alpha: 0,
              duration: cmd.durationMs,
              onComplete: () => {
                this.fadeRectangle?.destroy();
                this.fadeRectangle = null;
                resolve();
              }
            });
          });
        }
      }
    } finally {
      // Remove tag after command completes (before next command starts)
      this.playerEntity.tags.delete('interaction_active');
    }
  }
}
