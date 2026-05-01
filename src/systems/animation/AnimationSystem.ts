import { Animation } from "./Animation";

export class AnimationSystem {
  private readonly animations: Map<string, Animation>;
  private current?: Animation;
  private currentKey: string = '';
  private timeScale = 1;

  constructor(animations: Map<string, Animation>, defaultKey: string) {
    this.animations = animations;
    this.current = animations.get(defaultKey);
    this.currentKey = defaultKey;
  }

  hasAnimation(key: string): boolean {
    return this.animations.has(key);
  }

  play(animKey: string, speedMultiplier: number = 1) {
    const next = this.animations.get(animKey);

    if (!next) {
      console.warn("No anim for " + animKey);
      return;
    }
    
    if (next === this.current) {
      this.current.reset();
      this.setTimeScale(speedMultiplier);
      return;
    }

    this.current = next;
    this.currentKey = animKey;
    this.current.reset();
    this.setTimeScale(speedMultiplier);
  }

  playFrameRange(animKey: string, startFrame: number, endFrame: number, style: 'once' | 'repeat', secondsPerFrame?: number): void {
    const source = this.animations.get(animKey);
    if (!source) {
      console.warn("No anim for " + animKey);
      return;
    }
    const subFrames = source.getFrames().slice(startFrame, endFrame + 1);
    this.current = new Animation(subFrames, style, secondsPerFrame ?? 0.08);
    this.setTimeScale(1);
  }

  setTimeScale(scale: number) {
    this.timeScale = Math.max(0, scale);
  }

  update(delta: number) {
    this.current?.update(delta * this.timeScale);
  }

  getFrame(): string | undefined {
    return this.current?.getFrame();
  }

  getCurrentAnimation(): Animation | undefined {
    return this.current;
  }

  getCurrentKey(): string {
    return this.currentKey;
  }

  isOnLastFrame(animKey: string): boolean {
    if (this.currentKey !== animKey) return false;
    return this.current?.isOnLastFrame() ?? false;
  }
}
