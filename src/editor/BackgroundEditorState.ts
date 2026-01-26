import { EditorState } from './EditorState';
import type GameScene from '../GameScene';
import type { BackgroundConfig } from '../level/LevelLoader';

const DEFAULT_CONFIG: BackgroundConfig = {
  centerColor: '#5a6a5a',
  midColor: '#3a4a3a',
  edgeColor: '#2a3a2a',
  outerColor: '#1a2a1a',
  crackCount: 8,
  circleCount: 100,
  crackColor: '#c8ffc8',
  crackVariation: 20,
  crackThickness: 1,
  crackLength: 30,
  circleColor: '#e0e0e0',
  circleVariation: 30,
  circleThickness: 1
};

export class BackgroundEditorState extends EditorState {
  private config: BackgroundConfig = DEFAULT_CONFIG;
  private buttons: Phaser.GameObjects.Text[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private readonly colorValueTexts: Map<keyof BackgroundConfig, Phaser.GameObjects.Text> = new Map();
  private isInitialized: boolean = false;

  onEnter(): void {
    if (this.isInitialized) {
      this.updateColorDisplays();
    } else {
      const gameScene = this.scene.scene.get('game') as GameScene;
      const levelData = gameScene.getLevelData();
      this.config = { ...DEFAULT_CONFIG, ...levelData.background };
      this.createUI();
      this.isInitialized = true;
    }
  }

  private updateColorDisplays(): void {
    this.colorValueTexts.forEach((text, key) => {
      text.setText(this.config[key] as string);
    });
  }

  private createUI(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const panelX = width - 300;
    const startY = 100;

    const title = this.scene.add.text(panelX, 50, 'Background Editor', {
      fontSize: '24px',
      color: '#ffffff'
    });
    title.setScrollFactor(0);
    title.setDepth(10001);
    this.labels.push(title);

    this.createColorControl('Center', panelX, startY, 'centerColor');
    this.createColorControl('Mid', panelX, startY + 60, 'midColor');
    this.createColorControl('Edge', panelX, startY + 120, 'edgeColor');
    this.createColorControl('Outer', panelX, startY + 180, 'outerColor');
    this.createNumberControl('Cracks', panelX, startY + 240, 'crackCount', 0, 50);
    this.createColorControl('Crack Col', panelX, startY + 300, 'crackColor');
    this.createNumberControl('Crack Var%', panelX, startY + 360, 'crackVariation', 0, 100);
    this.createNumberControl('Crack Thick', panelX, startY + 420, 'crackThickness', 1, 10);
    this.createNumberControl('Crack Len', panelX, startY + 480, 'crackLength', 10, 200);
    this.createNumberControl('Circles', panelX, startY + 540, 'circleCount', 0, 500);
    this.createColorControl('Circle Col', panelX, startY + 600, 'circleColor');
    this.createNumberControl('Circle Var%', panelX, startY + 660, 'circleVariation', 0, 100);
    this.createNumberControl('Circle Thick', panelX, startY + 720, 'circleThickness', 1, 10);

    const backButton = this.scene.add.text(100, height - 50, 'Back', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    backButton.setScrollFactor(0);
    backButton.setDepth(10001);
    backButton.setInteractive();
    backButton.on('pointerdown', () => this.scene.enterDefaultMode());
    this.buttons.push(backButton);

    const applyButton = this.scene.add.text(panelX, height - 50, 'Apply', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#00aa00',
      padding: { x: 20, y: 10 }
    });
    applyButton.setScrollFactor(0);
    applyButton.setDepth(10001);
    applyButton.setInteractive();
    applyButton.on('pointerdown', () => this.applyChanges());
    this.buttons.push(applyButton);
  }

  private createColorControl(label: string, x: number, y: number, key: keyof BackgroundConfig): void {
    const labelText = this.scene.add.text(x, y, `${label}:`, {
      fontSize: '18px',
      color: '#ffffff'
    });
    labelText.setScrollFactor(0);
    labelText.setDepth(10001);
    this.labels.push(labelText);

    const valueText = this.scene.add.text(x, y + 25, this.config[key] as string, {
      fontSize: '16px',
      color: '#aaaaaa'
    });
    valueText.setScrollFactor(0);
    valueText.setDepth(10001);
    this.labels.push(valueText);
    this.colorValueTexts.set(key, valueText);

    const editButton = this.scene.add.text(x + 150, y + 20, 'Edit', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#0066cc',
      padding: { x: 10, y: 5 }
    });
    editButton.setScrollFactor(0);
    editButton.setDepth(10001);
    editButton.setInteractive();
    editButton.on('pointerdown', () => {
      this.scene.enterColorPickerMode({
        colorKey: key,
        currentColor: this.config[key] as string,
        onColorSelected: (color: string) => {
          this.config[key] = color as never;
          valueText.setText(color);
          this.applyChanges();
        }
      });
    });
    this.buttons.push(editButton);
  }

  private createNumberControl(label: string, x: number, y: number, key: keyof BackgroundConfig, min: number, max: number): void {
    const labelText = this.scene.add.text(x, y, `${label}: ${this.config[key]}`, {
      fontSize: '18px',
      color: '#ffffff'
    });
    labelText.setScrollFactor(0);
    labelText.setDepth(10001);
    this.labels.push(labelText);

    const minusButton = this.scene.add.text(x, y + 25, '-10', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#aa0000',
      padding: { x: 10, y: 5 }
    });
    minusButton.setScrollFactor(0);
    minusButton.setDepth(10001);
    minusButton.setInteractive();
    minusButton.on('pointerdown', () => {
      const current = this.config[key] as number;
      this.config[key] = Math.max(min, current - 10) as never;
      labelText.setText(`${label}: ${this.config[key]}`);
    });
    this.buttons.push(minusButton);

    const plusButton = this.scene.add.text(x + 60, y + 25, '+10', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#00aa00',
      padding: { x: 10, y: 5 }
    });
    plusButton.setScrollFactor(0);
    plusButton.setDepth(10001);
    plusButton.setInteractive();
    plusButton.on('pointerdown', () => {
      const current = this.config[key] as number;
      this.config[key] = Math.min(max, current + 10) as never;
      labelText.setText(`${label}: ${this.config[key]}`);
    });
    this.buttons.push(plusButton);
  }

  private applyChanges(): void {
    const gameScene = this.scene.scene.get('game') as GameScene;
    gameScene.updateBackground(this.config);
  }

  onExit(): void {
    // Don't destroy UI when going to color picker, only when truly exiting
    // We'll reset on final exit from editor
  }

  destroy(): void {
    this.buttons.forEach(button => button.destroy());
    this.labels.forEach(label => label.destroy());
    this.buttons = [];
    this.labels = [];
    this.colorValueTexts.clear();
    this.isInitialized = false;
  }
}
