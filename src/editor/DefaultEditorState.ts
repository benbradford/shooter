import type { IState } from '../utils/state/IState';
import { EditorState } from './EditorState';
import type EditorScene from '../EditorScene';

export class DefaultEditorState extends EditorState {
  private saveButton!: Phaser.GameObjects.Text;
  private exitButton!: Phaser.GameObjects.Text;
  private gridButton!: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Text[] = [];

  constructor(scene: EditorScene) {
    super(scene);
  }

  onEnter(_prevState?: IState): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const buttonY = height - 50;
    const buttonSpacing = 120;
    const centerX = width / 2;

    // Save button
    this.saveButton = this.scene.add.text(centerX - buttonSpacing * 1.5, buttonY, 'Save', {
      fontSize: '24px',
      color: '#666666',
      backgroundColor: '#222222',
      padding: { x: 20, y: 10 }
    });
    this.saveButton.setOrigin(0.5);
    this.saveButton.setScrollFactor(0);
    this.saveButton.setDepth(1000);
    this.buttons.push(this.saveButton);

    // Exit button
    this.exitButton = this.scene.add.text(centerX - buttonSpacing * 0.5, buttonY, 'Exit', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    this.exitButton.setOrigin(0.5);
    this.exitButton.setScrollFactor(0);
    this.exitButton.setInteractive({ useHandCursor: true });
    this.exitButton.setDepth(1000);
    this.buttons.push(this.exitButton);

    this.exitButton.on('pointerover', () => {
      this.exitButton.setBackgroundColor('#555555');
    });
    this.exitButton.on('pointerout', () => {
      this.exitButton.setBackgroundColor('#333333');
    });
    this.exitButton.on('pointerdown', () => {
      this.scene.exitEditor();
    });

    // Grid button
    this.gridButton = this.scene.add.text(centerX + buttonSpacing * 0.5, buttonY, 'Grid', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    this.gridButton.setOrigin(0.5);
    this.gridButton.setScrollFactor(0);
    this.gridButton.setInteractive({ useHandCursor: true });
    this.gridButton.setDepth(1000);
    this.buttons.push(this.gridButton);

    this.gridButton.on('pointerover', () => {
      this.gridButton.setBackgroundColor('#555555');
    });
    this.gridButton.on('pointerout', () => {
      this.gridButton.setBackgroundColor('#333333');
    });
    this.gridButton.on('pointerdown', () => {
      this.scene.enterGridMode();
    });

    // Resize button
    const resizeButton = this.scene.add.text(centerX + buttonSpacing * 1.5, buttonY, 'Resize', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    resizeButton.setOrigin(0.5);
    resizeButton.setScrollFactor(0);
    resizeButton.setInteractive({ useHandCursor: true });
    resizeButton.setDepth(1000);
    this.buttons.push(resizeButton);

    resizeButton.on('pointerover', () => {
      resizeButton.setBackgroundColor('#555555');
    });
    resizeButton.on('pointerout', () => {
      resizeButton.setBackgroundColor('#333333');
    });
    resizeButton.on('pointerdown', () => {
      this.scene.enterResizeMode();
    });
  }

  onExit(_nextState?: IState): void {
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
  }

  onUpdate(_delta: number): void {
    // Update save button state based on changes
    const hasChanges = this.scene.hasUnsavedChanges();
    if (hasChanges) {
      this.saveButton.setColor('#ffffff');
      this.saveButton.setBackgroundColor('#333333');
      if (!this.saveButton.input) {
        this.saveButton.setInteractive({ useHandCursor: true });
        this.saveButton.on('pointerover', () => {
          this.saveButton.setBackgroundColor('#555555');
        });
        this.saveButton.on('pointerout', () => {
          this.saveButton.setBackgroundColor('#333333');
        });
        this.saveButton.on('pointerdown', () => {
          this.scene.saveLevel();
        });
      }
    } else {
      this.saveButton.setColor('#666666');
      this.saveButton.setBackgroundColor('#222222');
      this.saveButton.disableInteractive();
    }
  }
}
