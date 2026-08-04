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
import { AttackComboComponent } from '../ecs/components/combat/AttackComboComponent';
import { NPCIdleComponent } from '../ecs/entities/npc/NPCIdleComponent';
import { TvFaceComponent } from '../ecs/entities/tvmonk/TvFaceComponent';
import { TvMonkBehaviorComponent } from '../ecs/entities/tvmonk/TvMonkBehaviorComponent';
import { Depth } from '../constants/DepthConstants';
import type { Command } from './lua-api/types';
import { registerPlayerAPI } from './lua-api/PlayerAPI';
import { registerNpcAPI } from './lua-api/NpcAPI';
import { registerWorldAPI } from './lua-api/WorldAPI';
import { registerUIAPI, type SpeechColorState } from './lua-api/UIAPI';
import { registerEffectsAPI } from './lua-api/EffectsAPI';
import { registerEntityAPI } from './lua-api/EntityAPI';
import { getEffectHandler } from './effects/EffectRegistry';
import { getSpawnHandler } from './spawners/SpawnRegistry';
import './effects'; // Side-effect import: registers all effects
import './spawners'; // Side-effect import: registers all spawners

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
  private fadeRectangle: Phaser.GameObjects.Rectangle | null = null;
  private specialItemDisplay: SpecialItemDisplay | null = null;
  private activeEffects: Promise<void>[] = [];

  constructor(
    private readonly scene: GameScene,
    private readonly playerEntity: Entity
  ) {}

  async executeScript(scriptContent: string, npcId?: string): Promise<void> {
    const factory = new LuaFactory();
    const lua = await factory.createEngine();

    // Expose runtime on scene so effect callbacks can process commands immediately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.scene as any)._activeLuaRuntime = this;

    try {
      this.commandQueue.length = 0;
      const speechColors: SpeechColorState = { backgroundColor: 'purple', textColor: 'white' };

      registerPlayerAPI(lua, this.scene, this.commandQueue);
      registerNpcAPI(lua, this.scene, this.commandQueue, npcId);
      registerWorldAPI(lua, this.commandQueue);
      registerUIAPI(lua, this.scene, this.commandQueue, speechColors);
      registerEffectsAPI(lua, this.commandQueue);
      registerEntityAPI(lua, this.commandQueue);

      await lua.doString(scriptContent);

      let commands = this.commandQueue.splice(0);

      for (const cmd of commands) {
        await this.executeCommand(cmd);
      }

      // Wait for async effects, then drain any commands added by callbacks
      let drainAttempts = 0;
      while (this.activeEffects.length > 0 || this.commandQueue.length > 0) {
        await Promise.all(this.activeEffects);
        this.activeEffects = [];

        if (this.commandQueue.length > 0) {
          commands = this.commandQueue.splice(0);
          for (const cmd of commands) {
            await this.executeCommand(cmd);
          }
        }

        if (++drainAttempts > 100) break;
      }

      await this.scaleDownSpecialItemDisplay();
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.scene as any)._activeLuaRuntime = null;
      lua.global.close();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly commandHandlers: Record<string, (cmd: any) => void | Promise<void>> = {
    wait: (cmd) => this.handleWait(cmd.ms),
    say: (cmd) => this.handleSay(cmd),
    moveTo: (cmd) => this.handleMoveTo(cmd),
    look: (cmd) => this.handleLook(cmd.direction),
    npcLook: (cmd) => this.handleNpcLook(cmd.npcId, cmd.direction),
    spendCoins: (cmd) => this.handleSpendCoins(cmd.amount),
    obtainCoins: (cmd) => this.handleObtainCoins(cmd.amount),
    fadeOut: (cmd) => this.handleFadeOut(cmd.durationMs),
    fadeIn: (cmd) => this.handleFadeIn(cmd.durationMs),
    teleportTo: (cmd) => this.handleTeleportTo(cmd.col, cmd.row),
    punch: (cmd) => this.handlePunch(cmd.direction),
    playerPlayAnim: (cmd) => this.handlePlayerPlayAnim(cmd),
    npcPlayAnim: (cmd) => this.handleNpcPlayAnim(cmd),
    raiseEvent: (cmd) => { this.scene.eventManager.raiseEvent(cmd.eventName); },
    showSpecialItem: (cmd) => this.handleShowSpecialItem(cmd.itemType),
    hideSpecialItem: () => this.hideSpecialItemDisplay(),
    createEffect: (cmd) => { this.activeEffects.push(this.handleCreateEffect(cmd.effectName, cmd.args)); },
    entityLook: (cmd) => this.handleEntityLook(cmd.entityId, cmd.direction),
    entityMoveTo: (cmd) => this.handleEntityMoveTo(cmd.entityId, cmd.col, cmd.row, cmd.speed),
    entityPlayAnim: (cmd) => this.handleEntityPlayAnim(cmd.entityId, cmd.animKey, cmd.repeatType),
    spawn: (cmd) => { this.activeEffects.push(this.handleSpawn(cmd.spawnerName, cmd.entityId, cmd.args)); },
    cameraLookAt: (cmd) => this.handleCameraLookAt(cmd.col, cmd.row, cmd.durationMs),
    cameraFollowPlayer: (cmd) => this.handleCameraFollowPlayer(cmd.durationMs),
    kill: (cmd) => this.handleKill(cmd.entityId),
  };

  private async executeCommand(cmd: Command): Promise<void> {
    this.playerEntity.tags.add('interaction_active');
    try {
      const handler = this.commandHandlers[cmd.type];
      if (handler) await handler(cmd);
    } finally {
      this.playerEntity.tags.delete('interaction_active');
    }
  }

  async processCallbackCommands(): Promise<void> {
    while (this.commandQueue.length > 0) {
      const cmd = this.commandQueue.shift()!;
      await this.executeCommand(cmd);
    }
  }

  private handleWait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleSay(cmd: Command & { type: 'say' }): Promise<void> {
    const speechEntity = new Entity('speech_box');
    speechEntity.tags.add('interaction_active');
    speechEntity.add(new TransformComponent(0, 0, 0, 1));
    const speechBox = speechEntity.add(new SpeechBoxComponent(this.scene, cmd.backgroundColor, cmd.textColor));
    this.scene.entityManager.add(speechEntity);
    await speechBox.show(cmd.name, cmd.text, cmd.speed, cmd.timeout);
    speechEntity.destroy();
  }

  private async handleMoveTo(cmd: Command & { type: 'moveTo' }): Promise<void> {
    const interactionComp = this.playerEntity.get(InteractionComponent);
    if (!interactionComp) throw new Error('[LuaRuntime] Player missing InteractionComponent');
    await interactionComp.moveTo(cmd.col, cmd.row, cmd.speed);
  }

  private handleLook(direction: string): void {
    const interactionComp = this.playerEntity.get(InteractionComponent);
    if (!interactionComp) throw new Error('[LuaRuntime] Player missing InteractionComponent');
    interactionComp.look(direction);
  }

  private handleNpcLook(npcId: string, direction: number): void {
    const npcEntity = this.scene.entityManager.getAll().find(e => e.id === npcId);
    const idle = npcEntity?.get(NPCIdleComponent);
    if (idle) idle.setDirection(direction);
  }

  private async handleSpendCoins(amount: number): Promise<void> {
    const coinCounter = this.getCoinCounter();
    if (coinCounter) await coinCounter.removeCoinsAnimated(amount);
  }

  private async handleObtainCoins(amount: number): Promise<void> {
    const coinCounter = this.getCoinCounter();
    if (coinCounter) await coinCounter.addCoinsAnimated(amount);
  }

  private getCoinCounter(): CoinCounterComponent | undefined {
    const hudScene = this.scene.scene.get('HudScene');
    const joystickEntity = (hudScene as { getJoystickEntity?: () => Entity })?.getJoystickEntity?.();
    return joystickEntity?.get(CoinCounterComponent);
  }

  private async handleFadeOut(durationMs: number): Promise<void> {
    if (!this.fadeRectangle) {
      const width = this.scene.cameras.main.width;
      const height = this.scene.cameras.main.height;
      this.fadeRectangle = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000);
      this.fadeRectangle.setScrollFactor(0);
      this.fadeRectangle.setDepth(100000);
      this.fadeRectangle.setAlpha(0);
    }
    await new Promise<void>(resolve => {
      this.scene.tweens.add({ targets: this.fadeRectangle, alpha: 1, duration: durationMs, onComplete: () => resolve() });
    });
  }

  private async handleFadeIn(durationMs: number): Promise<void> {
    if (!this.fadeRectangle) return;
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: this.fadeRectangle,
        alpha: 0,
        duration: durationMs,
        onComplete: () => { this.fadeRectangle?.destroy(); this.fadeRectangle = null; resolve(); }
      });
    });
  }

  private handleTeleportTo(col: number, row: number): void {
    const transform = this.playerEntity.require(TransformComponent);
    const gridPos = this.playerEntity.get(GridPositionComponent);
    const grid = this.scene.getGrid();
    const worldPos = grid.cellToWorld(col, row);
    transform.x = worldPos.x + grid.cellSize / 2;
    transform.y = worldPos.y + grid.cellSize / 2;
    if (gridPos) gridPos.currentCell = { col, row };
  }

  private async handlePunch(direction: number): Promise<void> {
    const combo = this.playerEntity.get(AttackComboComponent);
    if (!combo) return;
    combo.forcePunch(direction);
    await new Promise<void>(resolve => {
      const check = () => {
        if (!combo.isPunching()) { resolve(); return; }
        setTimeout(check, 16);
      };
      setTimeout(check, 50);
    });
  }

  private async handlePlayerPlayAnim(cmd: Command & { type: 'playerPlayAnim' }): Promise<void> {
    const anim = this.playerEntity.get(AnimationComponent);
    if (!anim) return;
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

  private async handleNpcPlayAnim(cmd: Command & { type: 'npcPlayAnim' }): Promise<void> {
    const npcEntity = this.scene.entityManager.getAll().find(e => e.id === cmd.npcId);
    const sprite = npcEntity?.get(SpriteComponent);
    if (!sprite) return;
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

  private handleEntityLook(entityId: string, direction: number): void {
    const entity = this.scene.entityManager.getAll().find(e => e.id === entityId);
    if (!entity) { console.error(`[LuaRuntime] entity('${entityId}') not found`); return; }

    // TvMonk uses TvFaceComponent for direction
    const tvFace = entity.get(TvFaceComponent);
    if (tvFace) {
      const behavior = entity.get(TvMonkBehaviorComponent);
      if (behavior) behavior.setPaused(true);
      tvFace.setPaused(false);
      tvFace.setDirection(direction);
      return;
    }

    // NPCs use NPCIdleComponent
    const npcIdle = entity.get(NPCIdleComponent);
    if (npcIdle) {
      npcIdle.setDirection(direction);
      return;
    }

    // Generic fallback: play idle animation
    const anim = entity.get(AnimationComponent);
    if (anim) {
      anim.animationSystem.play(`idle_${direction}`);
    } else {
      const sprite = entity.get(SpriteComponent);
      if (sprite) sprite.sprite.play({ key: `idle_${direction}`, repeat: -1 });
    }
  }

  private handleEntityMoveTo(entityId: string, col: number, row: number, speed: number): Promise<void> {
    const entity = this.scene.entityManager.getAll().find(e => e.id === entityId);
    if (!entity) { console.error(`[LuaRuntime] entity('${entityId}') not found`); return Promise.resolve(); }
    const transform = entity.get(TransformComponent);
    if (!transform) return Promise.resolve();

    const grid = this.scene.getGrid();
    const targetWorld = grid.cellToWorld(col, row);
    const targetX = targetWorld.x + grid.cellSize / 2;
    const targetY = targetWorld.y + grid.cellSize / 2;

    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const durationMs = (dist / speed) * 1000;

    const gridPos = entity.get(GridPositionComponent);

    return new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: transform,
        x: targetX,
        y: targetY,
        duration: durationMs,
        ease: 'Linear',
        onComplete: () => {
          if (gridPos) gridPos.currentCell = { col, row };
          resolve();
        }
      });
    });
  }

  private handleEntityPlayAnim(entityId: string, animKey: string, repeatType: string): Promise<void> {
    const entity = this.scene.entityManager.getAll().find(e => e.id === entityId);
    if (!entity) { console.error(`[LuaRuntime] entity('${entityId}') not found`); return Promise.resolve(); }
    const sprite = entity.get(SpriteComponent);
    if (!sprite) return Promise.resolve();

    // Pause face/behavior components so they don't override the animation
    const tvFace = entity.get(TvFaceComponent);
    if (tvFace) tvFace.setPaused(true);
    const behavior = entity.get(TvMonkBehaviorComponent);
    if (behavior) behavior.setPaused(true);

    const repeat = repeatType === 'repeat' ? -1 : 0;
    sprite.sprite.play({ key: animKey, repeat });

    if (repeatType === 'once' || repeatType === 'hold') {
      return new Promise<void>(resolve => {
        sprite.sprite.once('animationcomplete', () => {
          if (repeatType === 'hold') {
            sprite.sprite.stop();
          }
          resolve();
        });
      });
    }
    return Promise.resolve();
  }

  private handleKill(entityId: string): void {
    const entity = this.scene.entityManager.getAll().find(e => e.id === entityId);
    if (!entity) { console.error(`[LuaRuntime] kill: entity '${entityId}' not found`); return; }
    entity.destroy();
  }

  private handleCameraLookAt(col: number, row: number, durationMs: number): Promise<void> {
    const camera = this.scene.cameras.main;
    const grid = this.scene.getGrid();
    const worldPos = grid.cellToWorld(col, row);
    const targetX = worldPos.x + grid.cellSize / 2;
    const targetY = worldPos.y + grid.cellSize / 2;

    camera.stopFollow();

    return new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: camera,
        scrollX: targetX - camera.width / 2,
        scrollY: targetY - camera.height / 2,
        duration: durationMs,
        ease: 'Sine.easeInOut',
        onComplete: () => resolve(),
      });
    });
  }

  private handleCameraFollowPlayer(durationMs: number): Promise<void> {
    const camera = this.scene.cameras.main;
    const player = this.scene.entityManager.getFirst('player');
    const sprite = player?.get(SpriteComponent);
    if (!sprite) return Promise.resolve();

    const targetX = sprite.sprite.x - camera.width / 2;
    const targetY = sprite.sprite.y - camera.height / 2;

    return new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: camera,
        scrollX: targetX,
        scrollY: targetY,
        duration: durationMs,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          camera.startFollow(sprite.sprite, true, 0.1, 0.1);
          resolve();
        },
      });
    });
  }

  private async handleSpawn(spawnerName: string, entityId: string, args: Record<string, unknown>): Promise<void> {
    const handler = getSpawnHandler(spawnerName);
    if (!handler) {
      console.error(`[LuaRuntime] Unknown spawner: ${spawnerName}`);
      return;
    }
    await handler(this.scene, entityId, args);
  }

  private async handleCreateEffect(effectName: string, args: Record<string, unknown>): Promise<void> {
    const handler = getEffectHandler(effectName);
    if (!handler) {
      console.error(`[LuaRuntime] Unknown effect: ${effectName}`);
      return;
    }
    await handler(this.scene, args);
  }

  private async handleShowSpecialItem(itemType: string): Promise<void> {
    this.destroySpecialItemDisplay();

    const camera = this.scene.cameras.main;
    const x = camera.width / 2;
    const y = camera.height * SPECIAL_ITEM_Y_PERCENT + SPECIAL_ITEM_Y_OFFSET_PX;

    const sprite = this.scene.add.sprite(x, y, itemType);
    sprite.setScrollFactor(0);
    sprite.setDepth(Depth.fade + 1);
    sprite.setScale(0);

    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: sprite,
        scale: SPECIAL_ITEM_SCALE,
        duration: SPECIAL_ITEM_TWEEN_IN_DURATION_MS,
        ease: 'Back.easeOut',
        onComplete: () => resolve()
      });
    });

    const pulseTween = this.scene.tweens.add({
      targets: sprite,
      scale: { from: SPECIAL_ITEM_SCALE * (1 - SPECIAL_ITEM_PULSE_AMPLITUDE), to: SPECIAL_ITEM_SCALE * (1 + SPECIAL_ITEM_PULSE_AMPLITUDE) },
      duration: 1000 / SPECIAL_ITEM_PULSE_FREQUENCY_HZ / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

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
}
