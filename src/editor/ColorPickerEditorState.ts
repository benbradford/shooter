import { EditorState } from './EditorState';
import type { BackgroundConfig } from '../level/LevelLoader';

type ColorPickerProps = {
  colorKey: keyof BackgroundConfig;
  currentColor: string;
  onColorSelected: (color: string) => void;
}

export class ColorPickerEditorState extends EditorState {
  private props?: ColorPickerProps;
  private canvas?: Phaser.GameObjects.RenderTexture;
  private brightnessSlider?: Phaser.GameObjects.RenderTexture;
  private previewCircle?: Phaser.GameObjects.Arc;
  private hexText?: Phaser.GameObjects.Text;
  private selectedColor: string = '#ffffff';
  private selectedHue: number = 0;
  private selectedSaturation: number = 0;
  private selectedLightness: number = 50;
  private buttons: Phaser.GameObjects.Text[] = [];

  onEnter(props?: unknown): void {
    this.props = (props as { data?: ColorPickerProps })?.data;
    this.selectedColor = this.props?.currentColor || '#ffffff';
    this.createColorWheel();
  }

  private createColorWheel(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 150;

    // Brightness slider
    const sliderX = centerX - radius - 60;
    const sliderHeight = radius * 2;
    const sliderWidth = 30;
    
    const brightnessCanvas = this.scene.add.renderTexture(sliderX, centerY, sliderWidth, sliderHeight);
    brightnessCanvas.setScrollFactor(0);
    brightnessCanvas.setDepth(10002);
    this.brightnessSlider = brightnessCanvas;

    const sliderGraphics = this.scene.add.graphics();
    for (let y = 0; y < sliderHeight; y++) {
      const lightness = 100 - (y / sliderHeight) * 100;
      const color = this.hslToRgb(0, 0, lightness);
      sliderGraphics.fillStyle(color, 1);
      sliderGraphics.fillRect(0, y, sliderWidth, 1);
    }
    brightnessCanvas.draw(sliderGraphics, 0, 0);
    sliderGraphics.destroy();

    brightnessCanvas.setInteractive();
    brightnessCanvas.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localY = pointer.y - (centerY - sliderHeight / 2);
      this.selectedLightness = Math.max(0, Math.min(100, 100 - (localY / sliderHeight) * 100));
      this.updateColorFromHSL();
    });

    // Color wheel
    const canvas = this.scene.add.renderTexture(centerX, centerY, radius * 2, radius * 2);
    canvas.setScrollFactor(0);
    canvas.setDepth(10002);
    this.canvas = canvas;

    const graphics = this.scene.add.graphics();
    
    for (let angle = 0; angle < 360; angle += 1) {
      for (let r = 0; r < radius; r += 1) {
        const hue = angle;
        const saturation = (r / radius) * 100;
        const lightness = 50;
        const color = this.hslToRgb(hue, saturation, lightness);
        
        graphics.fillStyle(color, 1);
        const rad = (angle * Math.PI) / 180;
        const x = radius + Math.cos(rad) * r;
        const y = radius + Math.sin(rad) * r;
        graphics.fillCircle(x, y, 2);
      }
    }
    
    canvas.draw(graphics, 0, 0);
    graphics.destroy();

    canvas.setInteractive();
    canvas.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - (centerX - radius);
      const localY = pointer.y - (centerY - radius);
      const dx = localX - radius;
      const dy = localY - radius;
      const distance = Math.hypot(dx, dy);
      
      if (distance <= radius) {
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        this.selectedHue = (angle + 360) % 360;
        this.selectedSaturation = (distance / radius) * 100;
        this.updateColorFromHSL();
      }
    });

    this.previewCircle = this.scene.add.circle(centerX, centerY + radius + 60, 30, Number.parseInt(this.selectedColor.replace('#', '0x')));
    this.previewCircle.setScrollFactor(0);
    this.previewCircle.setDepth(10002);

    this.hexText = this.scene.add.text(centerX, centerY + radius + 110, this.selectedColor, {
      fontSize: '24px',
      color: '#ffffff'
    });
    this.hexText.setOrigin(0.5);
    this.hexText.setScrollFactor(0);
    this.hexText.setDepth(10002);

    const selectButton = this.scene.add.text(centerX - 60, height - 100, 'Select', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#00aa00',
      padding: { x: 20, y: 10 }
    });
    selectButton.setScrollFactor(0);
    selectButton.setDepth(10002);
    selectButton.setInteractive();
    selectButton.on('pointerdown', () => {
      if (this.props?.onColorSelected) {
        this.props.onColorSelected(this.selectedColor);
      }
      this.scene.enterBackgroundMode();
    });
    this.buttons.push(selectButton);

    const cancelButton = this.scene.add.text(centerX + 60, height - 100, 'Cancel', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#aa0000',
      padding: { x: 20, y: 10 }
    });
    cancelButton.setScrollFactor(0);
    cancelButton.setDepth(10002);
    cancelButton.setInteractive();
    cancelButton.on('pointerdown', () => {
      this.scene.enterBackgroundMode();
    });
    this.buttons.push(cancelButton);
  }

  private updateColorFromHSL(): void {
    const color = this.hslToRgb(this.selectedHue, this.selectedSaturation, this.selectedLightness);
    this.selectedColor = this.rgbToHex(color);
    this.updatePreview();
  }

  private updatePreview(): void {
    if (this.previewCircle) {
      this.previewCircle.setFillStyle(Number.parseInt(this.selectedColor.replace('#', '0x')));
    }
    if (this.hexText) {
      this.hexText.setText(this.selectedColor);
    }
  }

  private hslToRgb(h: number, s: number, l: number): number {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const r = Math.round(255 * f(0));
    const g = Math.round(255 * f(8));
    const b = Math.round(255 * f(4));
    return (r << 16) | (g << 8) | b;
  }

  private rgbToHex(rgb: number): string {
    return '#' + rgb.toString(16).padStart(6, '0');
  }

  onExit(): void {
    this.canvas?.destroy();
    this.brightnessSlider?.destroy();
    this.previewCircle?.destroy();
    this.hexText?.destroy();
    this.buttons.forEach(button => button.destroy());
    this.buttons = [];
  }

}
