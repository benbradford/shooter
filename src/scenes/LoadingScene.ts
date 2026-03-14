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

const PROGRESS_BAR_WIDTH_PX = 300;
const PROGRESS_BAR_HEIGHT_PX = 30;
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
  private progressBar?: Phaser.GameObjects.Graphics;
  private progressBox?: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'LoadingScene' });
  }

  init(data: LoadingSceneData): void {
    this.targetLevel = data.targetLevel;
    this.targetCol = data.targetCol;
    this.targetRow = data.targetRow;
    this.previousLevel = data.previousLevel;
    
    // Stop game scene (shutdown happens asynchronously)
    this.scene.stop('game');
  }

  create(): void {
    this.showLoadingUI();
    
    // Start loading immediately (don't wait for shutdown)
    this.loadLevel().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.showError(message);
    });
  }

  private showLoadingUI(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(
      centerX - PROGRESS_BAR_WIDTH_PX / 2 - 5,
      centerY - PROGRESS_BAR_HEIGHT_PX / 2 - 5,
      PROGRESS_BAR_WIDTH_PX + 10,
      PROGRESS_BAR_HEIGHT_PX + 10
    );

    this.progressBar = this.add.graphics();

    this.add.text(centerX, centerY - 40, `Loading ${this.targetLevel}...`, {
      fontSize: BUTTON_FONT_SIZE,
      color: '#ffffff'
    }).setOrigin(0.5);
  }

  private updateProgress(percent: number): void {
    if (!this.progressBar) return;

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.progressBar.clear();
    this.progressBar.fillStyle(0xffffff, 1);
    this.progressBar.fillRect(
      centerX - PROGRESS_BAR_WIDTH_PX / 2,
      centerY - PROGRESS_BAR_HEIGHT_PX / 2,
      PROGRESS_BAR_WIDTH_PX * (percent / 100),
      PROGRESS_BAR_HEIGHT_PX
    );
  }

  private async loadLevel(): Promise<void> {
    const levelData = await LevelLoader.load(this.targetLevel);

    const assetResult = await AssetLoadCoordinator.loadLevelAssets(
      this,
      levelData,
      (percent) => this.updateProgress(percent)
    );

    if (!assetResult.success) {
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
      this.showError(`Failed to generate tilesets: ${tilesetResult.failed.join(', ')}`);
      return;
    }

    if (this.previousLevel && this.previousLevel !== this.targetLevel) {
      this.unloadPreviousLevelAssets(levelData);
    }

    MemoryMonitor.checkForLeaks(this);

    this.scene.start('game', {
      level: this.targetLevel,
      levelData,
      playerCol: this.targetCol,
      playerRow: this.targetRow
    });
    
    // Launch HUD only if not already running
    if (!this.scene.isActive('HudScene')) {
      this.scene.launch('HudScene');
    }
  }

  private unloadPreviousLevelAssets(nextLevelData: import('../systems/level/LevelLoader').LevelData): void {
    const nextAssets = AssetManifest.fromLevelData(nextLevelData);
    const textureKeys = this.textures.getTextureKeys()
      .filter(key => key !== '__DEFAULT' && key !== '__MISSING');

    // Filter out runtime-generated textures (UUIDs and special names)
    const isRuntimeTexture = (key: string) => {
      // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
        return true;
      }
      // Known runtime textures
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

    if (result.unloaded.length > 0) {
      console.log(`[LoadingScene] Unloaded ${result.unloaded.length} textures from previous level`);
    }
    if (result.skipped.length > 0) {
      console.log(`[LoadingScene] Skipped ${result.skipped.length} textures (still in use)`);
    }
  }

  private showError(message: string): void {
    // Clear loading UI only (Phaser handles scene children cleanup)
    if (this.progressBar) {
      this.progressBar.destroy();
      this.progressBar = undefined;
    }
    if (this.progressBox) {
      this.progressBox.destroy();
      this.progressBox = undefined;
    }

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
    // Clear references (Phaser handles destruction)
    this.progressBar = undefined;
    this.progressBox = undefined;
  }
}
