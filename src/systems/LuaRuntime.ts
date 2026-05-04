import { LuaFactory } from 'wasmoon';
import { Entity } from '../ecs/Entity';
import type GameScene from '../scenes/GameScene';
import { CoinCounterComponent } from '../ecs/components/ui/CoinCounterComponent';
import { InteractionComponent } from '../ecs/components/interaction/InteractionComponent';
import { SpeechBoxComponent } from '../ecs/components/ui/SpeechBoxComponent';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { AnimationComponent } from '../ecs/components/core/AnimationComponent';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { WalkComponent } from '../ecs/components/movement/WalkComponent';
import { WorldStateManager } from './WorldStateManager';
import { AttackComboComponent } from '../ecs/components/combat/AttackComboComponent';
import { NPCIdleComponent } from '../ecs/entities/npc/NPCIdleComponent';
import { NPCInteractionComponent } from '../ecs/entities/npc/NPCInteractionComponent';
import { Direction, dirFromDelta } from '../constants/Direction';
import { Depth } from '../constants/DepthConstants';

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
  | { type: 'fadeIn'; durationMs: number }
  | { type: 'npcPlayAnim'; npcId: string; animKey: string; repeatType: string }
  | { type: 'teleportTo'; col: number; row: number }
  | { type: 'punch'; direction: Direction }
  | { type: 'playerPlayAnim'; animKey: string; repeatType: string; startFrame?: number; endFrame?: number }
  | { type: 'raiseEvent'; eventName: string }
  | { type: 'showSpecialItem'; itemType: string }
  | { type: 'hideSpecialItem' };

const SPECIAL_ITEM_SCALE = 2;
const SPECIAL_ITEM_Y_PERCENT = 0.18;
const SPECIAL_ITEM_Y_OFFSET_PX = 100;
const SPECIAL_ITEM_PULSE_AMPLITUDE = 0.07;
const SPECIAL_ITEM_PULSE_FREQUENCY_HZ = 1.3;
const SPECIAL_ITEM_TWEEN_IN_DURATION_MS = 400;
const SPECIAL_ITEM_TWEEN_OUT_DURATION_MS = 300;
const SPECIAL_ITEM_AUTO_HIDE_DURATION_MS = 300;
const SPECIAL_ITEM_SPARKLE_FREQUENCY_MS = 80;
const SPECIAL_ITEM_SPARKLE_LIFESPAN_MS = 600;
const SPECIAL_ITEM_SPARKLE_RADIUS_PX = 40;
const SPECIAL_ITEM_SPARKLE_COUNT = 3;

type SpecialItemDisplay = {
  sprite: Phaser.GameObjects.Sprite;
  sparkleTimer: Phaser.Time.TimerEvent;
  pulseTween: Phaser.Tweens.Tween;
  sparkles: Phaser.GameObjects.Arc[];
};

export class LuaRuntime {
  private commandQueue: Command[] = [];
  private speechBackgroundColor: string = 'purple';
  private speechTextColor: string = 'white';
  private fadeRectangle: Phaser.GameObjects.Rectangle | null = null;
  private specialItemDisplay: SpecialItemDisplay | null = null;

  constructor(
    private readonly scene: GameScene,
    private readonly playerEntity: Entity
  ) {}

  async executeScript(scriptContent: string, npcId?: string): Promise<void> {
    const factory = new LuaFactory();
    const lua = await factory.createEngine();

    try {
      this.commandQueue = [];
      this.speechBackgroundColor = 'purple';
      this.speechTextColor = 'white';

      lua.global.set('wait', (ms: number) => {
        this.commandQueue.push({ type: 'wait', ms });
      });

      lua.global.set('say', (name: string, text: string, speed: number, timeout?: number) => {
        this.commandQueue.push({
          type: 'say',
          name,
          text,
          speed,
          timeout: timeout ?? 10000,
          backgroundColor: this.speechBackgroundColor,
          textColor: this.speechTextColor
        });
      });

      const playerEntity = this.scene.entityManager.getFirst('player');
      const playerGridPos = playerEntity?.get(GridPositionComponent);
      const playerTransform = playerEntity?.get(TransformComponent);
      const playerWalk = playerEntity?.get(WalkComponent);
      const playerDirection = playerWalk ? DIRECTION_TO_STRING[playerWalk.lastDir] : 'down';

      const player = {
        col: playerGridPos?.currentCell.col ?? 0,
        row: playerGridPos?.currentCell.row ?? 0,
        x: playerTransform?.x ?? 0,
        y: playerTransform?.y ?? 0,
        direction: playerDirection,
        name: () => 'Player',
        moveTo: (col: number, row: number, speed: number) => {
          this.commandQueue.push({ type: 'moveTo', col, row, speed });
        },
        look: (direction: string) => {
          this.commandQueue.push({ type: 'look', direction });
        },
        teleportTo: (col: number, row: number) => {
          this.commandQueue.push({ type: 'teleportTo', col, row });
        },
        punch: (direction: string) => {
          const dir = DIRECTION_MAP[direction];
          if (dir === undefined) {
            throw new Error(`[LuaRuntime] Invalid direction for punch: ${direction}`);
          }
          this.commandQueue.push({ type: 'punch', direction: dir });
        },
        playAnim: (animName: string, repeatType: string, direction?: string, startFrame?: number, endFrame?: number) => {
          const dir = direction ? DIRECTION_MAP[direction] : Direction.Down;
          if (dir === undefined) {
            throw new Error(`[LuaRuntime] Invalid direction for playAnim: ${direction}`);
          }
          const animKey = `${animName}_${dir}`;
          this.commandQueue.push({ type: 'playerPlayAnim', animKey, repeatType: repeatType ?? 'once', startFrame, endFrame });
        }
      };
      lua.global.set('player', player);

      lua.global.set('calculateDirection', (fromX: number, fromY: number, toX: number, toY: number): string => {
        const dx = toX - fromX;
        const dy = toY - fromY;
        return DIRECTION_TO_STRING[dirFromDelta(dx, dy)] ?? 'down';
      });

      if (npcId) {
        const npcEntity = this.scene.entityManager.getByType('npc').find(e => e.id === npcId);
        const npcIdleComp = npcEntity?.get(NPCIdleComponent);
        const npcInteractionComp = npcEntity?.get(NPCInteractionComponent);
        const npcTransform = npcEntity?.get(TransformComponent);
        const currentDirection = npcIdleComp ? DIRECTION_TO_STRING[npcIdleComp.getDirection()] : 'down';
        const activeInteraction = npcInteractionComp?.getActiveInteraction();

        let storedNpcDirection: string | null = null;
        let storedPlayerDirection: string | null = null;

        const npc = {
          col: activeInteraction?.col ?? 0,
          row: activeInteraction?.row ?? 0,
          x: npcTransform?.x ?? 0,
          y: npcTransform?.y ?? 0,
          direction: currentDirection,
          name: () => (npcEntity as any)?.npcName ?? 'NPC',
          look: (direction: string) => {
            const dir = DIRECTION_MAP[direction];
            if (dir === undefined) {
              throw new Error(`[LuaRuntime] Invalid direction: ${direction}`);
            }
            this.commandQueue.push({ type: 'npcLook', npcId, direction: dir });
          },
          playAnim: (animKey: string, repeatType: string) => {
            this.commandQueue.push({ type: 'npcPlayAnim', npcId, animKey, repeatType: repeatType ?? 'once' });
          }
        };
        lua.global.set('npc', npc);

        lua.global.set('faceEachOther', () => {
          // Wait one frame for velocity to fully stop
          this.commandQueue.push({ type: 'wait', ms: 16 });

          storedNpcDirection = currentDirection;
          storedPlayerDirection = playerDirection;

          const npcToPlayerDir = DIRECTION_TO_STRING[dirFromDelta(
            (playerTransform?.x ?? 0) - (npcTransform?.x ?? 0),
            (playerTransform?.y ?? 0) - (npcTransform?.y ?? 0)
          )] ?? 'down';

          const playerToNpcDir = DIRECTION_TO_STRING[dirFromDelta(
            (npcTransform?.x ?? 0) - (playerTransform?.x ?? 0),
            (npcTransform?.y ?? 0) - (playerTransform?.y ?? 0)
          )] ?? 'down';

          this.commandQueue.push({ type: 'look', direction: playerToNpcDir });
          this.commandQueue.push({ type: 'npcLook', npcId, direction: DIRECTION_MAP[npcToPlayerDir]! });
        });

        lua.global.set('restoreDirections', () => {
          if (storedPlayerDirection) {
            this.commandQueue.push({ type: 'look', direction: storedPlayerDirection });
          }
          if (storedNpcDirection) {
            this.commandQueue.push({ type: 'npcLook', npcId, direction: DIRECTION_MAP[storedNpcDirection]! });
          }
        });
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

      lua.global.set('celebrate', () => {
        const dirs = ['down', 'down_left', 'left', 'up_left', 'up', 'up_right', 'right', 'down_right', 'down'];
        const SPIN_DELAY_MS = 30;
        // Play initial powerup frames 0-5 facing down
        this.commandQueue.push({ type: 'playerPlayAnim', animKey: `powerup_${DIRECTION_MAP['down']}`, repeatType: 'once', startFrame: 0, endFrame: 5 });
        // Spin through all directions holding frame 5
        for (let i = 1; i < dirs.length; i++) {
          this.commandQueue.push({ type: 'wait', ms: SPIN_DELAY_MS });
          this.commandQueue.push({ type: 'playerPlayAnim', animKey: `powerup_${DIRECTION_MAP[dirs[i]]}`, repeatType: 'once', startFrame: 5, endFrame: 5 });
        }
      });

      lua.global.set('raiseEvent', (eventName: string) => {
        this.commandQueue.push({ type: 'raiseEvent', eventName });
      });

      lua.global.set('getFlag', (name: string): string => {
        const worldState = WorldStateManager.getInstance();
        return worldState.getFlag(name) ?? '';
      });

      lua.global.set('saveState', () => {
        void WorldStateManager.getInstance().saveToFile();
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

      lua.global.set('showSpecialItem', (itemType: string) => {
        this.commandQueue.push({ type: 'showSpecialItem', itemType });
      });

      lua.global.set('hideSpecialItem', () => {
        this.commandQueue.push({ type: 'hideSpecialItem' });
      });

      await lua.doString(scriptContent);

      for (const cmd of this.commandQueue) {
        await this.executeCommand(cmd);
      }

      // Auto-cleanup special item display when interaction ends
      await this.scaleDownSpecialItemDisplay();

    } finally {
      lua.global.close();
    }
  }

  private async hideSpecialItemDisplay(): Promise<void> {
    if (!this.specialItemDisplay) return;

    const { sprite, sparkleTimer, pulseTween, sparkles } = this.specialItemDisplay;
    sparkleTimer.destroy();
    pulseTween.stop();

    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: sprite,
        scale: 0,
        alpha: 0,
        duration: SPECIAL_ITEM_TWEEN_OUT_DURATION_MS,
        ease: 'Back.easeIn',
        onComplete: () => resolve()
      });
    });

    sprite.destroy();
    sparkles.forEach(s => s.destroy());
    this.specialItemDisplay = null;
  }

  private destroySpecialItemDisplay(): void {
    if (!this.specialItemDisplay) return;
    const { sprite, sparkleTimer, pulseTween, sparkles } = this.specialItemDisplay;
    sparkleTimer.destroy();
    pulseTween.stop();
    sprite.destroy();
    sparkles.forEach(s => s.destroy());
    this.specialItemDisplay = null;
  }

  private scaleDownSpecialItemDisplay(): Promise<void> {
    if (!this.specialItemDisplay) return Promise.resolve();
    const { sprite, sparkleTimer, pulseTween, sparkles } = this.specialItemDisplay;
    sparkleTimer.destroy();
    pulseTween.stop();
    sparkles.forEach(s => s.destroy());
    this.specialItemDisplay = null;
    return new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: sprite,
        scale: 0,
        duration: SPECIAL_ITEM_AUTO_HIDE_DURATION_MS,
        ease: 'Power2',
        onComplete: () => { sprite.destroy(); resolve(); }
      });
    });
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
      } else if (cmd.type === 'teleportTo') {
        const transform = this.playerEntity.require(TransformComponent);
        const gridPos = this.playerEntity.get(GridPositionComponent);
        const grid = this.scene.getGrid();
        const worldPos = grid.cellToWorld(cmd.col, cmd.row);
        transform.x = worldPos.x + grid.cellSize / 2;
        transform.y = worldPos.y + grid.cellSize / 2;
        if (gridPos) {
          gridPos.currentCell = { col: cmd.col, row: cmd.row };
        }
      } else if (cmd.type === 'punch') {
        const combo = this.playerEntity.get(AttackComboComponent);
        if (combo) {
          combo.forcePunch(cmd.direction);
          await new Promise<void>(resolve => {
            const check = () => {
              if (!combo.isPunching()) { resolve(); return; }
              setTimeout(check, 16);
            };
            setTimeout(check, 50);
          });
        }
      } else if (cmd.type === 'playerPlayAnim') {
        const anim = this.playerEntity.get(AnimationComponent);
        if (anim) {
          if (cmd.startFrame !== undefined && cmd.endFrame !== undefined) {
            const style = cmd.repeatType === 'repeat' ? 'repeat' : 'once';
            anim.animationSystem.playFrameRange(cmd.animKey, cmd.startFrame, cmd.endFrame, style);
          } else {
            anim.animationSystem.play(cmd.animKey);
          }
          if (cmd.repeatType === 'once') {
            const currentAnim = anim.animationSystem.getCurrentAnimation();
            await new Promise<void>(resolve => {
              const check = () => {
                if (currentAnim?.isOnLastFrame()) { resolve(); return; }
                setTimeout(check, 16);
              };
              setTimeout(check, 50);
            });
          }
        }
      } else if (cmd.type === 'npcPlayAnim') {
        const npcEntity = this.scene.entityManager.getAll().find(e => e.id === cmd.npcId);
        const sprite = npcEntity?.get(SpriteComponent);
        if (sprite) {
          const idle = npcEntity?.get(NPCIdleComponent);
          if (idle) idle.setPaused(true);
          const repeat = cmd.repeatType === 'repeat' ? -1 : 0;
          sprite.sprite.play({ key: cmd.animKey, repeat });
          if (cmd.repeatType === 'once') {
            await new Promise<void>(resolve => {
              sprite.sprite.once('animationcomplete', () => resolve());
            });
            if (idle) idle.setPaused(false);
          }
        }
      } else if (cmd.type === 'raiseEvent') {
        this.scene.eventManager.raiseEvent(cmd.eventName);
      } else if (cmd.type === 'showSpecialItem') {
        this.destroySpecialItemDisplay();

        const camera = this.scene.cameras.main;
        const x = camera.width / 2;
        const y = camera.height * SPECIAL_ITEM_Y_PERCENT + SPECIAL_ITEM_Y_OFFSET_PX;

        const sprite = this.scene.add.sprite(x, y, cmd.itemType);
        sprite.setScrollFactor(0);
        sprite.setDepth(Depth.fade + 1);
        sprite.setScale(0);

        // Tween in with bounce
        await new Promise<void>(resolve => {
          this.scene.tweens.add({
            targets: sprite,
            scale: SPECIAL_ITEM_SCALE,
            duration: SPECIAL_ITEM_TWEEN_IN_DURATION_MS,
            ease: 'Back.easeOut',
            onComplete: () => resolve()
          });
        });

        // Pulsing tween
        const pulseTween = this.scene.tweens.add({
          targets: sprite,
          scale: { from: SPECIAL_ITEM_SCALE * (1 - SPECIAL_ITEM_PULSE_AMPLITUDE), to: SPECIAL_ITEM_SCALE * (1 + SPECIAL_ITEM_PULSE_AMPLITUDE) },
          duration: 1000 / SPECIAL_ITEM_PULSE_FREQUENCY_HZ / 2,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        // Sparkle particles
        const sparkles: Phaser.GameObjects.Arc[] = [];
        const sparkleTimer = this.scene.time.addEvent({
          delay: SPECIAL_ITEM_SPARKLE_FREQUENCY_MS,
          loop: true,
          callback: () => {
            for (let i = 0; i < SPECIAL_ITEM_SPARKLE_COUNT; i++) {
              const angle = Math.random() * Math.PI * 2;
              const dist = Math.random() * SPECIAL_ITEM_SPARKLE_RADIUS_PX;
              const sx = sprite.x + Math.cos(angle) * dist;
              const sy = sprite.y + Math.sin(angle) * dist;
              const size = 1 + Math.random() * 2;
              const sparkle = this.scene.add.circle(sx, sy, size, 0xffffff);
              sparkle.setScrollFactor(0);
              sparkle.setDepth(Depth.fade + 2);
              sparkles.push(sparkle);
              this.scene.tweens.add({
                targets: sparkle,
                alpha: 0,
                scale: 0,
                duration: SPECIAL_ITEM_SPARKLE_LIFESPAN_MS,
                onComplete: () => {
                  sparkle.destroy();
                  const idx = sparkles.indexOf(sparkle);
                  if (idx !== -1) sparkles.splice(idx, 1);
                }
              });
            }
          }
        });

        this.specialItemDisplay = { sprite, sparkleTimer, pulseTween, sparkles };
      } else if (cmd.type === 'hideSpecialItem') {
        await this.hideSpecialItemDisplay();
      }
    } finally {
      // Remove tag after command completes (before next command starts)
      this.playerEntity.tags.delete('interaction_active');
    }
  }
}
