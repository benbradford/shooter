import { Animation } from "./Animation";
import { Direction } from "./Direction";

export interface AnimDirProp {
  name: "idle" | "walk";
  direction: Direction;
}

export class AnimationSystem {
  private animations: Map<string, Animation>;
  private current?: Animation;

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

  update(delta: number) {
    this.current?.update(delta);
  }

  getFrame(): string | undefined {
    return this.current?.getFrame();
  }
}
