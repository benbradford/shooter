export type AnimationStyle = "static" | "repeat" | "pingpong";

export class Animation {
  private readonly frames: string[];
  private readonly style: AnimationStyle;

  private index = 0;
  private forward = true;

  private elapsed = 0;
  private readonly frameDuration: number;

  constructor(
    frames: string[],
    style: AnimationStyle,
    secondsPerFrame: number
  ) {
    this.frames = frames;
    this.style = style;

    // ✅ convert ONCE
    this.frameDuration = secondsPerFrame * 1000;

    // safety
    if (this.frameDuration <= 0) {
      this.frameDuration = Infinity;
    }

    console.log("frameDuration:", this.frameDuration);
  }

  update(delta: number) {
    if (this.style === "static" || this.frames.length <= 1) return;

    // clamp large spikes (tab switch, debugger)
    delta = Math.min(delta, 50);

    this.elapsed += delta;

    if (this.elapsed < this.frameDuration) return;

    this.elapsed -= this.frameDuration;

    if (this.style === "pingpong") {
      this.index += this.forward ? 1 : -1;

      if (this.index >= this.frames.length - 1) {
        this.index = this.frames.length - 1;
        this.forward = false;
      } else if (this.index <= 0) {
        this.index = 0;
        this.forward = true;
      }
    } else if (this.style === "repeat") {
      this.index = (this.index + 1) % this.frames.length;
    }
  }

  getFrame(): string {
    return this.frames[this.index];
  }

  reset() {
    this.index = 0;
    this.elapsed = 0;
    this.forward = true;
  }
}
