import type Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import {
  type TvMood, type FaceDirection, type FacePixel, type MoodDefinition,
  MOOD_DEFINITIONS, moodFromHealth,
} from './TvFaceMoods';
import { type ScreenMask, scanScreenMasks, EMPTY_MASK } from './TvScreenMaskScanner';
import { Direction } from '../../../constants/Direction';

const SPRITESHEET_KEY = 'tv_monk';
const FRAME_WIDTH_PX = 80;
const FRAME_HEIGHT_PX = 80;
const TOTAL_FRAMES = 37;
const CANVAS_KEY = 'tv_monk_dynamic';

// Idle animation: blink every 3-5 seconds, 2 frames closed
const BLINK_MIN_MS = 3000;
const BLINK_MAX_MS = 5000;
const BLINK_DURATION_MS = 150;

// Transition: static frames
const TRANSITION_FRAMES = 4;
const TRANSITION_FRAME_DURATION_MS = 70;

// Glitch: randomize every N ms
const GLITCH_INTERVAL_MS = 200;

// Direction enum to spritesheet frame index (alphabetical order)
const DIR_TO_IDLE_FRAME: Record<number, number> = {
  [Direction.Right]: 0,      // east
  [Direction.UpRight]: 1,    // north-east
  [Direction.UpLeft]: 2,     // north-west
  [Direction.Up]: 3,         // north
  [Direction.DownRight]: 4,  // south-east
  [Direction.DownLeft]: 5,   // south-west
  [Direction.Down]: 6,       // south
  [Direction.Left]: 7,       // west
};

// Which directions get full face drawing vs color-only
const FACE_DIR_MAP: Partial<Record<number, FaceDirection>> = {
  [Direction.Down]: 'south',
  [Direction.DownRight]: 'south-east',
  [Direction.DownLeft]: 'south-west',
};

export type TvFaceComponentProps = {
  readonly scene: Phaser.Scene;
};

export class TvFaceComponent implements Component {
  entity!: Entity;

  private readonly scene: Phaser.Scene;
  private masks: ScreenMask[] = [];
  private canvasTexture: Phaser.Textures.CanvasTexture | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Source spritesheet pixel data (read once)
  private sourceCanvas: HTMLCanvasElement | null = null;
  private sourceCtx: CanvasRenderingContext2D | null = null;

  private currentMood: TvMood = 'off';
  private currentFrame = 6; // south idle
  private lastRenderedFrame = -1;
  private lastRenderedMood: TvMood | null = null;
  private phase: 'pre-combat' | 'combat' = 'pre-combat';

  // Blink timer
  private blinkTimerMs = 0;
  private nextBlinkMs = BLINK_MIN_MS;
  private isBlinking = false;
  private blinkElapsedMs = 0;

  // Transition state
  private isTransitioning = false;
  private transitionFrameIndex = 0;
  private transitionTimerMs = 0;
  private transitionTargetMood: TvMood = 'happy';

  // Glitch timer
  private glitchTimerMs = 0;
  private glitchSeed = 0;

  // Face animation (alternates faces/faces2)
  private faceAnimTimerMs = 0;
  private faceAnimFrame = 0; // 0 = faces, 1 = faces2

  constructor(props: TvFaceComponentProps) {
    this.scene = props.scene;
  }

  init(): void {
    // Scan screen masks from spritesheet
    this.masks = scanScreenMasks(
      this.scene, SPRITESHEET_KEY,
      FRAME_WIDTH_PX, FRAME_HEIGHT_PX, TOTAL_FRAMES
    );

    // Create a canvas copy of the source spritesheet for reading pixels
    const texture = this.scene.textures.get(SPRITESHEET_KEY);
    const source = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    this.sourceCanvas = document.createElement('canvas');
    this.sourceCanvas.width = source.width;
    this.sourceCanvas.height = source.height;
    this.sourceCtx = this.sourceCanvas.getContext('2d')!;
    this.sourceCtx.drawImage(source, 0, 0);

    // Create dynamic canvas texture (same size as one frame)
    if (this.scene.textures.exists(CANVAS_KEY)) {
      this.scene.textures.remove(CANVAS_KEY);
    }
    const ct = this.scene.textures.createCanvas(CANVAS_KEY, FRAME_WIDTH_PX, FRAME_HEIGHT_PX);
    this.canvasTexture = ct;
    if (ct) {
      this.ctx = ct.getContext();
    }

    this.nextBlinkMs = BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS);
  }

  setDirection(dir: Direction): void {
    const frame = DIR_TO_IDLE_FRAME[dir] ?? 6;
    if (frame !== this.currentFrame) {
      this.currentFrame = frame;
    }
  }

  /** Called by event system in pre-combat phase */
  setMood(mood: TvMood): void {
    if (mood === this.currentMood || this.isTransitioning) return;
    this.startTransition(mood);
  }

  /** Transition to combat phase — mood now driven by health */
  enterCombat(): void {
    this.phase = 'combat';
    if (this.currentMood !== 'happy') {
      this.startTransition('happy');
    }
  }

  update(delta: number): void {
    // In combat, mood is driven by health
    if (this.phase === 'combat') {
      const health = this.entity.get(HealthComponent);
      if (health) {
        const newMood = moodFromHealth(health.getHealth());
        if (newMood !== this.currentMood && !this.isTransitioning) {
          this.startTransition(newMood);
        }
      }
    }
    // In pre-combat, mood is set externally via setMood()

    // Update transition
    if (this.isTransitioning) {
      this.updateTransition(delta);
    }

    // Update blink (not during off, booting, glitching, stunned, charging)
    const hasFace = this.currentMood !== 'glitching' && this.currentMood !== 'booting' && this.currentMood !== 'off' && this.currentMood !== 'stunned' && this.currentMood !== 'charging';
    if (!this.isTransitioning && hasFace) {
      this.updateBlink(delta);
    }

    // Update dynamic effects (glitching, booting, stunned flicker)
    if ((this.currentMood === 'glitching' || this.currentMood === 'booting' || this.currentMood === 'stunned') && !this.isTransitioning) {
      this.glitchTimerMs += delta;
      if (this.glitchTimerMs >= GLITCH_INTERVAL_MS) {
        this.glitchTimerMs = 0;
        this.glitchSeed++;
        this.lastRenderedFrame = -1; // force redraw
      }
    }

    // Update face animation (faces/faces2 alternation)
    const moodDef = MOOD_DEFINITIONS[this.currentMood];
    if (moodDef.faces2 && moodDef.animIntervalMs && !this.isTransitioning) {
      this.faceAnimTimerMs += delta;
      if (this.faceAnimTimerMs >= moodDef.animIntervalMs) {
        this.faceAnimTimerMs = 0;
        this.faceAnimFrame = this.faceAnimFrame === 0 ? 1 : 0;
        this.lastRenderedFrame = -1; // force redraw
      }
    }

    // Render face onto canvas texture
    this.renderFace();
  }

  private startTransition(targetMood: TvMood): void {
    this.isTransitioning = true;
    this.transitionFrameIndex = 0;
    this.transitionTimerMs = 0;
    this.transitionTargetMood = targetMood;
    this.faceAnimFrame = 0;
    this.faceAnimTimerMs = 0;
    this.lastRenderedFrame = -1; // force redraw
  }

  private updateTransition(delta: number): void {
    this.transitionTimerMs += delta;
    if (this.transitionTimerMs >= TRANSITION_FRAME_DURATION_MS) {
      this.transitionTimerMs = 0;
      this.transitionFrameIndex++;
      this.lastRenderedFrame = -1; // force redraw

      if (this.transitionFrameIndex >= TRANSITION_FRAMES) {
        this.currentMood = this.transitionTargetMood;
        this.isTransitioning = false;
        this.lastRenderedFrame = -1;
      }
    }
  }

  private updateBlink(delta: number): void {
    if (this.isBlinking) {
      this.blinkElapsedMs += delta;
      if (this.blinkElapsedMs >= BLINK_DURATION_MS) {
        this.isBlinking = false;
        this.blinkElapsedMs = 0;
        this.nextBlinkMs = BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS);
        this.lastRenderedFrame = -1;
      }
    } else {
      this.blinkTimerMs += delta;
      if (this.blinkTimerMs >= this.nextBlinkMs) {
        this.blinkTimerMs = 0;
        this.isBlinking = true;
        this.blinkElapsedMs = 0;
        this.lastRenderedFrame = -1;
      }
    }
  }

  private renderFace(): void {
    if (!this.ctx || !this.canvasTexture || !this.sourceCtx || !this.sourceCanvas) return;

    // Skip if nothing changed
    const renderKey = this.isTransitioning ? -2 : (this.isBlinking ? -3 : this.currentFrame);
    if (renderKey === this.lastRenderedFrame && renderKey === this.lastRenderedFrame && this.currentMood === this.lastRenderedMood) return;
    this.lastRenderedFrame = renderKey;
    this.lastRenderedMood = this.currentMood;

    const cols = Math.floor(this.sourceCanvas.width / FRAME_WIDTH_PX);
    const srcCol = this.currentFrame % cols;
    const srcRow = Math.floor(this.currentFrame / cols);
    const sx = srcCol * FRAME_WIDTH_PX;
    const sy = srcRow * FRAME_HEIGHT_PX;

    // Copy base frame from source spritesheet
    this.ctx.clearRect(0, 0, FRAME_WIDTH_PX, FRAME_HEIGHT_PX);
    this.ctx.drawImage(this.sourceCanvas, sx, sy, FRAME_WIDTH_PX, FRAME_HEIGHT_PX, 0, 0, FRAME_WIDTH_PX, FRAME_HEIGHT_PX);

    const mask = this.masks[this.currentFrame] ?? EMPTY_MASK;
    if (mask.pixels.length === 0) {
      this.canvasTexture.refresh();
      this.applySpriteTexture();
      return;
    }

    const imageData = this.ctx.getImageData(0, 0, FRAME_WIDTH_PX, FRAME_HEIGHT_PX);
    const data = imageData.data;

    if (this.isTransitioning) {
      this.renderStaticTransition(data, mask);
    } else {
      const moodDef = MOOD_DEFINITIONS[this.currentMood];
      // Fill screen with mood bg color
      for (const p of mask.pixels) {
        const idx = (p.row * FRAME_WIDTH_PX + p.col) * 4;
        data[idx] = moodDef.bg[0];
        data[idx + 1] = moodDef.bg[1];
        data[idx + 2] = moodDef.bg[2];
        data[idx + 3] = 255;
      }

      // Draw face pattern if this direction supports it
      const faceDir = FACE_DIR_MAP[this.directionFromFrame()];
      if (faceDir) {
        if (this.currentMood === 'glitching') {
          this.renderGlitchFace(data, mask, false);
        } else if (this.currentMood === 'booting') {
          this.renderGlitchFace(data, mask, true);
        } else if (this.currentMood === 'off') {
          // No face — just black bg (already filled)
        } else if (this.currentMood === 'stunned') {
          // Flicker bg brightness then draw face
          const flicker = (this.glitchSeed % 3 === 0) ? 40 : (this.glitchSeed % 3 === 1) ? -30 : 0;
          for (const p of mask.pixels) {
            const idx = (p.row * FRAME_WIDTH_PX + p.col) * 4;
            data[idx] = Math.min(255, Math.max(0, data[idx] + flicker));
            data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + flicker));
            data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + flicker));
          }
          this.stampPixels(data, mask, this.getAnimatedFace(moodDef, faceDir));
        } else if (this.isBlinking) {
          this.renderBlinkFace(data, mask);
        } else {
          this.stampPixels(data, mask, this.getAnimatedFace(moodDef, faceDir));
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
    this.canvasTexture.refresh();
    this.applySpriteTexture();
  }

  private getAnimatedFace(moodDef: MoodDefinition, faceDir: FaceDirection): readonly FacePixel[] {
    if (this.faceAnimFrame === 1 && moodDef.faces2) {
      return moodDef.faces2[faceDir];
    }
    return moodDef.faces[faceDir];
  }

  private stampPixels(data: Uint8ClampedArray, mask: ScreenMask, pixels: readonly FacePixel[]): void {
    for (const [r, c, pr, pg, pb] of pixels) {
      const absRow = mask.minRow + r;
      const absCol = mask.minCol + c;
      if (absRow < 0 || absRow >= FRAME_HEIGHT_PX || absCol < 0 || absCol >= FRAME_WIDTH_PX) continue;
      // Verify pixel is within screen mask
      const isScreen = mask.pixels.some(p => p.row === absRow && p.col === absCol);
      if (!isScreen) continue;
      const idx = (absRow * FRAME_WIDTH_PX + absCol) * 4;
      data[idx] = pr;
      data[idx + 1] = pg;
      data[idx + 2] = pb;
      data[idx + 3] = 255;
    }
  }

  private renderStaticTransition(data: Uint8ClampedArray, mask: ScreenMask): void {
    // B&W TV static for transition
    const seed = this.transitionFrameIndex * 17 + 7;
    let rng = seed;
    const nextRng = (): number => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng; };

    for (const p of mask.pixels) {
      const idx = (p.row * FRAME_WIDTH_PX + p.col) * 4;
      const v = nextRng() % 200 + 40;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }

  private renderGlitchFace(data: Uint8ClampedArray, mask: ScreenMask, blackAndWhite: boolean): void {
    let rng = this.glitchSeed * 31 + 13;
    const nextRng = (): number => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng; };

    for (const p of mask.pixels) {
      if (nextRng() % 3 === 0) {
        const idx = (p.row * FRAME_WIDTH_PX + p.col) * 4;
        const v = nextRng() % 100;
        if (blackAndWhite) {
          const bw = v + nextRng() % 80;
          data[idx] = bw;
          data[idx + 1] = bw;
          data[idx + 2] = bw;
        } else {
          data[idx] = v;
          data[idx + 1] = v + (nextRng() % 60);
          data[idx + 2] = v;
        }
      }
    }
  }

  private renderBlinkFace(data: Uint8ClampedArray, mask: ScreenMask): void {
    // Draw horizontal lines where eyes would be (row 3 relative to screen)
    const eyeRow = mask.minRow + 3;
    for (const p of mask.pixels) {
      if (p.row === eyeRow || p.row === eyeRow + 1) {
        const idx = (p.row * FRAME_WIDTH_PX + p.col) * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
      }
    }
  }

  private directionFromFrame(): Direction {
    // Reverse lookup: frame index to Direction
    for (const [dir, frame] of Object.entries(DIR_TO_IDLE_FRAME)) {
      if (frame === this.currentFrame) return Number(dir) as Direction;
    }
    return Direction.Down;
  }

  private applySpriteTexture(): void {
    const sprite = this.entity.get(SpriteComponent);
    if (!sprite) return;
    if (sprite.sprite.texture.key !== CANVAS_KEY) {
      sprite.sprite.setTexture(CANVAS_KEY);
    }
  }

  onDestroy(): void {
    if (this.scene.textures.exists(CANVAS_KEY)) {
      this.scene.textures.remove(CANVAS_KEY);
    }
    this.sourceCanvas = null;
    this.sourceCtx = null;
    this.ctx = null;
    this.canvasTexture = null;
  }
}
