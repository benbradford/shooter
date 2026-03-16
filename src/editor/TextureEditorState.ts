import { EditorState } from './EditorState';
import { Depth } from '../constants/DepthConstants';
import type GameScene from '../scenes/GameScene';
import { SPRITESHEET_TEXTURES, type SpritesheetSprite, type SpritesheetDefinition } from './SpritesheetTextures';
import type { BackgroundTextureConfig, SourceRect } from '../systems/level/LevelLoader';

const AVAILABLE_TEXTURES: string[] = [
  'bed1',
  'bench1',
  'bridge_h',
  'bridge_v',
  'bush1',
  'chair1',
  'chair2',
  'door_closed',
  'dungeon_door',
  'dungeon_floor',
  'dungeon_key',
  'dungeon_platform',
  'dungeon_window',
  'fence1',
  'fireplace1',
  'house1',
  'house2',
  'house3',
  'interior6',
  'interior_door1',
  'interior_door2',
  'kitchen1',
  'pillar',
  'rocks1',
  'rocks2',
  'rocks3',
  'rocks4',
  'rocks5',
  'rocks6',
  'rug1',
  'rug2',
  'rug3',
  'rug4',
  'rug5',
  'rug6',
  'rug7',
  'rug8',
  'stone_floor',
  'stone_stairs',
  'stone_wall',
  'submerged_rock1',
  'table1',
  'table2',
  'tree1',
  'wall_torch'
];

type TextureSelection = {
  textureName: string;
  sourceRect?: SourceRect;
  scaleX?: number;
  scaleY?: number;
  zOffsetOverride?: number;
};

export class TextureEditorState extends EditorState {
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedTexture: TextureSelection | null = null;
  private textureButtons: Phaser.GameObjects.Container[] = [];
  private clearButton!: Phaser.GameObjects.Text;
  private justClickedUI = false;
  private currentPage = 0;
  private leftArrow!: Phaser.GameObjects.Text;
  private rightArrow!: Phaser.GameObjects.Text;
  private spritesheetPanel: Phaser.GameObjects.GameObject[] = [];
  private activeSpritesheetDef: SpritesheetDefinition | null = null;

  onEnter(): void {
    this.buttons.push(this.createBackButton());
    this.ensureSpritesheetFrames();
    this.renderPage();
    this.scene.input.on('pointerdown', this.handleClick, this);
  }

  private ensureSpritesheetFrames(): void {
    const gameScene = this.scene.scene.get('game');
    for (const sheet of SPRITESHEET_TEXTURES) {
      if (!gameScene.textures.exists(sheet.textureKey)) continue;
      const texture = gameScene.textures.get(sheet.textureKey);
      for (const sprite of sheet.sprites) {
        const { sourceRect: r } = sprite;
        const frameName = `${sheet.textureKey}_${r.x}_${r.y}_${r.width}_${r.height}`;
        if (!texture.has(frameName)) {
          texture.add(frameName, 0, r.x, r.y, r.width, r.height);
        }
      }
    }
  }

  private renderPage(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.textureButtons.forEach(btn => btn.destroy());
    this.textureButtons = [];
    if (this.clearButton) this.clearButton.destroy();
    if (this.leftArrow) this.leftArrow.destroy();
    if (this.rightArrow) this.rightArrow.destroy();

    const panelStartX = width - 200;
    const panelY = 80;
    const buttonHeight = 60;
    const maxButtonsPerColumn = Math.floor((height - panelY - 150) / buttonHeight);
    const COLUMNS = 3;

    // Build combined list: regular textures + spritesheet entries
    const allEntries: Array<{ label: string; textureName: string; isSheet: boolean }> = [
      ...AVAILABLE_TEXTURES.map(t => ({ label: t, textureName: t, isSheet: false })),
      ...SPRITESHEET_TEXTURES.map(s => ({ label: `📋 ${s.textureKey}`, textureName: s.textureKey, isSheet: true })),
    ];

    const TEXTURES_PER_PAGE = maxButtonsPerColumn * COLUMNS;
    const startIndex = this.currentPage * TEXTURES_PER_PAGE;
    const endIndex = Math.min(startIndex + TEXTURES_PER_PAGE, allEntries.length);
    const pageEntries = allEntries.slice(startIndex, endIndex);

    pageEntries.forEach((entry, index) => {
      const col = Math.floor(index / maxButtonsPerColumn);
      const row = index % maxButtonsPerColumn;
      const buttonX = panelStartX - (2 - col) * 200;
      const buttonY = panelY + row * buttonHeight;

      if (entry.isSheet) {
        const container = this.createSpritesheetButton(buttonX, buttonY, entry);
        this.textureButtons.push(container);
      } else {
        const container = this.createTextureButton(buttonX, buttonY, entry.textureName);
        this.textureButtons.push(container);
      }
    });

    // Clear button
    const clearY = height - 100;
    this.clearButton = this.scene.add.text(panelStartX, clearY, 'Clear', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 15, y: 8 }
    });
    this.clearButton.setOrigin(0.5);
    this.clearButton.setScrollFactor(0);
    this.clearButton.setInteractive({ useHandCursor: true });
    this.clearButton.setDepth(Depth.editor);
    this.buttons.push(this.clearButton);

    this.clearButton.on('pointerdown', () => {
      this.justClickedUI = true;
      this.selectedTexture = null;
      this.closeSpritesheetPanel();
      this.updateSelection();
    });

    // Pagination
    const totalPages = Math.ceil(allEntries.length / TEXTURES_PER_PAGE);
    if (totalPages > 1) {
      const arrowY = height - 50;
      const arrowX = width - 200;

      this.leftArrow = this.scene.add.text(arrowX - 50, arrowY, '<', {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: this.currentPage > 0 ? '#333333' : '#666666',
        padding: { x: 10, y: 5 }
      });
      this.leftArrow.setOrigin(0.5);
      this.leftArrow.setScrollFactor(0);
      this.leftArrow.setDepth(Depth.editor);
      this.buttons.push(this.leftArrow);

      if (this.currentPage > 0) {
        this.leftArrow.setInteractive({ useHandCursor: true });
        this.leftArrow.on('pointerdown', () => {
          this.justClickedUI = true;
          this.currentPage--;
          this.renderPage();
        });
      }

      this.rightArrow = this.scene.add.text(arrowX + 50, arrowY, '>', {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: this.currentPage < totalPages - 1 ? '#333333' : '#666666',
        padding: { x: 10, y: 5 }
      });
      this.rightArrow.setOrigin(0.5);
      this.rightArrow.setScrollFactor(0);
      this.rightArrow.setDepth(Depth.editor);
      this.buttons.push(this.rightArrow);

      if (this.currentPage < totalPages - 1) {
        this.rightArrow.setInteractive({ useHandCursor: true });
        this.rightArrow.on('pointerdown', () => {
          this.justClickedUI = true;
          this.currentPage++;
          this.renderPage();
        });
      }

      const pageText = this.scene.add.text(arrowX, arrowY, `${this.currentPage + 1}/${totalPages}`, {
        fontSize: '16px',
        color: '#ffffff'
      });
      pageText.setOrigin(0.5);
      pageText.setScrollFactor(0);
      pageText.setDepth(Depth.editor);
      this.buttons.push(pageText);
    }
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handleClick, this);
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
    this.textureButtons.forEach(container => container.destroy());
    this.textureButtons = [];
    this.closeSpritesheetPanel();
  }

  private createTextureButton(x: number, y: number, textureName: string): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(Depth.editor);

    const bg = this.scene.add.rectangle(0, 0, 180, 55, 0x333333);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    const gameScene = this.scene.scene.get('game');
    const preview = gameScene.add.image(0, -8, textureName);
    preview.setDisplaySize(40, 40);
    preview.setScrollFactor(0);
    container.add(preview);

    const label = this.scene.add.text(0, 22, textureName, {
      fontSize: '10px',
      color: '#ffffff'
    });
    label.setOrigin(0.5);
    container.add(label);

    bg.on('pointerover', () => bg.setFillStyle(0x555555));
    bg.on('pointerout', () => {
      const isSelected = this.selectedTexture?.textureName === textureName && !this.selectedTexture?.sourceRect;
      bg.setFillStyle(isSelected ? 0x00ff00 : 0x333333);
    });
    bg.on('pointerdown', () => {
      this.justClickedUI = true;
      this.selectedTexture = { textureName };
      this.closeSpritesheetPanel();
      this.updateSelection();
    });

    container.setData('bg', bg);
    container.setData('textureName', textureName);
    container.setData('isSheet', false);

    return container;
  }

  private createSpritesheetButton(x: number, y: number, entry: { label: string; textureName: string }): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(Depth.editor);

    const bg = this.scene.add.rectangle(0, 0, 180, 55, 0x224422);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    const label = this.scene.add.text(0, 0, entry.label, {
      fontSize: '12px',
      color: '#88ff88'
    });
    label.setOrigin(0.5);
    container.add(label);

    bg.on('pointerover', () => bg.setFillStyle(0x336633));
    bg.on('pointerout', () => {
      bg.setFillStyle(this.activeSpritesheetDef?.textureKey === entry.textureName ? 0x00aa00 : 0x224422);
    });
    bg.on('pointerdown', () => {
      this.justClickedUI = true;
      const def = SPRITESHEET_TEXTURES.find(s => s.textureKey === entry.textureName);
      if (def) {
        this.openSpritesheetPanel(def);
      }
    });

    container.setData('bg', bg);
    container.setData('textureName', entry.textureName);
    container.setData('isSheet', true);

    return container;
  }

  private openSpritesheetPanel(def: SpritesheetDefinition): void {
    this.closeSpritesheetPanel();
    this.activeSpritesheetDef = def;

    const PANEL_X = 20;
    const PANEL_Y = 80;
    const SPRITE_SIZE = 80;
    const PADDING = 10;
    const COLS = 4;
    const rows = Math.ceil(def.sprites.length / COLS);
    const panelWidth = COLS * (SPRITE_SIZE + PADDING) + PADDING;
    const panelHeight = rows * (SPRITE_SIZE + PADDING + 16) + PADDING + 30;

    // Panel background
    const panelBg = this.scene.add.rectangle(PANEL_X, PANEL_Y, panelWidth, panelHeight, 0x111111, 0.95);
    panelBg.setOrigin(0, 0);
    panelBg.setScrollFactor(0);
    panelBg.setDepth(Depth.editor);
    panelBg.setInteractive();
    this.spritesheetPanel.push(panelBg);

    // Title
    const title = this.scene.add.text(PANEL_X + panelWidth / 2, PANEL_Y + 12, def.textureKey, {
      fontSize: '14px',
      color: '#88ff88'
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(Depth.editor);
    this.spritesheetPanel.push(title);

    def.sprites.forEach((sprite: SpritesheetSprite, index: number) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const sx = PANEL_X + PADDING + col * (SPRITE_SIZE + PADDING) + SPRITE_SIZE / 2;
      const sy = PANEL_Y + 30 + PADDING + row * (SPRITE_SIZE + PADDING + 16) + SPRITE_SIZE / 2;

      const { sourceRect: r } = sprite;
      const frameName = `${def.textureKey}_${r.x}_${r.y}_${r.width}_${r.height}`;

      // Sprite button background
      const spriteBg = this.scene.add.rectangle(sx, sy, SPRITE_SIZE, SPRITE_SIZE, 0x333333);
      spriteBg.setScrollFactor(0);
      spriteBg.setDepth(Depth.editor);
      spriteBg.setInteractive({ useHandCursor: true });
      this.spritesheetPanel.push(spriteBg);

      // Sprite preview - use editor scene (game scene is paused)
      const preview = this.scene.add.image(sx, sy, def.textureKey, frameName);
      const aspect = r.width / r.height;
      const fitSize = SPRITE_SIZE - 8;
      if (aspect > 1) {
        preview.setDisplaySize(fitSize, fitSize / aspect);
      } else {
        preview.setDisplaySize(fitSize * aspect, fitSize);
      }
      preview.setScrollFactor(0);
      preview.setDepth(Depth.editor + 1);
      this.spritesheetPanel.push(preview);

      // Label
      const spriteLabel = this.scene.add.text(sx, sy + SPRITE_SIZE / 2 + 8, sprite.name, {
        fontSize: '9px',
        color: '#aaaaaa'
      });
      spriteLabel.setOrigin(0.5);
      spriteLabel.setScrollFactor(0);
      spriteLabel.setDepth(Depth.editor);
      this.spritesheetPanel.push(spriteLabel);

      spriteBg.on('pointerover', () => spriteBg.setFillStyle(0x555555));
      spriteBg.on('pointerout', () => {
        const isSelected = this.selectedTexture?.textureName === def.textureKey &&
          this.selectedTexture?.sourceRect?.x === r.x && this.selectedTexture?.sourceRect?.y === r.y;
        spriteBg.setFillStyle(isSelected ? 0x00ff00 : 0x333333);
      });
      spriteBg.on('pointerdown', () => {
        this.justClickedUI = true;
        this.selectedTexture = { textureName: def.textureKey, sourceRect: r, scaleX: sprite.scaleX, scaleY: sprite.scaleY, zOffsetOverride: sprite.zOffsetOverride };
        this.updateSelection();
        this.updateSpritesheetPanelSelection(def);
      });
    });

    this.updateSelection();
  }

  private updateSpritesheetPanelSelection(def: SpritesheetDefinition): void {
    // Update spritesheet panel button highlights
    let spriteIndex = 0;
    for (const obj of this.spritesheetPanel) {
      if (obj instanceof Phaser.GameObjects.Rectangle && obj !== this.spritesheetPanel[0]) {
        if (spriteIndex < def.sprites.length) {
          const r = def.sprites[spriteIndex].sourceRect;
          const isSelected = this.selectedTexture?.textureName === def.textureKey &&
            this.selectedTexture?.sourceRect?.x === r.x && this.selectedTexture?.sourceRect?.y === r.y;
          obj.setFillStyle(isSelected ? 0x00ff00 : 0x333333);
          spriteIndex++;
        }
      }
    }
  }

  private closeSpritesheetPanel(): void {
    this.spritesheetPanel.forEach(obj => obj.destroy());
    this.spritesheetPanel = [];
    this.activeSpritesheetDef = null;
  }

  private updateSelection(): void {
    this.textureButtons.forEach(container => {
      const bg = container.getData('bg') as Phaser.GameObjects.Rectangle;
      const textureName = container.getData('textureName') as string;
      const isSheet = container.getData('isSheet') as boolean;

      if (isSheet) {
        bg.setFillStyle(this.activeSpritesheetDef?.textureKey === textureName ? 0x00aa00 : 0x224422);
      } else {
        const isSelected = this.selectedTexture?.textureName === textureName && !this.selectedTexture?.sourceRect;
        bg.setFillStyle(isSelected ? 0x00ff00 : 0x333333);
      }
    });

    this.clearButton.setBackgroundColor(this.selectedTexture === null ? '#00ff00' : '#333333');
  }

  private isClickInsideSpritesheetPanel(pointer: Phaser.Input.Pointer): boolean {
    if (this.spritesheetPanel.length === 0) return false;
    const panelBg = this.spritesheetPanel[0] as Phaser.GameObjects.Rectangle;
    return pointer.x >= panelBg.x && pointer.x <= panelBg.x + panelBg.width &&
           pointer.y >= panelBg.y && pointer.y <= panelBg.y + panelBg.height;
  }

  private isClickOnUI(pointer: Phaser.Input.Pointer, gameScene: GameScene): boolean {
    const hitObjects = gameScene.input.hitTestPointer(pointer);
    for (const obj of hitObjects) {
      const gameObj = obj as unknown as { depth?: number };
      if (gameObj.depth !== undefined && gameObj.depth >= 1000) return true;
    }
    return false;
  }

  private placeTexture(col: number, row: number): void {
    if (this.selectedTexture === null) {
      this.scene.setCellData(col, row, { backgroundTexture: '' });
      this.clearCellBackgroundTextureConfig(col, row);
    } else if (this.selectedTexture.sourceRect) {
      this.scene.setCellData(col, row, { backgroundTexture: this.selectedTexture.textureName });
      const config: BackgroundTextureConfig = {
        image: this.selectedTexture.textureName,
        sourceRect: this.selectedTexture.sourceRect,
      };
      const sx = this.selectedTexture.scaleX ?? 1;
      const sy = this.selectedTexture.scaleY ?? 1;
      if (sx !== 1 || sy !== 1) {
        config.transformOverride = { scaleX: sx, scaleY: sy, offsetX: 0, offsetY: 0 };
      }
      if (this.selectedTexture.zOffsetOverride !== undefined) {
        config.zOffsetOverride = this.selectedTexture.zOffsetOverride;
      }
      this.setCellBackgroundTextureConfig(col, row, config);
    } else {
      this.scene.setCellData(col, row, { backgroundTexture: this.selectedTexture.textureName });
      this.clearCellBackgroundTextureConfig(col, row);
    }
    this.refreshRenderedSprites();
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    if (this.justClickedUI) {
      this.justClickedUI = false;
      return;
    }

    const gameScene = this.scene.scene.get('game') as GameScene;
    if (this.isClickOnUI(pointer, gameScene)) return;
    if (this.isClickInsideSpritesheetPanel(pointer)) return;

    const camera = gameScene.cameras.main;
    const grid = this.scene.getGrid();
    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;
    const cell = grid.worldToCell(worldX, worldY);

    if (cell.col >= 0 && cell.col < grid.width && cell.row >= 0 && cell.row < grid.height) {
      this.placeTexture(cell.col, cell.row);
    }
  }

  private setCellBackgroundTextureConfig(col: number, row: number, config: BackgroundTextureConfig): void {
    const gameScene = this.scene.scene.get('game') as GameScene;
    const levelData = gameScene.getLevelData();
    let cellData = levelData.cells.find(c => c.col === col && c.row === row);
    if (!cellData) {
      cellData = { col, row };
      levelData.cells.push(cellData);
    }
    cellData.backgroundTexture = config;
  }

  private clearCellBackgroundTextureConfig(col: number, row: number): void {
    const gameScene = this.scene.scene.get('game') as GameScene;
    const levelData = gameScene.getLevelData();
    const cellData = levelData.cells.find(c => c.col === col && c.row === row);
    if (cellData) {
      cellData.backgroundTexture = undefined;
    }
  }

  private refreshRenderedSprites(): void {
    const gameScene = this.scene.scene.get('game') as GameScene;
    gameScene.getSceneRenderer().refreshBackgroundTextureSprites(this.scene.getGrid(), gameScene.getLevelData());
  }
}
