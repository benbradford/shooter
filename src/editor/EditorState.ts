import type { IState } from '../utils/state/IState';
import type EditorScene from '../EditorScene';

export abstract class EditorState implements IState {
  constructor(protected readonly scene: EditorScene) {}

  abstract onEnter(prevState?: IState): void;
  abstract onExit(nextState?: IState): void;
  abstract onUpdate(delta: number): void;
}
