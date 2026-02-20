import { Animation } from "./Animation";

export class AnimationSystem {
  private readonly animations: Map<string, Animation>;
  private current?: Animation;
  private timeScale = 1;

  constructor(animations: Map<string, Animation>, defaultKey: string) {
    this.animations = animations;
    this.current = animations.get(defaultKey);
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
    this.current.reset();
    this.setTimeScale(speedMultiplier);
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
}
