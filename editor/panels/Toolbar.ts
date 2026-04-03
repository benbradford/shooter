import type { EditorBridge } from '../EditorBridge';
import type { CellProperty } from '../../src/systems/grid/Grid';

type LevelInfo = { name: string; width: number; height: number; theme: string };

const GRID_TOOLS: Array<{ label: string; tool: string; property?: CellProperty }> = [
  { label: 'Select', tool: 'select' },
  { label: 'Floor', tool: 'floor' },
  { label: 'Wall', tool: 'wall', property: 'wall' },
  { label: 'Platform', tool: 'platform', property: 'platform' },
  { label: 'Stairs', tool: 'stairs', property: 'stairs' },
  { label: 'Water', tool: 'water', property: 'water' },
  { label: 'Bridge', tool: 'bridge', property: 'bridge' },
  { label: 'Blocked', tool: 'blocked', property: 'blocked' },
  { label: 'Texture', tool: 'texture' },
  { label: 'Entity', tool: 'entity' },
  { label: 'Move', tool: 'move' },
];

const ENTITY_TYPES = [
  'skeleton', 'thrower', 'stalking_robot', 'bug_base', 'bullet_dude', 'puma',
  'npc', 'breakable', 'trigger', 'exit', 'eventchainer', 'cellmodifier', 'interaction'
];

const THEMES = ['dungeon', 'swamp', 'grass', 'wilds', 'default'];

export class Toolbar {
  private readonly levelSelect: HTMLSelectElement;
  private readonly dirtySpan: HTMLSpanElement;
  private readonly toolButtons: Map<string, HTMLButtonElement> = new Map();
  private readonly entitySelect: HTMLSelectElement;
  private readonly themeSelect: HTMLSelectElement;
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
      if (bridge.isDirty) void bridge.saveLevel();
      window.open(`/?level=${bridge.currentLevelName}`, '_blank');
    }));
    row1.appendChild(this.createButton('New', 'ed-btn', () => this.toggleNewLevelForm()));

    const row2 = this.createRow(container);
    row2.classList.add('tool-grid');
    for (const t of GRID_TOOLS) {
      const btn = this.createButton(t.label, 'ed-btn', () => {
        bridge.setTool(t.tool, t.property);
        this.updateActiveToolButton(t.tool);
        this.entitySelect.style.display = t.tool === 'entity' ? '' : 'none';
      });
      this.toolButtons.set(t.tool, btn);
      row2.appendChild(btn);
    }
    this.updateActiveToolButton('select');

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
    });
    row3.appendChild(this.entitySelect);

    const themeLabel = document.createElement('span');
    themeLabel.textContent = 'Theme:';
    themeLabel.style.cssText = 'font-size:11px;color:#7f8c8d';
    row3.appendChild(themeLabel);
    this.themeSelect = document.createElement('select');
    for (const t of THEMES) {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      this.themeSelect.appendChild(opt);
    }
    this.themeSelect.addEventListener('change', () => bridge.setTheme(this.themeSelect.value));
    row3.appendChild(this.themeSelect);

    this.levelSelect.addEventListener('change', () => void bridge.loadLevel(this.levelSelect.value));
    void this.fetchLevels();
  }

  onLevelLoaded(levelName: string): void {
    this.levelSelect.value = levelName;
    const levelData = this.bridge.getScene().getLevelData();
    this.themeSelect.value = levelData.levelTheme ?? 'dungeon';
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
