import type { IState } from "../utils/state/IState";


export class IdleState implements IState {
  private player: any;

  constructor(player: any) {
    this.player = player;
  }

  onEnter() {
    this.player.animationSystem.play({
      name: "idle",
      direction: this.player.lastDir,
    });
  }

  onExit() {}

  onUpdate(delta: number) {
    const { dx, dy } = this.player.getInputDelta();
    if (dx !== 0 || dy !== 0) {
      this.player.stateMachine.enter("walk");
    }
  }
}


