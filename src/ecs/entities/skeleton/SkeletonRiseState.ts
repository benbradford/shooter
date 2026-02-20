import type { IState } from '../../../systems/state/IState';

export class SkeletonRiseState implements IState {
  onEnter(): void {
    // Component handles rise animation
  }
  
  onExit(): void {
    // Component handles cleanup
  }
  
  onUpdate(_delta: number): void {
    // Component handles update
  }
}
