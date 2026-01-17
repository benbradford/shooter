export interface IState {
  onEnter(prevState?: IState): void;
  onExit(nextState?: IState): void;
  onUpdate(delta: number): void;
}
