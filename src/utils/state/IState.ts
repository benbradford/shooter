export type IStateEnterProps<TData = void> = {
  prevState?: IState<TData>;
  data?: TData;
}

export type IState<TData = void> = {
  onEnter?(props?: IStateEnterProps<TData>): void;
  onExit?(nextState?: IState<TData>): void;
  onUpdate?(delta: number): void;
}
