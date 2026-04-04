import { EditorBridge } from '../EditorBridge';
import { Toast } from './Toast';
import { Toolbar } from './Toolbar';
import { ContextPanel } from './ContextPanel';

export class PanelController {
  readonly toast: Toast;
  private readonly toolbar: Toolbar;
  private readonly contextPanel: ContextPanel;

  constructor(bridge: EditorBridge) {
    this.toast = new Toast();
    bridge.setToast(this.toast);

    this.toolbar = new Toolbar(bridge, document.getElementById('toolbar')!);
    this.contextPanel = new ContextPanel(bridge, document.getElementById('context-panel')!);

    // Wire bridge callbacks to panels
    bridge.onCellClicked = (col, row) => {
      this.contextPanel.showCellForm(col, row);
    };
    bridge.onEntityClicked = (entity) => {
      this.contextPanel.showEntityForm(entity);
    };
    bridge.onDataEntityClicked = (entityId) => {
      this.contextPanel.showDataEntityForm(entityId);
    };
    bridge.onSelectionCleared = () => {
      this.contextPanel.showLevelInfo();
    };
    bridge.onLevelLoaded = (levelName) => {
      this.toolbar.onLevelLoaded(levelName);
      this.contextPanel.showLevelInfo();
    };
    bridge.onDirtyStateChanged = (isDirty) => {
      this.toolbar.updateDirtyIndicator(isDirty);
    };
    bridge.onLoadError = (levelName, error) => {
      this.toast.show(`Failed to load ${levelName}: ${error}`, 'error');
    };
  }
}
