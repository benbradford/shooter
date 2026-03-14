import Phaser from 'phaser';
import { LevelLoader } from '../systems/level/LevelLoader';
import { AssetLoadCoordinator } from '../systems/AssetLoadCoordinator';
import { AssetManifest } from '../systems/AssetManifest';
import { AssetManager } from '../systems/AssetManager';
import { MemoryMonitor } from '../systems/MemoryMonitor';
import { DungeonSceneRenderer } from './theme/DungeonSceneRenderer';
import { WildsSceneRenderer } from './theme/WildsSceneRenderer';
import { SwampSceneRenderer } from './theme/SwampSceneRenderer';
import { GrassSceneRenderer } from './theme/GrassSceneRenderer';
import { DefaultSceneRenderer } from './theme/DefaultSceneRenderer';
import type { GameSceneRenderer } from './theme/GameSceneRenderer';
import { CELL_SIZE } from '../constants/GameConstants';

const ERROR_FONT_SIZE = '20px';
const BUTTON_FONT_SIZE = '18px';
const BUTTON_PADDING_PX = 10;
const RETRY_BUTTON_OFFSET_Y_PX = 50;
const RETURN_BUTTON_OFFSET_Y_PX = 100;

type LoadingSceneData = {
  targetLevel: string;
  targetCol: number;
  targetRow: number;
  previousLevel: string;
}

export default class LoadingScene extends Phaser.Scene {
  private targetLevel!: string;
  private targetCol!: number;
  private targetRow!: number;
  private previousLevel!: string;

  constructor() {
    super({ key: 'LoadingScene' });
  }

  init(data: LoadingSceneData): void {
    this.targetLevel = data.targetLevel;
    this.targetCol = data.targetCol;
    this.targetRow = data.targetRow;
    this.previousLevel = data.previousLevel;
    
    console.log('[DBGAME] Transition to:', this.targetLevel);
    this.scene.stop('game');
  }

  create(): void {
    // Start loading immediately (don't show UI)
    this.loadLevel().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[DBGAME] Load error:', message);
      this.showError(message);
    });
  }

  private async loadLevel(): Promise<void> {
    try {
      const levelData = await LevelLoader.load(this.targetLevel);

      const assetResult = await AssetLoadCoordinator.loadLevelAssets(
        this,
        levelData,
        () => {} // No progress UI
      );

      if (!assetResult.success) {
        console.error('[DBGAME] Asset load failed:', assetResult.failedAssets);
        this.showError(`Failed to load assets: ${assetResult.failedAssets.join(', ')}`);
        return;
      }

      const theme = levelData.levelTheme ?? 'dungeon';
      let renderer: GameSceneRenderer;
      if (theme === 'wilds') {
        renderer = new WildsSceneRenderer(this, CELL_SIZE);
      } else if (theme === 'swamp') {
        renderer = new SwampSceneRenderer(this, CELL_SIZE);
      } else if (theme === 'grass') {
        renderer = new GrassSceneRenderer(this, CELL_SIZE);
      } else if (theme === 'default') {
        renderer = new DefaultSceneRenderer(this, CELL_SIZE);
      } else {
        renderer = new DungeonSceneRenderer(this, CELL_SIZE);
      }

      const tilesetResult = await renderer.prepareRuntimeTilesets(levelData);
      renderer.destroy();

      if (!tilesetResult.success) {
        console.error('[DBGAME] Tileset generation failed:', tilesetResult.failed);
        this.showError(`Failed to generate tilesets: ${tilesetResult.failed.join(', ')}`);
        return;
      }

      if (this.previousLevel && this.previousLevel !== this.targetLevel) {
        this.unloadPreviousLevelAssets(levelData);
      }

      MemoryMonitor.checkForLeaks(this);

      console.log('[DBGAME] Transition complete, starting:', this.targetLevel);
      this.scene.start('game', {
        level: this.targetLevel,
        levelData,
        playerCol: this.targetCol,
        playerRow: this.targetRow
      });
      
      if (!this.scene.isActive('HudScene')) {
        this.scene.launch('HudScene');
      }
    } catch (error) {
      console.error('[DBGAME] EXCEPTION:', error);
      throw error;
    }
  }

  private unloadPreviousLevelAssets(nextLevelData: import('../systems/level/LevelLoader').LevelData): void {
    const nextAssets = AssetManifest.fromLevelData(nextLevelData);
    const textureKeys = this.textures.getTextureKeys()
      .filter(key => key !== '__DEFAULT' && key !== '__MISSING');

    // Filter out runtime-generated textures (UUIDs and special names)
    const isRuntimeTexture = (key: string) => {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
        return true;
      }
      if (key.includes('_gradient') || key.includes('_tileset') || key.includes('_water_')) {
        return true;
      }
      return false;
    };

    const candidates = textureKeys.filter(key => 
      !nextAssets.has(key as import('../assets/AssetRegistry').AssetKey) &&
      !isRuntimeTexture(key)
    );
    
    const result = AssetManager.getInstance().unloadSafe(this, candidates);
    console.log('[DBGAME] Unloaded:', result.unloaded.length, 'textures');
  }

  private showError(message: string): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY - RETRY_BUTTON_OFFSET_Y_PX, `Failed to load level:\n${message}`, {
      fontSize: ERROR_FONT_SIZE,
      color: '#ff0000',
      align: 'center'
    }).setOrigin(0.5);

    const retryButton = this.add.text(centerX, centerY + RETRY_BUTTON_OFFSET_Y_PX, 'Retry', {
      fontSize: BUTTON_FONT_SIZE,
      color: '#ffffff',
      backgroundColor: '#333399',
      padding: { x: BUTTON_PADDING_PX * 2, y: BUTTON_PADDING_PX }
    }).setOrigin(0.5).setInteractive();

    retryButton.on('pointerdown', () => {
      this.scene.restart();
    });

    const returnButton = this.add.text(centerX, centerY + RETURN_BUTTON_OFFSET_Y_PX, 'Return to Previous Level', {
      fontSize: BUTTON_FONT_SIZE,
      color: '#ffffff',
      backgroundColor: '#336633',
      padding: { x: BUTTON_PADDING_PX * 2, y: BUTTON_PADDING_PX }
    }).setOrigin(0.5).setInteractive();

    returnButton.on('pointerdown', () => {
      this.scene.start('LoadingScene', {
        targetLevel: this.previousLevel,
        targetCol: 0,
        targetRow: 0,
        previousLevel: this.targetLevel
      } satisfies LoadingSceneData);
    });
  }

  shutdown(): void {
    // Phaser handles destruction
  }
}
