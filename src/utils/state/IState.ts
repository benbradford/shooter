export interface IStateEnterProps<TData = void> {
  prevState?: IState<TData>;
  data?: TData;
}

export interface IState<TData = void> {
  onEnter(props?: IStateEnterProps<TData>): void;
  onExit(nextState?: IState<TData>): void;
  onUpdate(delta: number): void;
}
