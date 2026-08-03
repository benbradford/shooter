import type { LuaEngine } from 'wasmoon';
import type GameScene from '../../scenes/GameScene';
import { Entity } from '../../ecs/Entity';
import { CoinCounterComponent } from '../../ecs/components/ui/CoinCounterComponent';
import type { Command } from './types';

export type SpeechColorState = {
  backgroundColor: string;
  textColor: string;
};

export function registerUIAPI(lua: LuaEngine, scene: GameScene, commandQueue: Command[], speechColors: SpeechColorState): void {
  lua.global.set('wait', (ms: number) => {
    commandQueue.push({ type: 'wait', ms });
  });

  lua.global.set('say', (name: string, text: string, speed: number, timeout?: number) => {
    commandQueue.push({
      type: 'say',
      name,
      text,
      speed,
      timeout: timeout ?? 10000,
      backgroundColor: speechColors.backgroundColor,
      textColor: speechColors.textColor
    });
  });

  const hudScene = scene.scene.get('HudScene');
  const joystickEntity = (hudScene as { getJoystickEntity?: () => Entity })?.getJoystickEntity?.();
  const coinCounter = joystickEntity?.get(CoinCounterComponent);

  if (!coinCounter) {
    throw new Error('[LuaRuntime] CoinCounterComponent not found in HUD');
  }

  const coins = {
    get: () => coinCounter.getCount(),
    spend: (amount: number) => {
      commandQueue.push({ type: 'spendCoins', amount });
    },
    obtain: (amount: number) => {
      commandQueue.push({ type: 'obtainCoins', amount });
    }
  };
  lua.global.set('coins', coins);

  const speech = {
    backgroundColor: (color: string) => {
      speechColors.backgroundColor = color;
    },
    textColor: (color: string) => {
      speechColors.textColor = color;
    }
  };
  lua.global.set('speech', speech);

  lua.global.set('playSound', (key: string) => {
    scene.sound.play(key);
  });

  lua.global.set('fadeOut', (durationMs: number) => {
    commandQueue.push({ type: 'fadeOut', durationMs });
  });

  lua.global.set('fadeIn', (durationMs: number) => {
    commandQueue.push({ type: 'fadeIn', durationMs });
  });

  lua.global.set('showSpecialItem', (itemType: string) => {
    commandQueue.push({ type: 'showSpecialItem', itemType });
  });

  lua.global.set('hideSpecialItem', () => {
    commandQueue.push({ type: 'hideSpecialItem' });
  });
}
