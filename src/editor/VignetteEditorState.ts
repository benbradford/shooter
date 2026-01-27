import { EditorState } from './EditorState';
import type GameScene from '../GameScene';
import Phaser from 'phaser';

const ALPHA_STEP = 0.05;
const TINT_PRESETS = [
  { name: 'Black', color: 0x000000 },
  { name: 'Red', color: 0xff0000 },
  { name: 'Blue', color: 0x0000ff },
  { name: 'Purple', color: 0x440044 },
  { name: 'Brown', color: 0x442200 },
  { name: 'Green', color: 0x004400 },
];
const BLEND_MODES = [
  { name: 'Multiply', mode: Phaser.BlendModes.MULTIPLY },
  { name: 'Screen', mode: Phaser.BlendModes.SCREEN },
  { name: 'Overlay', mode: Phaser.BlendModes.OVERLAY },
  { name: 'Add', mode: Phaser.BlendModes.ADD },
];

export class VignetteEditorState extends EditorState {
  private alpha: number = 0.6;
  private tint: number = 0x000000;
  private blendMode: number = Phaser.BlendModes.MULTIPLY;
  private alphaText!: Phaser.GameObjects.Text;
  private tintText!: Phaser.GameObjects.Text;
  private blendModeText!: Phaser.GameObjects.Text;
  private previewVignette!: Phaser.GameObjects.Image;
  private buttons: Phaser.GameObjects.Text[] = [];

  onEnter(): void {
    const gameScene = this.scene.scene.get('game') as GameScene;
    const level = gameScene.getLevelData();

    this.alpha = level.vignette?.alpha ?? 0.6;
    this.tint = level.vignette?.tint ?? 0x000000;
    this.blendMode = level.vignette?.blendMode ?? Phaser.BlendModes.MULTIPLY;

    const height = this.scene.cameras.main.height;
    const width = this.scene.cameras.main.width;

    this.scene.add.text(width / 2, 50, 'Vignette Settings', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(1001);

    // Alpha controls
    const alphaY = 120;
    this.scene.add.text(width / 2, alphaY, 'Alpha (Opacity)', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(1001);

    this.alphaText = this.scene.add.text(width / 2, alphaY + 40, `${this.alpha.toFixed(2)}`, {
      fontSize: '32px',
      color: '#ffff00'
    }).setOrigin(0.5).setDepth(1001);

    const alphaMinusBtn = this.createButton(width / 2 - 100, alphaY + 90, '-', () => {
      this.alpha = Math.max(0, this.alpha - ALPHA_STEP);
      this.updatePreview();
    });
    this.buttons.push(alphaMinusBtn);

    const alphaPlusBtn = this.createButton(width / 2 + 100, alphaY + 90, '+', () => {
      this.alpha = Math.min(1, this.alpha + ALPHA_STEP);
      this.updatePreview();
    });
    this.buttons.push(alphaPlusBtn);

    // Tint presets
    const tintY = 230;
    this.scene.add.text(width / 2, tintY, 'Tint Color', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(1001);

    this.tintText = this.scene.add.text(width / 2, tintY + 40, `0x${this.tint.toString(16).padStart(6, '0')}`, {
      fontSize: '24px',
      color: '#ffff00'
    }).setOrigin(0.5).setDepth(1001);

    let btnX = 100;
    let btnY = tintY + 80;
    for (const preset of TINT_PRESETS) {
      const btn = this.createButton(btnX, btnY, preset.name, () => {
        this.tint = preset.color;
        this.updatePreview();
      });
      this.buttons.push(btn);
      btnX += 180;
      if (btnX > width - 100) {
        btnX = 100;
      }
    }

    // Blend mode
    const blendY = 340;
    this.scene.add.text(width / 2, blendY, 'Blend Mode', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(1001);

    this.blendModeText = this.scene.add.text(width / 2, blendY + 40, this.getBlendModeName(), {
      fontSize: '24px',
      color: '#ffff00'
    }).setOrigin(0.5).setDepth(1001);

    btnX = 250;
    btnY = blendY + 80;
    for (const blend of BLEND_MODES) {
      const btn = this.createButton(btnX, btnY, blend.name, () => {
        this.blendMode = blend.mode;
        this.updatePreview();
      });
      this.buttons.push(btn);
      btnX += 220;
    }

    // Back button
    this.buttons.push(this.createBackButton());

    // Preview vignette
    this.previewVignette = this.scene.add.image(0, 0, 'vignette');
    this.previewVignette.setOrigin(0, 0);
    this.previewVignette.setScrollFactor(0);
    this.previewVignette.setDisplaySize(width, height);
    this.previewVignette.setDepth(1000);
    this.updatePreview();
  }

  onExit(): void {
    this.alphaText.destroy();
    this.tintText.destroy();
    this.blendModeText.destroy();
    this.previewVignette.destroy();
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];

    const gameScene = this.scene.scene.get('game') as GameScene;
    const level = gameScene.getLevelData();
    level.vignette = {
      alpha: this.alpha,
      tint: this.tint,
      blendMode: this.blendMode
    };

    // Update the actual game vignette immediately
    gameScene.updateVignette();
  }

  private createButton(x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, text, {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    btn.setOrigin(0.5);
    btn.setScrollFactor(0);
    btn.setInteractive({ useHandCursor: true });
    btn.setDepth(10001);

    btn.on('pointerover', () => {
      btn.setBackgroundColor('#555555');
    });
    btn.on('pointerout', () => {
      btn.setBackgroundColor('#333333');
    });
    btn.on('pointerdown', onClick);

    return btn;
  }

  private getBlendModeName(): string {
    const blend = BLEND_MODES.find(b => b.mode === this.blendMode);
    return blend?.name ?? 'Multiply';
  }

  private updatePreview(): void {
    this.alphaText.setText(`${this.alpha.toFixed(2)}`);
    this.tintText.setText(`0x${this.tint.toString(16).padStart(6, '0')}`);
    this.blendModeText.setText(this.getBlendModeName());
    this.previewVignette.setAlpha(this.alpha);
    this.previewVignette.setTint(this.tint);
    this.previewVignette.setBlendMode(this.blendMode);
  }
}
