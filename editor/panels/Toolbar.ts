import type { EditorBridge } from '../EditorBridge';
import type { CellProperty } from '../../src/systems/grid/Grid';

type LevelInfo = { name: string; width: number; height: number; theme: string };

const GRID_TOOLS: Array<{ label: string; tool: string }> = [
  { label: 'Select', tool: 'select' },
  { label: 'Grid', tool: 'grid' },
  { label: 'Entity', tool: 'entity' },
  { label: 'Area', tool: 'blockedarea' },
  { label: 'Paint', tool: 'paint' },
];

const CELL_PROPERTIES = ['wall', 'platform', 'stairs', 'water', 'bridge', 'blocked', 'path', 'push_lock', 'void'] as const;

const ENTITY_TYPES = [
  'beetle', 'bell', 'breakable', 'bug_base', 'bullet_dude', 'cellmodifier', 'collectible', 'escort', 'eventchainer', 'exit',
  'hole', 'interaction', 'laser', 'lever', 'npc', 'puma', 'pushable', 'red_skeleton',
  'root_chest', 'skeleton', 'stalking_robot', 'thrower', 'trigger', 'tv_monk', 'worm'
];

const THEMES = ['dungeon', 'swamp', 'grass', 'wilds', 'tunnels', 'default'];

export class Toolbar {
  private readonly levelSelect: HTMLSelectElement;
  private readonly dirtySpan: HTMLSpanElement;
  private readonly toolButtons: Map<string, HTMLButtonElement> = new Map();
  private readonly entitySelect: HTMLSelectElement;
  private playWindow: Window | null = null;
  private newLevelForm: HTMLElement | null = null;

  constructor(private readonly bridge: EditorBridge, container: HTMLElement) {
    const row1 = this.createRow(container);
    this.levelSelect = document.createElement('select');
    row1.appendChild(this.levelSelect);
    this.dirtySpan = document.createElement('span');
    this.dirtySpan.className = 'dirty-indicator';
    row1.appendChild(this.dirtySpan);
    row1.appendChild(this.createButton('Save', 'ed-btn save', () => void bridge.saveLevel()));
    row1.appendChild(this.createButton('Play', 'ed-btn play', () => {
      void bridge.saveLevel().then(() => {
        const url = `${window.location.origin}/?level=${bridge.currentLevelName}&t=${Date.now()}`;
        if (this.playWindow && !this.playWindow.closed) {
          this.playWindow.location.href = url;
          this.playWindow.focus();
        } else {
          this.playWindow = window.open(url, 'db-play');
          if (!this.playWindow) {
            // VS Code webview: post message up to parent to open game
            window.parent.postMessage({ type: 'db-open-url', url }, '*');
          }
        }
      });
    }));
    row1.appendChild(this.createButton('New', 'ed-btn', () => this.toggleNewLevelForm()));

    const row2 = this.createRow(container);
    row2.classList.add('tool-grid');
    const levelBtn = this.createButton('Level', 'ed-btn', () => {
      bridge.setTool('level');
      bridge.clearSelection();
      this.updateActiveToolButton('level');
      this.entitySelect.style.display = 'none';
      gridPanel.style.display = 'none';
      paintPanel.style.display = 'none';
    });
    this.toolButtons.set('level', levelBtn);
    row2.appendChild(levelBtn);
    const stateBtn = this.createButton('State', 'ed-btn', () => {
      bridge.setTool('state');
      bridge.clearSelection();
      this.updateActiveToolButton('state');
      this.entitySelect.style.display = 'none';
      gridPanel.style.display = 'none';
      paintPanel.style.display = 'none';
    });
    this.toolButtons.set('state', stateBtn);
    row2.appendChild(stateBtn);
    for (const t of GRID_TOOLS) {
      const btn = this.createButton(t.label, 'ed-btn', () => {
        bridge.setTool(t.tool);
        if (t.tool === 'select') bridge.clearSelection();
        this.updateActiveToolButton(t.tool);
        this.entitySelect.style.display = t.tool === 'entity' ? '' : 'none';
        if (t.tool === 'entity') bridge.selectedEntityType = this.entitySelect.value as import('../../src/systems/level/LevelLoader').EntityType;
        gridPanel.style.display = t.tool === 'grid' ? '' : 'none';
        paintPanel.style.display = t.tool === 'paint' ? '' : 'none';
      });
      this.toolButtons.set(t.tool, btn);
      row2.appendChild(btn);
    }
    this.updateActiveToolButton('select');

    // Paint sub-panel
    const paintPanel = this.createRow(container);
    paintPanel.style.display = 'none';
    paintPanel.style.cssText += 'flex-wrap:wrap;gap:4px 8px;font-size:11px;align-items:center';
    this.buildPaintPanel(paintPanel, bridge);

    // Grid sub-panel with property checkboxes + layer radio
    const gridPanel = this.createRow(container);
    gridPanel.style.display = 'none';
    gridPanel.style.cssText += 'flex-wrap:wrap;gap:2px 8px;font-size:11px';
    for (const p of CELL_PROPERTIES) {
      const lbl = document.createElement('label');
      lbl.style.cssText = 'display:flex;align-items:center;gap:2px';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.dataset.prop = p;
      cb.addEventListener('change', () => {
        if (cb.checked) bridge.gridProperties.add(p as CellProperty);
        else bridge.gridProperties.delete(p as CellProperty);
      });
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(p));
      gridPanel.appendChild(lbl);
    }
    const layerSpan = document.createElement('span');
    layerSpan.style.cssText = 'margin-left:auto;display:flex;align-items:center;gap:4px;color:#7f8c8d';
    layerSpan.textContent = 'Layer:';
    for (const l of [0, 1, 2]) {
      const lbl = document.createElement('label');
      lbl.style.cssText = 'display:flex;align-items:center;gap:1px';
      const rb = document.createElement('input');
      rb.type = 'radio'; rb.name = 'grid-layer'; rb.value = String(l);
      if (l === 0) rb.checked = true;
      rb.addEventListener('change', () => { bridge.gridLayer = l; });
      lbl.appendChild(rb);
      lbl.appendChild(document.createTextNode(String(l)));
      layerSpan.appendChild(lbl);
    }
    gridPanel.appendChild(layerSpan);

    const row3 = this.createRow(container);
    this.entitySelect = document.createElement('select');
    this.entitySelect.style.display = 'none';
    for (const t of ENTITY_TYPES) {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      this.entitySelect.appendChild(opt);
    }
    this.entitySelect.addEventListener('change', () => {
      bridge.selectedEntityType = this.entitySelect.value as import('../../src/systems/level/LevelLoader').EntityType;
      this.entitySelect.blur();
    });
    row3.appendChild(this.entitySelect);

    this.levelSelect.addEventListener('change', () => { void bridge.loadLevel(this.levelSelect.value); this.levelSelect.blur(); });
    bridge.onToolChanged = (tool) => this.updateActiveToolButton(tool);
    void this.fetchLevels();
  }

  onLevelLoaded(levelName: string): void {
    this.levelSelect.value = levelName;
    void this.fetchLevels();
  }

  updateDirtyIndicator(isDirty: boolean): void {
    this.dirtySpan.textContent = isDirty ? '●' : '';
  }

  private updateActiveToolButton(activeTool: string): void {
    for (const [tool, btn] of this.toolButtons) {
      btn.classList.toggle('active', tool === activeTool);
    }
  }

  private async fetchLevels(): Promise<void> {
    try {
      const response = await fetch('/api/levels');
      const levels = await response.json() as LevelInfo[];
      const current = this.levelSelect.value;
      this.levelSelect.innerHTML = '';
      for (const l of levels.sort((a, b) => a.name.localeCompare(b.name))) {
        const opt = document.createElement('option');
        opt.value = l.name;
        opt.textContent = `${l.name} (${l.width}x${l.height})`;
        this.levelSelect.appendChild(opt);
      }
      if (current) this.levelSelect.value = current;
    } catch { /* dev server may not be ready */ }
  }

  private toggleNewLevelForm(): void {
    if (this.newLevelForm) { this.newLevelForm.remove(); this.newLevelForm = null; return; }
    this.newLevelForm = document.createElement('div');
    this.newLevelForm.className = 'new-level-form';
    this.newLevelForm.innerHTML = `
      <div class="form-row"><input id="nl-name" placeholder="Level name" /></div>
      <div class="form-row">
        <input id="nl-width" type="number" value="30" min="10" style="width:60px" />
        <span style="color:#7f8c8d">x</span>
        <input id="nl-height" type="number" value="20" min="10" style="width:60px" />
        <select id="nl-theme">${THEMES.map(t => `<option>${t}</option>`).join('')}</select>
      </div>
      <div class="form-row"><button class="ed-btn save" id="nl-create">Create</button><button class="ed-btn" id="nl-cancel">Cancel</button></div>
    `;
    for (const input of this.newLevelForm.querySelectorAll('input')) {
      input.addEventListener('keydown', e => e.stopPropagation());
    }
    this.newLevelForm.querySelector('#nl-create')!.addEventListener('click', () => {
      const name = (this.newLevelForm!.querySelector('#nl-name') as HTMLInputElement).value.trim();
      const width = Number.parseInt((this.newLevelForm!.querySelector('#nl-width') as HTMLInputElement).value);
      const height = Number.parseInt((this.newLevelForm!.querySelector('#nl-height') as HTMLInputElement).value);
      const theme = (this.newLevelForm!.querySelector('#nl-theme') as HTMLSelectElement).value;
      if (!name) return;
      void this.bridge.newLevel(name, width, height, theme);
      this.newLevelForm?.remove(); this.newLevelForm = null;
    });
    this.newLevelForm.querySelector('#nl-cancel')!.addEventListener('click', () => {
      this.newLevelForm?.remove(); this.newLevelForm = null;
    });
    this.levelSelect.parentElement!.after(this.newLevelForm);
  }

  private buildPaintPanel(panel: HTMLElement, bridge: EditorBridge): void {
    // Color picker
    const colorLabel = document.createElement('label');
    colorLabel.style.cssText = 'display:flex;align-items:center;gap:4px';
    colorLabel.textContent = 'Color:';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#ff0000';
    colorInput.style.cssText = 'width:32px;height:24px;border:none;padding:0;cursor:pointer';
    colorInput.addEventListener('input', () => {
      bridge.paintColor = colorInput.value + alphaHex(alphaInput.valueAsNumber);
    });
    colorLabel.appendChild(colorInput);
    panel.appendChild(colorLabel);

    // Alpha slider
    const alphaLabel = document.createElement('label');
    alphaLabel.style.cssText = 'display:flex;align-items:center;gap:4px';
    alphaLabel.textContent = 'Alpha:';
    const alphaInput = document.createElement('input');
    alphaInput.type = 'range';
    alphaInput.min = '0'; alphaInput.max = '255'; alphaInput.value = '255';
    alphaInput.style.cssText = 'width:60px';
    alphaInput.addEventListener('input', () => {
      bridge.paintColor = colorInput.value + alphaHex(alphaInput.valueAsNumber);
      alphaVal.textContent = Math.round(alphaInput.valueAsNumber / 255 * 100) + '%';
    });
    const alphaVal = document.createElement('span');
    alphaVal.textContent = '100%';
    alphaVal.style.cssText = 'width:30px;font-size:10px;color:#7f8c8d';
    alphaLabel.appendChild(alphaInput);
    alphaLabel.appendChild(alphaVal);
    panel.appendChild(alphaLabel);

    // Brush size (pixels)
    const sizeLabel = document.createElement('label');
    sizeLabel.style.cssText = 'display:flex;align-items:center;gap:4px';
    sizeLabel.textContent = 'Size:';
    const sizeInput = document.createElement('input');
    sizeInput.type = 'range';
    sizeInput.min = '1'; sizeInput.max = '64'; sizeInput.value = '4';
    sizeInput.style.cssText = 'width:80px';
    const sizeVal = document.createElement('span');
    sizeVal.textContent = '4px';
    sizeVal.style.cssText = 'width:30px;font-size:10px;color:#7f8c8d';
    sizeInput.addEventListener('input', () => {
      bridge.paintBrushSize = sizeInput.valueAsNumber;
      sizeVal.textContent = sizeInput.value + 'px';
    });
    sizeLabel.appendChild(sizeInput);
    sizeLabel.appendChild(sizeVal);
    panel.appendChild(sizeLabel);

    // Eraser toggle
    const eraserBtn = this.createButton('Eraser', 'ed-btn', () => {
      bridge.paintEraser = !bridge.paintEraser;
      eraserBtn.classList.toggle('active', bridge.paintEraser);
    });
    panel.appendChild(eraserBtn);

    // Delete all button
    const deleteBtn = this.createButton('Delete All', 'ed-btn danger', () => {
      if (confirm('Delete all paint from this level?')) {
        bridge.clearAllPaint();
      }
    });
    panel.appendChild(deleteBtn);

    // Undo/redo buttons
    const undoBtn = this.createButton('Undo', 'ed-btn', () => bridge.undo());
    const redoBtn = this.createButton('Redo', 'ed-btn', () => bridge.redo());
    panel.appendChild(undoBtn);
    panel.appendChild(redoBtn);
  }

  private createRow(container: HTMLElement): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'toolbar-row';
    container.appendChild(row);
    return row;
  }

  private createButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = className; btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }
}

function alphaHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}
