import type { IState } from "../utils/state/IState";
import { Direction, dirFromDelta } from "../animation/Direction";

export class WalkState implements IState {
  private player: any;

  constructor(player: any) {
    this.player = player;
  }

  onEnter() {
    this.player.animationSystem.play({
      name: "walk",
      direction: this.player.lastDir,
    });
  }

  onExit() {}

  onUpdate(delta: number) {
    const { dx, dy } = this.player.getInputDelta();

    if (dx === 0 && dy === 0) {
      this.player.stateMachine.enter("idle");
      return;
    }

    let nx = dx;
    let ny = dy;
    if (dx !== 0 && dy !== 0) {
      const f = Math.SQRT1_2;
      nx *= f;
      ny *= f;
    }

    this.player.x += nx * this.player.speed * delta / 1000;
    this.player.y += ny * this.player.speed * delta / 1000;

    const dir = dirFromDelta(dx, dy);
    if (dir !== this.player.lastDir) {
      this.player.lastDir = dir;
      this.player.animationSystem.play({ name: "walk", direction: dir });
    }
  }
}