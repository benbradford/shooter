import { WorldStateManager } from '../../../systems/WorldStateManager';
import { Depth } from '../../../constants/DepthConstants';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { BaseEventComponent } from '../core/BaseEventComponent';

const COIN_ICON_SIZE_PX = 32;
const HUD_POSITION_X_PERCENT = 0.05;
const HUD_POSITION_Y_PERCENT = 0.05;
const FADE_DELAY_MS = 3000;
const FADE_DURATION_MS = 1000;

export class CoinCounterComponent extends BaseEventComponent {
  private readonly scene: Phaser.Scene;
  private coinIcon!: Phaser.GameObjects.Image;
  private coinText!: Phaser.GameObjects.Text;
  private lastCoinCount = -1;
  private timeSinceLastCoinMs = 0;

  constructor(scene: Phaser.Scene, eventManager: EventManagerSystem) {
    super(eventManager);
    this.scene = scene;
  }

  init(): void {
    const displayWidth = this.scene.scale.displaySize.width;
    const displayHeight = this.scene.scale.displaySize.height;
    
    const x = displayWidth * HUD_POSITION_X_PERCENT;
    const y = displayHeight * HUD_POSITION_Y_PERCENT;
    
    this.coinIcon = this.scene.add.image(x, y, 'coin');
    this.coinIcon.setDisplaySize(COIN_ICON_SIZE_PX, COIN_ICON_SIZE_PX);
    this.coinIcon.setScrollFactor(0);
    this.coinIcon.setDepth(Depth.hud);
    this.coinIcon.setAlpha(1);
    
    this.coinText = this.scene.add.text(x + COIN_ICON_SIZE_PX, y, '0', {
      fontSize: '24px',
      color: '#ffff00',
      fontStyle: 'bold'
    });
    this.coinText.setOrigin(0, 0.5);
    this.coinText.setScrollFactor(0);
    this.coinText.setDepth(Depth.hud);
    this.coinText.setAlpha(1);
    
    this.registerEvent('level_loaded');
  }
  
  onEvent(_eventName: string): void {
    this.timeSinceLastCoinMs = 0;
    this.coinIcon.setAlpha(1);
    this.coinText.setAlpha(1);
  }

  update(delta: number): void {
    const worldState = WorldStateManager.getInstance();
    const coins = worldState.getPlayerCoins();
    this.coinText.setText(coins.toString());
    
    if (coins !== this.lastCoinCount) {
      this.lastCoinCount = coins;
      this.timeSinceLastCoinMs = 0;
      this.coinIcon.setAlpha(1);
      this.coinText.setAlpha(1);
      return;
    }
    
    this.timeSinceLastCoinMs += delta;
    
    if (this.timeSinceLastCoinMs >= FADE_DELAY_MS) {
      const fadeProgress = Math.min(1, (this.timeSinceLastCoinMs - FADE_DELAY_MS) / FADE_DURATION_MS);
      const alpha = 1 - fadeProgress;
      this.coinIcon.setAlpha(alpha);
      this.coinText.setAlpha(alpha);
    }
  }
}
