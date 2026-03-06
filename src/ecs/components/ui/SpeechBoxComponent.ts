import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { Depth } from '../../../constants/DepthConstants';

const CORNER_RADIUS_PX = 10;
const BOX_ALPHA = 0.8;
const BOX_TOP_PERCENT = 0.55;
const BOX_BOTTOM_PERCENT = 0.95;
const BOX_WIDTH_PERCENT = 0.6;
const PADDING_PX = 20;
const NAME_FONT_SIZE_PX = 24;
const TEXT_FONT_SIZE_PX = 20;
const TWEEN_DURATION_MS = 300;
const PUNCTUATION_DELAY_MS = 300;
const SKIP_SPEED_MS = 10;

const COLOR_MAP: Record<string, number> = {
  'blue': 0x4169E1,
  'black': 0x2F2F2F,
  'purple': 0x9370DB,
  'gold': 0xFFD700,
  'red': 0xFF0000,
  'green': 0x00FF00
};

const BORDER_COLOR_MAP: Record<string, number> = {
  'blue': 0x00008B,
  'black': 0x000000,
  'purple': 0x4B0082,
  'gold': 0xB8860B,
  'red': 0x8B0000,
  'green': 0x006400
};

type TextSegment = {
  text: string;
  color: string;
};

export class SpeechBoxComponent implements Component {
  entity!: Entity;
  private graphics!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private textObjects: Phaser.GameObjects.Text[] = [];
  private boxX = 0;
  private boxY = 0;
  private boxWidth = 0;
  private boxHeight = 0;
  private segments: TextSegment[] = [];
  private charSpeed = 50;
  private isDismissed = false;
  private isSkipping = false;
  private dismissResolve: (() => void) | null = null;
  private continueIndicator?: Phaser.GameObjects.Text;
  
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly backgroundColor: string,
    private readonly textColor: string
  ) {}
  
  async show(name: string, text: string, talkSpeed: number, timeout: number): Promise<void> {
    this.charSpeed = talkSpeed;
    this.isDismissed = false;
    this.isSkipping = false;
    
    const camera = this.scene.cameras.main;
    const viewWidth = camera.width;
    const viewHeight = camera.height;
    
    this.boxWidth = viewWidth * BOX_WIDTH_PERCENT;
    this.boxHeight = viewHeight * (BOX_BOTTOM_PERCENT - BOX_TOP_PERCENT);
    this.boxX = (viewWidth - this.boxWidth) / 2;
    this.boxY = viewHeight * BOX_TOP_PERCENT;
    
    this.segments = this.parseColorTags(text);
    
    this.createBox();
    await this.tweenIn();
    
    this.createNameText(name);
    this.createTextObjects();
    this.setupInputListeners();
    
    await this.animateText();
    
    // Show continue indicator
    this.showContinueIndicator();
    
    // Text complete - wait for timeout or input to dismiss
    await this.waitForDismiss(timeout);
    
    this.cleanupInputListeners();
    await this.tweenOut();
    
    this.destroy();
  }
  
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private onInputBound?: () => void;
  
  private setupInputListeners(): void {
    this.spaceKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.onInputBound = () => this.onInput();
    this.spaceKey?.on('down', this.onInputBound);
    this.scene.input.on('pointerdown', this.onInputBound);
  }
  
  private cleanupInputListeners(): void {
    if (this.spaceKey && this.onInputBound) {
      this.spaceKey.off('down', this.onInputBound);
      this.scene.input.off('pointerdown', this.onInputBound);
    }
  }
  
  private showContinueIndicator(): void {
    this.continueIndicator = this.scene.add.text(
      this.boxX + this.boxWidth - PADDING_PX - 20,
      this.boxY + this.boxHeight - PADDING_PX - 10,
      '▼',
      {
        fontSize: '20px',
        color: '#ffffff'
      }
    );
    this.continueIndicator.setOrigin(1, 1);
    this.continueIndicator.setScrollFactor(0);
    this.continueIndicator.setDepth(Depth.hud + 2);
    
    // Pulse animation
    this.scene.tweens.add({
      targets: this.continueIndicator,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  private onInput(): void {
    if (!this.isDismissed) {
      if (this.isSkipping) {
        // Second press - dismiss
        this.isDismissed = true;
        if (this.dismissResolve) {
          this.dismissResolve();
          this.dismissResolve = null;
        }
      } else {
        // First press - skip (speed up)
        this.isSkipping = true;
      }
    }
  }
  
  private createBox(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setScrollFactor(0);
    this.graphics.setDepth(Depth.hud);
    this.graphics.setAlpha(BOX_ALPHA);
    this.graphics.setScale(0);
    
    const fillColor = COLOR_MAP[this.backgroundColor] ?? COLOR_MAP['black'];
    const borderColor = BORDER_COLOR_MAP[this.backgroundColor] ?? BORDER_COLOR_MAP['black'];
    
    this.graphics.fillStyle(fillColor);
    this.graphics.fillRoundedRect(this.boxX, this.boxY, this.boxWidth, this.boxHeight, CORNER_RADIUS_PX);
    
    this.graphics.lineStyle(4, borderColor);
    this.graphics.strokeRoundedRect(this.boxX, this.boxY, this.boxWidth, this.boxHeight, CORNER_RADIUS_PX);
  }
  
  private tweenIn(): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this.graphics,
        scale: 1,
        duration: TWEEN_DURATION_MS,
        ease: 'Back.easeOut',
        onComplete: () => resolve()
      });
    });
  }
  
  private tweenOut(): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: [this.graphics, this.nameText, ...this.textObjects],
        scale: 0,
        duration: TWEEN_DURATION_MS,
        ease: 'Back.easeIn',
        onComplete: () => resolve()
      });
    });
  }
  
  private createNameText(name: string): void {
    this.nameText = this.scene.add.text(
      this.boxX + PADDING_PX,
      this.boxY + PADDING_PX,
      name,
      {
        fontSize: `${NAME_FONT_SIZE_PX}px`,
        color: '#ffffff',
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
        fontStyle: 'bold'
      }
    );
    this.nameText.setScrollFactor(0);
    this.nameText.setDepth(Depth.hud + 1);
  }
  
  private parseColorTags(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    const regex = /<(red|green|purple|gold)>(.*?)<\/\1>|<newline\/>|([^<]+)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      if (match[0] === '<newline/>') {
        segments.push({ text: '\n', color: '#ffffff' });
      } else if (match[1]) {
        const colorName = match[1];
        const colorHex = this.getColorHex(colorName);
        segments.push({ text: match[2], color: colorHex });
      } else if (match[3]) {
        segments.push({ text: match[3], color: '#ffffff' });
      }
    }
    
    return segments;
  }
  
  private getColorHex(colorName: string): string {
    const colors: Record<string, string> = {
      'red': '#ff0000',
      'green': '#00ff00',
      'purple': '#9370db',
      'gold': '#ffd700'
    };
    return colors[colorName] ?? '#ffffff';
  }
  
  private createTextObjects(): void {
    let xOffset = 0;
    let yOffset = 0;
    const startY = this.boxY + PADDING_PX + NAME_FONT_SIZE_PX + PADDING_PX;
    
    for (const segment of this.segments) {
      if (segment.text === '\n') {
        xOffset = 0;
        yOffset += TEXT_FONT_SIZE_PX + 5;
        continue;
      }
      
      // Use segment color if specified, otherwise use default textColor
      const color = segment.color !== '#ffffff' ? segment.color : this.getTextColorHex();
      
      const textObj = this.scene.add.text(
        this.boxX + PADDING_PX + xOffset,
        startY + yOffset,
        '',
        {
          fontSize: `${TEXT_FONT_SIZE_PX}px`,
          color: color,
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif'
        }
      );
      textObj.setScrollFactor(0);
      textObj.setDepth(Depth.hud + 1);
      this.textObjects.push(textObj);
      
      // Measure width for next segment (will update as text animates)
      const tempText = this.scene.add.text(0, 0, segment.text, {
        fontSize: `${TEXT_FONT_SIZE_PX}px`,
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif'
      });
      xOffset += tempText.width;
      tempText.destroy();
    }
  }
  
  private getTextColorHex(): string {
    const colors: Record<string, string> = {
      'white': '#ffffff',
      'gold': '#ffd700',
      'red': '#ff0000',
      'green': '#00ff00',
      'purple': '#9370db',
      'blue': '#4169e1'
    };
    return colors[this.textColor] ?? '#ffffff';
  }
  
  private async animateText(): Promise<void> {
    let textObjIndex = 0;
    
    for (const segment of this.segments) {
      if (segment.text === '\n') {
        // Don't increment textObjIndex - newlines don't have text objects
        continue;
      }
      
      const textObj = this.textObjects[textObjIndex];
      if (!textObj) {
        console.error(`[SpeechBox] No text object at index ${textObjIndex}`);
        continue;
      }
      
      for (let i = 0; i < segment.text.length; i++) {
        if (this.isDismissed) {
          textObj.setText(segment.text);
          break;
        }
        
        textObj.setText(segment.text.substring(0, i + 1));
        
        const char = segment.text[i];
        const isPunctuation = char === '.' || char === '!' || char === '?';
        const baseDelay = isPunctuation ? PUNCTUATION_DELAY_MS : this.charSpeed;
        const delay = this.isSkipping ? SKIP_SPEED_MS : baseDelay;
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      textObjIndex++;
    }
  }
  
  private waitForDismiss(timeout: number): Promise<void> {
    return new Promise(resolve => {
      this.dismissResolve = resolve;
      this.scene.time.delayedCall(timeout, () => {
        if (!this.isDismissed) {
          this.isDismissed = true;
          if (this.dismissResolve) {
            this.dismissResolve();
            this.dismissResolve = null;
          }
        }
      });
    });
  }
  
  private destroy(): void {
    this.graphics.destroy();
    this.nameText.destroy();
    this.textObjects.forEach(obj => obj.destroy());
    this.textObjects = [];
    if (this.continueIndicator) {
      this.continueIndicator.destroy();
    }
  }
  
  update(_delta: number): void {
    // No update needed
  }
}
