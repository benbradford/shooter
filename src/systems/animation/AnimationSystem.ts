import { Animation } from "./Animation";
import { Direction } from "../../constants/Direction";

export type AnimDirProp = {
  name: "idle" | "walk";
  direction: Direction;
}

export class AnimationSystem {
  private readonly animations: Map<string, Animation>;
  private current?: Animation;
  private timeScale = 1;

  constructor(animations: Map<string, Animation>, defaultKey: string) {
    this.animations = animations;
    this.current = animations.get(defaultKey);
  }

  play(key: string | AnimDirProp) {
    const animKey = typeof key === 'string' ? key : `${key.name}_${key.direction}`;
    const next = this.animations.get(animKey);

    if (!next || next === this.current) return;

    this.current = next;
    this.current.reset();
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
