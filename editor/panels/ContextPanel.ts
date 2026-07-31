import type { EditorBridge } from '../EditorBridge';
import { TexturePicker } from './TexturePicker';
import type { PickResult } from './TexturePicker';
import { normalizeBgTextures, bgTextureKey } from '../../src/systems/level/LevelLoader';
import { ASSET_REGISTRY, NPC_ASSET_KEYS } from '../../src/assets/AssetRegistry';
import { MOVING_TILE_DEFAULT_TEXTURE } from '../../src/ecs/components/moving-tile/MovingTileScript';

export class ContextPanel {
  private readonly texturePicker: TexturePicker;

  constructor(private readonly bridge: EditorBridge, private readonly container: HTMLElement) {
    this.texturePicker = new TexturePicker(bridge);
    this.showLevelInfo();
  }

  clear(): void {
    this.bridge.saveStateCallback = null;
    this.container.innerHTML = '';
  }

  async showStatePanel(): Promise<void> {
    type FullState = {
      player: { health: number; coins: number; currentLevel?: string; spawnCol?: number; spawnRow?: number; entryCell?: { col: number; row: number } };
      flags: Record<string, string>;
      levels?: Record<string, {
        liveEntities: string[];
        destroyedEntities: string[];
        firedTriggers: string[];
        modifiedCells: Array<{ col: number; row: number; properties?: string[]; backgroundTexture?: string; layer?: number }>;
        movedEntities?: Array<{ id: string; col: number; row: number }>;
      }>;
    };
    let state: FullState;
    try {
      const res = await fetch('/states/default.json');
      state = await res.json() as FullState;
    } catch {
      this.container.innerHTML = '<p>No empty.json found</p>';
      return;
    }

    // Populate levels from available level files so all are editable
    try {
      const levelsRes = await fetch('/api/levels');
      const levels = await levelsRes.json() as Array<{ name: string }>;
      state.levels ??= {};
      for (const l of levels) {
        if (!state.levels[l.name]) {
          state.levels[l.name] = { liveEntities: [], destroyedEntities: [], firedTriggers: [], modifiedCells: [], movedEntities: [] };
        }
      }
    } catch { /* levels API not available */ }

    const flagEntries = Object.entries(state.flags ?? {});
    const levelEntries = Object.entries(state.levels ?? {});

    const renderStringList = (items: string[], cls: string): string =>
      items.map(v => `<div class="st-list-item"><input class="${cls}" value="${v}" /><button class="ed-btn danger st-ldel" style="padding:1px 5px;font-size:10px">✕</button></div>`).join('');

    const renderLevelSection = (levelName: string, data: NonNullable<FullState['levels']>[string]): string => {
      const fields = [
        { key: 'liveEntities', label: 'Live Entities', items: data.liveEntities },
        { key: 'destroyedEntities', label: 'Destroyed Entities', items: data.destroyedEntities },
        { key: 'firedTriggers', label: 'Fired Triggers', items: data.firedTriggers },
      ];
      return `
        <div class="collapsible-header section-header" data-target="lvl-${levelName}" style="display:flex;justify-content:space-between;align-items:center">
          <span>${levelName}</span>
          <button class="ed-btn danger st-lclear" data-level="${levelName}" style="padding:1px 6px;font-size:10px">Clear</button>
        </div>
        <div class="collapsible-body" id="lvl-${levelName}">
          ${fields.map(f => `
            <div class="collapsible-header" data-target="lvl-${levelName}-${f.key}" style="font-size:11px;color:#95a5a6;margin:4px 0 2px">${f.label} (${f.items.length})</div>
            <div class="collapsible-body" id="lvl-${levelName}-${f.key}">
              <div class="st-list-container" data-level="${levelName}" data-field="${f.key}">${renderStringList(f.items, `st-lval`)}</div>
              <button class="ed-btn st-ladd" data-level="${levelName}" data-field="${f.key}" style="font-size:10px;margin:2px 0 4px">+ Add</button>
            </div>
          `).join('')}
          <div class="collapsible-header" data-target="lvl-${levelName}-modifiedCells" style="font-size:11px;color:#95a5a6;margin:4px 0 2px">Modified Cells (${data.modifiedCells.length})</div>
          <div class="collapsible-body" id="lvl-${levelName}-modifiedCells">
            <textarea class="st-mcells" data-level="${levelName}" rows="4" style="font-size:10px;width:100%">${JSON.stringify(data.modifiedCells, null, 2)}</textarea>
          </div>
          <div class="collapsible-header" data-target="lvl-${levelName}-movedEntities" style="font-size:11px;color:#95a5a6;margin:4px 0 2px">Moved Entities (${(data.movedEntities ?? []).length})</div>
          <div class="collapsible-body" id="lvl-${levelName}-movedEntities">
            <textarea class="st-mentities" data-level="${levelName}" rows="4" style="font-size:10px;width:100%">${JSON.stringify(data.movedEntities ?? [], null, 2)}</textarea>
          </div>
        </div>`;
    };

    this.container.innerHTML = `
      <div class="section-header">Player</div>
      <div class="form-group"><label>Health</label><input type="number" id="st-health" value="${state.player.health}" /></div>
      <div class="form-group"><label>Coins</label><input type="number" id="st-coins" value="${state.player.coins}" /></div>
      <div class="section-header" style="margin-top:8px">Flags</div>
      <div id="st-flags">
        ${flagEntries.map(([k, v]) => `<div class="form-group" style="display:flex;gap:4px;align-items:center">
          <input class="st-fkey" value="${k}" style="flex:1" /><input class="st-fval" value="${v}" style="flex:1" />
          <button class="ed-btn danger st-fdel" style="padding:2px 6px">✕</button>
        </div>`).join('')}
      </div>
      <button class="ed-btn" id="st-add-flag" style="width:100%;margin-bottom:4px">+ Add Flag</button>
      <button class="ed-btn danger" id="st-reset-flags" style="width:100%;margin-bottom:8px">Reset Flags</button>
      <div class="section-header" style="margin-top:8px;display:flex;justify-content:space-between;align-items:center"><span>Levels</span><button class="ed-btn danger" id="st-clear-all" style="padding:1px 6px;font-size:10px">Clear All</button></div>
      <div id="st-levels">${levelEntries.map(([name, data]) => renderLevelSection(name, data)).join('')}</div>
      <button class="ed-btn save" id="st-save" style="width:100%;margin-top:8px">Save State</button>
      <button class="ed-btn" id="st-refresh" style="width:100%;margin-top:4px">↻ Refresh from File</button>
    `;

    // Prevent WASD in all inputs/textareas
    for (const el of this.container.querySelectorAll<HTMLElement>('input, textarea')) {
      el.addEventListener('keydown', e => e.stopPropagation());
    }

    // Collapsible toggle
    for (const header of this.container.querySelectorAll<HTMLElement>('.collapsible-header')) {
      header.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('st-lclear')) return;
        header.classList.toggle('open');
        const body = this.container.querySelector(`#${header.dataset.target}`) as HTMLElement | null;
        body?.classList.toggle('open');
      });
    }

    // Clear level buttons
    for (const btn of this.container.querySelectorAll<HTMLButtonElement>('.st-lclear')) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const levelName = btn.dataset.level!;
        const body = this.container.querySelector(`#lvl-${levelName}`) as HTMLElement | null;
        if (!body) return;
        for (const container of body.querySelectorAll<HTMLElement>('.st-list-container')) {
          container.innerHTML = '';
        }
        const textarea = body.querySelector<HTMLTextAreaElement>('.st-mcells');
        if (textarea) textarea.value = '[]';
        const meTextarea = body.querySelector<HTMLTextAreaElement>('.st-mentities');
        if (meTextarea) meTextarea.value = '[]';
        this.bridge.toast?.show(`Cleared ${levelName}`, 'success');
      });
    }

    // Clear all levels
    this.container.querySelector('#st-clear-all')?.addEventListener('click', () => {
      for (const btn of this.container.querySelectorAll<HTMLButtonElement>('.st-lclear')) {
        btn.click();
      }
      this.bridge.toast?.show('Cleared all levels', 'success');
    });

    // Delete buttons (flags)
    for (const btn of this.container.querySelectorAll('.st-fdel')) {
      btn.addEventListener('click', () => btn.parentElement!.remove());
    }

    // Delete buttons (list items)
    for (const btn of this.container.querySelectorAll('.st-ldel')) {
      btn.addEventListener('click', () => btn.parentElement!.remove());
    }

    // Add flag
    this.container.querySelector('#st-add-flag')?.addEventListener('click', () => {
      const flagsDiv = this.container.querySelector('#st-flags')!;
      const row = document.createElement('div');
      row.className = 'form-group';
      row.style.cssText = 'display:flex;gap:4px;align-items:center';
      row.innerHTML = `<input class="st-fkey" value="" style="flex:1" placeholder="key" /><input class="st-fval" value="" style="flex:1" placeholder="value" /><button class="ed-btn danger st-fdel" style="padding:2px 6px">✕</button>`;
      for (const input of row.querySelectorAll('input')) input.addEventListener('keydown', e => e.stopPropagation());
      row.querySelector('.st-fdel')!.addEventListener('click', () => row.remove());
      flagsDiv.appendChild(row);
    });

    this.container.querySelector('#st-reset-flags')?.addEventListener('click', () => {
      const resetFlags: Record<string, string> = { canPunch: 'true', canSwim: 'true', canJump: 'true', canPush: 'true', hasSuperPunch: 'true', hasAutoHeal: 'false', hasCompanion: 'false', pet_rock_collected: 'true', pet_dog_collected: 'true', pet_bubble_collected: 'true', pet_selected: 'rock' };
      const flagsDiv = this.container.querySelector('#st-flags')!;
      flagsDiv.innerHTML = '';
      for (const [key, val] of Object.entries(resetFlags)) {
        const row = document.createElement('div');
        row.className = 'form-group';
        row.style.cssText = 'display:flex;gap:4px;align-items:center';
        row.innerHTML = `<input class="st-fkey" value="${key}" style="flex:1" /><input class="st-fval" value="${val}" style="flex:1" /><button class="ed-btn danger st-fdel" style="padding:2px 6px">✕</button>`;
        for (const input of row.querySelectorAll('input')) input.addEventListener('keydown', e => e.stopPropagation());
        row.querySelector('.st-fdel')!.addEventListener('click', () => row.remove());
        flagsDiv.appendChild(row);
      }
      this.bridge.toast?.show('Flags reset', 'success');
    });

    // Add list item buttons
    for (const btn of this.container.querySelectorAll<HTMLButtonElement>('.st-ladd')) {
      btn.addEventListener('click', () => {
        const container = this.container.querySelector(`.st-list-container[data-level="${btn.dataset.level}"][data-field="${btn.dataset.field}"]`)!;
        const row = document.createElement('div');
        row.className = 'st-list-item';
        row.innerHTML = `<input class="st-lval" value="" /><button class="ed-btn danger st-ldel" style="padding:1px 5px;font-size:10px">✕</button>`;
        row.querySelector('input')!.addEventListener('keydown', e => e.stopPropagation());
        row.querySelector('.st-ldel')!.addEventListener('click', () => row.remove());
        container.appendChild(row);
      });
    }

    // Save
    const doSaveState = async (): Promise<void> => {
      if (!this.container.querySelector('#st-health')) return;
      state.player.health = Number.parseInt((this.container.querySelector('#st-health') as HTMLInputElement)?.value ?? '100');
      state.player.coins = Number.parseInt((this.container.querySelector('#st-coins') as HTMLInputElement)?.value ?? '0');

      const fkeys = this.container.querySelectorAll<HTMLInputElement>('.st-fkey');
      const fvals = this.container.querySelectorAll<HTMLInputElement>('.st-fval');
      state.flags = {};
      fkeys.forEach((k, i) => { if (k.value.trim()) state.flags[k.value.trim()] = fvals[i].value; });

      state.levels ??= {};
      for (const levelName of Object.keys(state.levels)) {
        const level = state.levels[levelName];
        for (const field of ['liveEntities', 'destroyedEntities', 'firedTriggers'] as const) {
          const inputs = this.container.querySelectorAll<HTMLInputElement>(`.st-list-container[data-level="${levelName}"][data-field="${field}"] .st-lval`);
          level[field] = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
        }
        const mcTextarea = this.container.querySelector<HTMLTextAreaElement>(`.st-mcells[data-level="${levelName}"]`);
        if (mcTextarea) {
          try { level.modifiedCells = JSON.parse(mcTextarea.value); } catch { /* keep existing */ }
        }
        const meTextarea = this.container.querySelector<HTMLTextAreaElement>(`.st-mentities[data-level="${levelName}"]`);
        if (meTextarea) {
          try { level.movedEntities = JSON.parse(meTextarea.value); } catch { /* keep existing */ }
        }
      }

      try {
        await fetch('/api/save-state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state, null, 2) });
        this.bridge.toast?.show('State saved', 'success');
      } catch (err) { this.bridge.toast?.show(`Save failed: ${err}`, 'error'); }
    };

    this.bridge.saveStateCallback = doSaveState;

    this.container.querySelector('#st-save')?.addEventListener('click', () => void doSaveState());

    this.container.querySelector('#st-refresh')?.addEventListener('click', () => {
      void this.showStatePanel();
      this.bridge.toast?.show('State refreshed from file', 'success');
    });
  }

  showLevelInfo(): void {
    const scene = this.bridge.getScene?.();
    if (!scene) { this.container.innerHTML = '<p>Loading...</p>'; return; }
    const grid = this.bridge.getGrid();
    const levelData = scene.getLevelData();
    const entityCount = (levelData.entities ?? []).length;
    this.container.innerHTML = `
      <div class="section-header">Level Info</div>
      <div class="level-info-grid">
        <span class="label">Name</span><span>${this.bridge.currentLevelName ?? '—'}</span>
        <span class="label">Size</span><span>${grid.width} x ${grid.height}</span>
        <span class="label">Theme</span><select id="li-theme" style="font-size:11px">${['dungeon', 'swamp', 'grass', 'wilds', 'tunnels', 'default'].map(t => `<option ${(levelData.levelTheme ?? 'dungeon') === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <span class="label">Music</span><select id="li-music" style="font-size:11px">${['(none)', 'btr_music', 'btr_overworld', 'btr_wilds', 'btr_tonal', 'incidental', 'capacity'].map(m => `<option value="${m === '(none)' ? '' : m}" ${(levelData.music ?? '') === (m === '(none)' ? '' : m) ? 'selected' : ''}>${m}</option>`).join('')}</select>
        <span class="label">Entities</span><span>${entityCount}</span>
        <span class="label">Player</span><span style="display:flex;gap:4px"><input type="number" id="li-px" value="${levelData.playerStart.x}" style="width:50px;font-size:11px"> <input type="number" id="li-py" value="${levelData.playerStart.y}" style="width:50px;font-size:11px"></span>
      </div>
      <div class="form-group" style="margin-top:8px">
        <label style="display:block"><input type="checkbox" id="li-fixed-cam" ${levelData.fixedCamera ? 'checked' : ''} /> Fixed Camera</label>
        <div id="li-fixed-cam-fields" style="display:${levelData.fixedCamera ? 'flex' : 'none'};gap:4px;margin-top:4px;align-items:center">
          <span style="font-size:11px">Center:</span>
          <input type="number" id="li-fc-col" value="${levelData.fixedCamera?.centerCol ?? Math.floor(levelData.width / 2)}" style="width:50px;font-size:11px">
          <input type="number" id="li-fc-row" value="${levelData.fixedCamera?.centerRow ?? Math.floor(levelData.height / 2)}" style="width:50px;font-size:11px">
        </div>
      </div>
      <div class="section-header" style="margin-top:12px">Resize</div>
      <div class="toolbar-row">
        <button class="ed-btn" id="ri-add-col">+ Col</button>
        <button class="ed-btn" id="ri-add-row">+ Row</button>
        <button class="ed-btn danger" id="ri-rem-col">- Col</button>
        <button class="ed-btn danger" id="ri-rem-row">- Row</button>
      </div>

      <div class="section-header" style="margin-top:12px">Data Entities</div>
      ${(['interaction', 'eventchainer', 'cellmodifier'] as const).map(type => {
        const items = (levelData.entities ?? []).filter(e => e.type === type);
        return `<div style="margin-bottom:4px">
          <span style="font-size:11px;color:#7f8c8d">${type} (${items.length})</span>
          ${items.map(e => `<button class="ed-btn de-item" data-id="${e.id}" style="display:block;width:100%;text-align:left;font-size:11px;margin:1px 0">${e.id}</button>`).join('')}
          <button class="ed-btn de-add" data-type="${type}" style="font-size:10px;margin-top:2px">+ Add ${type}</button>
        </div>`;
      }).join('')}
    `;
    this.container.querySelector('#ri-add-col')?.addEventListener('click', () => { this.bridge.resizeGrid(grid.width + 1, grid.height); this.showLevelInfo(); });
    this.container.querySelector('#ri-add-row')?.addEventListener('click', () => { this.bridge.resizeGrid(grid.width, grid.height + 1); this.showLevelInfo(); });
    this.container.querySelector('#ri-rem-col')?.addEventListener('click', () => { if (grid.width > 1) { this.bridge.resizeGrid(grid.width - 1, grid.height); this.showLevelInfo(); } });
    this.container.querySelector('#ri-rem-row')?.addEventListener('click', () => { if (grid.height > 1) { this.bridge.resizeGrid(grid.width, grid.height - 1); this.showLevelInfo(); } });
    this.container.querySelector('#li-theme')?.addEventListener('change', (e) => { this.bridge.setTheme((e.target as HTMLSelectElement).value); (e.target as HTMLSelectElement).blur(); });
    this.container.querySelector('#li-music')?.addEventListener('change', (e) => { const val = (e.target as HTMLSelectElement).value; levelData.music = val || undefined; if (!this.bridge.isDirty) { this.bridge.isDirty = true; this.bridge.onDirtyStateChanged?.(true); } (e.target as HTMLSelectElement).blur(); });
    const updatePlayerStart = () => {
      const px = Number.parseInt((this.container.querySelector('#li-px') as HTMLInputElement).value);
      const py = Number.parseInt((this.container.querySelector('#li-py') as HTMLInputElement).value);
      if (!Number.isNaN(px) && !Number.isNaN(py)) {
        levelData.playerStart = { x: px, y: py };
        this.bridge.movePlayer(px, py);
      }
    };
    this.container.querySelector('#li-px')?.addEventListener('change', updatePlayerStart);
    this.container.querySelector('#li-py')?.addEventListener('change', updatePlayerStart);

    const fixedCamCheckbox = this.container.querySelector('#li-fixed-cam') as HTMLInputElement;
    const fixedCamFields = this.container.querySelector('#li-fixed-cam-fields') as HTMLElement;
    const updateFixedCamera = () => {
      if (fixedCamCheckbox.checked) {
        const col = Number.parseInt((this.container.querySelector('#li-fc-col') as HTMLInputElement).value);
        const row = Number.parseInt((this.container.querySelector('#li-fc-row') as HTMLInputElement).value);
        levelData.fixedCamera = { centerCol: Number.isNaN(col) ? Math.floor(levelData.width / 2) : col, centerRow: Number.isNaN(row) ? Math.floor(levelData.height / 2) : row };
        fixedCamFields.style.display = 'flex';
      } else {
        delete levelData.fixedCamera;
        fixedCamFields.style.display = 'none';
      }
    };
    fixedCamCheckbox?.addEventListener('change', updateFixedCamera);
    this.container.querySelector('#li-fc-col')?.addEventListener('change', updateFixedCamera);
    this.container.querySelector('#li-fc-row')?.addEventListener('change', updateFixedCamera);

    for (const input of this.container.querySelectorAll('input')) {
      input.addEventListener('keydown', e => e.stopPropagation());
    }

    for (const btn of this.container.querySelectorAll<HTMLButtonElement>('.de-item')) {
      btn.addEventListener('click', () => this.showDataEntityForm(btn.dataset.id!));
    }
    for (const btn of this.container.querySelectorAll<HTMLButtonElement>('.de-add')) {
      btn.addEventListener('click', () => {
        this.bridge.addEntity(btn.dataset.type as import('../../src/systems/level/LevelLoader').EntityType, 0, 0);
        this.showLevelInfo();
      });
    }
  }

  showCellForm(col: number, row: number): void {
    const grid = this.bridge.getGrid();
    const cell = grid.getCell(col, row);
    if (!cell) return;
    const layer = grid.getLayer(cell);
    const props = Array.from(cell.properties);
    const allProps = ['wall', 'platform', 'stairs', 'water', 'bridge', 'blocked', 'path', 'push_lock', 'void'];

    // Read full texture config from levelData (preserves transformOverride)
    const levelData = this.bridge.getScene().getLevelData();
    const levelCell = levelData.cells.find(c => c.col === col && c.row === row);
    const bgTex = levelCell?.backgroundTexture;
    const texArray = normalizeBgTextures(bgTex);
    const animTex = levelCell?.animatedTexture;
    const animTransform = animTex?.transformOverride;

    this.container.innerHTML = `
      <div class="section-header">Cell (${col}, ${row})</div>
      <div class="form-group">
        <label>Layer</label>
        <input type="number" id="cf-layer" value="${layer}" min="-1" max="5" />
      </div>
      <div class="form-group">
        <label>Properties</label>
        ${allProps.map(p => `<label style="display:block"><input type="checkbox" data-prop="${p}" ${props.includes(p as import('../../src/systems/grid/Grid').CellProperty) ? 'checked' : ''} /> ${p}</label>`).join('')}
      </div>
      <div class="form-group">
        <label>Textures${texArray && texArray.length > 1 ? ` (${texArray.length})` : ''}</label>
        <button class="ed-btn" id="cf-choose-tex" style="width:100%;margin-bottom:4px">+ Add Texture</button>
        <button class="ed-btn danger" id="cf-clear-tex" style="width:100%;margin-bottom:4px">Clear All Textures</button>
      </div>
      ${(texArray ?? []).map((tex, i) => {
        const key = bgTextureKey(tex);
        const t = typeof tex === 'object' && 'transformOverride' in tex ? tex.transformOverride : null;
        const z = typeof tex === 'object' && 'zOffsetOverride' in tex ? tex.zOffsetOverride : undefined;
        const dz = typeof tex === 'object' && 'dynamicZ' in tex ? tex.dynamicZ : false;
        const bm = typeof tex === 'object' && 'blendMode' in tex ? tex.blendMode : 'normal';
        const al = typeof tex === 'object' && 'alpha' in tex ? tex.alpha : undefined;
        const ti = typeof tex === 'object' && 'tint' in tex ? tex.tint : '';
        return `
      <div class="section-header" style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px">${i}: ${key}</span>
        <button class="ed-btn danger tex-delete" data-tex-idx="${i}" style="padding:1px 6px;font-size:10px">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <div class="form-group"><label>scaleX</label><input type="number" class="tex-sx" data-tex-idx="${i}" value="${t?.scaleX ?? 1}" step="0.1" /></div>
        <div class="form-group"><label>scaleY</label><input type="number" class="tex-sy" data-tex-idx="${i}" value="${t?.scaleY ?? 1}" step="0.1" /></div>
        <div class="form-group"><label>offsetX</label><input type="number" class="tex-ox" data-tex-idx="${i}" value="${t?.offsetX ?? 0}" /></div>
        <div class="form-group"><label>offsetY</label><input type="number" class="tex-oy" data-tex-idx="${i}" value="${t?.offsetY ?? 0}" /></div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin:4px 0">
        <label style="display:flex;align-items:center;gap:4px;font-size:11px"><input type="checkbox" class="tex-z-enable" data-tex-idx="${i}" ${z !== undefined ? 'checked' : ''} ${dz ? 'disabled' : ''} /> Z Override</label>
        <input type="number" class="tex-z-val" data-tex-idx="${i}" value="${z ?? 0}" style="width:60px" ${z === undefined || dz ? 'disabled' : ''} />
        <label style="display:flex;align-items:center;gap:4px;font-size:11px"><input type="checkbox" class="tex-dz-enable" data-tex-idx="${i}" ${dz ? 'checked' : ''} /> Dynamic Z</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin:4px 0">
        <div class="form-group"><label>Blend</label><select class="tex-blend" data-tex-idx="${i}">
          <option value="normal" ${bm === 'normal' ? 'selected' : ''}>normal</option>
          <option value="multiply" ${bm === 'multiply' ? 'selected' : ''}>multiply</option>
          <option value="screen" ${bm === 'screen' ? 'selected' : ''}>screen</option>
          <option value="add" ${bm === 'add' ? 'selected' : ''}>add</option>
        </select></div>
        <div class="form-group"><label>Alpha</label><input type="number" class="tex-alpha" data-tex-idx="${i}" value="${al ?? 1}" step="0.1" min="0" max="1" /></div>
        <div class="form-group"><label>Tint</label><input type="color" class="tex-tint" data-tex-idx="${i}" value="${ti || '#ffffff'}" /><button class="ed-btn tex-tint-clear" data-tex-idx="${i}" style="padding:1px 4px;font-size:9px">✕</button></div>
      </div>
      <button class="ed-btn tex-apply" data-tex-idx="${i}" style="width:100%;margin-bottom:6px">Apply Transform</button>`;
      }).join('')}
      ${animTex ? `
      <div class="section-header">Animated Texture</div>
      <div class="level-info-grid" style="font-size:11px">
        <span class="label">Spritesheet</span><span>${animTex.spritesheet}</span>
        <span class="label">Frames</span><span>${animTex.frameCount} @ ${animTex.frameRate}fps</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
        <div class="form-group"><label>scaleX</label><input type="number" id="cf-asx" value="${animTransform?.scaleX ?? 1}" step="0.1" /></div>
        <div class="form-group"><label>scaleY</label><input type="number" id="cf-asy" value="${animTransform?.scaleY ?? 1}" step="0.1" /></div>
        <div class="form-group"><label>offsetX</label><input type="number" id="cf-aox" value="${animTransform?.offsetX ?? 0}" /></div>
        <div class="form-group"><label>offsetY</label><input type="number" id="cf-aoy" value="${animTransform?.offsetY ?? 0}" /></div>
      </div>
      <button class="ed-btn" id="cf-apply-anim-transform" style="width:100%;margin-bottom:4px">Apply Anim Transform</button>
      <button class="ed-btn danger" id="cf-clear-anim" style="width:100%;margin-bottom:6px">Remove Animated Texture</button>
      ` : `
      <button class="ed-btn" id="cf-add-anim" style="width:100%;margin-bottom:6px">+ Animated Texture</button>
      `}
      <div class="section-header">Conditional Textures</div>
      ${levelCell?.conditionalTextures ? `
      <div class="form-group">
        <label>Flag</label>
        <input type="text" id="cf-cond-flag" value="${levelCell.conditionalTextures.flag}" />
      </div>
      <div id="cf-cond-cases">
        ${levelCell.conditionalTextures.cases.map((c, i) => `
        <div style="display:flex;gap:4px;align-items:center;margin-bottom:4px">
          <input type="text" class="cond-case-val" data-case-idx="${i}" value="${c.value}" style="width:60px" placeholder="value" />
          <span style="font-size:11px;flex:1">${c.textures.map(t => typeof t === 'string' ? t : t.image).join(', ') || '(none)'}</span>
          <button class="ed-btn cond-case-pick" data-case-idx="${i}" style="padding:1px 6px;font-size:10px">Pick</button>
          <button class="ed-btn danger cond-case-del" data-case-idx="${i}" style="padding:1px 6px;font-size:10px">✕</button>
        </div>`).join('')}
      </div>
      <button class="ed-btn" id="cf-cond-add-case" style="width:100%;margin-bottom:4px">+ Add Case</button>
      <div class="form-group">
        <label>Default: ${levelCell.conditionalTextures.default?.map(t => typeof t === 'string' ? t : t.image).join(', ') || '(none)'}</label>
        <button class="ed-btn" id="cf-cond-pick-default" style="width:100%">Pick Default</button>
      </div>
      <button class="ed-btn danger" id="cf-cond-remove" style="width:100%;margin-bottom:6px">Remove Conditional</button>
      ` : `
      <button class="ed-btn" id="cf-cond-add" style="width:100%;margin-bottom:6px">+ Add Conditional Texture</button>
      `}
      <button class="ed-btn danger" id="cf-clear">Clear Cell</button>
    `;

    // Prevent WASD in inputs
    for (const input of this.container.querySelectorAll('input')) {
      input.addEventListener('keydown', e => e.stopPropagation());
    }

    this.container.querySelector('#cf-layer')?.addEventListener('change', (e) => {
      this.bridge.setCellLayer(col, row, Number.parseInt((e.target as HTMLInputElement).value));
    });
    for (const cb of this.container.querySelectorAll<HTMLInputElement>('input[data-prop]')) {
      cb.addEventListener('change', () => {
        const prop = cb.dataset.prop as import('../../src/systems/grid/Grid').CellProperty;
        const currentCell = grid.getCell(col, row);
        if (!currentCell) return;
        const newProps = new Set(currentCell.properties);
        if (cb.checked) newProps.add(prop); else newProps.delete(prop);
        const newLayer = (newProps.has('wall') || newProps.has('platform') || newProps.has('stairs')) ? 1 : 0;
        this.bridge.setCellLayer(col, row, newLayer);
        // Apply properties directly
        grid.setCell(col, row, { properties: newProps });
        grid.render();
        this.bridge.getScene().renderGrid(grid);
      });
    }
    this.container.querySelector('#cf-choose-tex')?.addEventListener('click', () => {
      this.texturePicker.open((result: PickResult) => {
        const levelData = this.bridge.getScene().getLevelData();
        let levelCell = levelData.cells.find(c => c.col === col && c.row === row);
        if (!levelCell) { levelCell = { col, row }; levelData.cells.push(levelCell); }

        if (result.type === 'image') {
          const existing = normalizeBgTextures(levelCell.backgroundTexture) ?? [];
          existing.push(result.key);
          levelCell.backgroundTexture = existing;
          this.bridge.getGrid().setCell(col, row, { backgroundTexture: result.key });
          this.bridge.getScene().refreshSprites();
        } else if (result.type === 'animated') {
          const asset = ASSET_REGISTRY[result.key as keyof typeof ASSET_REGISTRY] as { config?: { frameWidth: number; frameHeight: number } };
          levelCell.animatedTexture = {
            spritesheet: result.key,
            frameWidth: asset.config?.frameWidth ?? 64,
            frameHeight: asset.config?.frameHeight ?? 64,
            frameCount: 2,
            frameRate: 8,
          };
          this.bridge.getScene().refreshSprites();
        } else if (result.type === 'spritesheet') {
          const newTex = {
            image: result.key,
            sourceRect: result.sourceRect,
            ...(result.scaleX !== undefined || result.scaleY !== undefined ? {
              transformOverride: { scaleX: result.scaleX ?? 1, scaleY: result.scaleY ?? 1, offsetX: 0, offsetY: 0 }
            } : {}),
            ...(result.zOffsetOverride !== undefined ? { zOffsetOverride: result.zOffsetOverride } : {})
          };
          const existing = normalizeBgTextures(levelCell.backgroundTexture) ?? [];
          existing.push(newTex);
          levelCell.backgroundTexture = existing;
          this.bridge.getGrid().setCell(col, row, { backgroundTexture: result.key });
          this.bridge.getScene().refreshSprites();
        }
        this.showCellForm(col, row);
      });
    });
    this.container.querySelector('#cf-clear-tex')?.addEventListener('click', () => {
      this.bridge.clearCellTexture(col, row);
      this.showCellForm(col, row);
    });
    // Per-texture Apply Transform buttons
    // Z Override checkbox toggles the number input
    for (const cb of this.container.querySelectorAll<HTMLInputElement>('.tex-z-enable')) {
      cb.addEventListener('change', () => {
        const idx = cb.dataset.texIdx!;
        const input = this.container.querySelector(`.tex-z-val[data-tex-idx="${idx}"]`) as HTMLInputElement;
        input.disabled = !cb.checked;
        if (cb.checked) {
          const dzCb = this.container.querySelector(`.tex-dz-enable[data-tex-idx="${idx}"]`) as HTMLInputElement;
          dzCb.checked = false;
        }
        applyTexTransform(Number.parseInt(idx, 10));
      });
    }
    for (const cb of this.container.querySelectorAll<HTMLInputElement>('.tex-dz-enable')) {
      cb.addEventListener('change', () => {
        const idx = cb.dataset.texIdx!;
        if (cb.checked) {
          const zCb = this.container.querySelector(`.tex-z-enable[data-tex-idx="${idx}"]`) as HTMLInputElement;
          const zVal = this.container.querySelector(`.tex-z-val[data-tex-idx="${idx}"]`) as HTMLInputElement;
          zCb.checked = false;
          zCb.disabled = true;
          zVal.disabled = true;
        } else {
          const zCb = this.container.querySelector(`.tex-z-enable[data-tex-idx="${idx}"]`) as HTMLInputElement;
          zCb.disabled = false;
        }
        applyTexTransform(Number.parseInt(idx, 10));
      });
    }
    for (const btn of this.container.querySelectorAll('.tex-tint-clear')) {
      btn.addEventListener('click', () => {
        const idx = Number.parseInt((btn as HTMLElement).dataset.texIdx!, 10);
        const input = this.container.querySelector(`.tex-tint[data-tex-idx="${idx}"]`) as HTMLInputElement;
        input.value = '#ffffff';
        applyTexTransform(idx);
      });
    }
    const applyTexTransform = (idx: number) => {
      const getVal = (cls: string) => Number.parseFloat((this.container.querySelector(`.${cls}[data-tex-idx="${idx}"]`) as HTMLInputElement).value);
      const zEnabled = (this.container.querySelector(`.tex-z-enable[data-tex-idx="${idx}"]`) as HTMLInputElement).checked;
      const zVal = Number.parseFloat((this.container.querySelector(`.tex-z-val[data-tex-idx="${idx}"]`) as HTMLInputElement).value);
      const dzEnabled = (this.container.querySelector(`.tex-dz-enable[data-tex-idx="${idx}"]`) as HTMLInputElement).checked;
      const blendVal = (this.container.querySelector(`.tex-blend[data-tex-idx="${idx}"]`) as HTMLSelectElement).value;
      const alphaVal = Number.parseFloat((this.container.querySelector(`.tex-alpha[data-tex-idx="${idx}"]`) as HTMLInputElement).value);
      const tintVal = (this.container.querySelector(`.tex-tint[data-tex-idx="${idx}"]`) as HTMLInputElement).value.trim();
      const tintCleared = tintVal === '#ffffff' || tintVal === '';
      const levelData = this.bridge.getScene().getLevelData();
      const levelCell = levelData.cells.find(c => c.col === col && c.row === row);
      if (!levelCell) return;
      const texArr = normalizeBgTextures(levelCell.backgroundTexture);
      if (!texArr || idx >= texArr.length) return;
      const tex = texArr[idx];
      const entry = typeof tex === 'string' ? { image: tex } : { ...tex };
      entry.transformOverride = { scaleX: getVal('tex-sx'), scaleY: getVal('tex-sy'), offsetX: getVal('tex-ox'), offsetY: getVal('tex-oy') };
      if (dzEnabled) {
        entry.dynamicZ = true;
        delete entry.zOffsetOverride;
      } else {
        delete entry.dynamicZ;
        if (zEnabled) {
          entry.zOffsetOverride = zVal;
        } else {
          delete entry.zOffsetOverride;
        }
      }
      if (blendVal && blendVal !== 'normal') {
        entry.blendMode = blendVal as 'multiply' | 'screen' | 'add';
      } else {
        delete entry.blendMode;
      }
      if (!Number.isNaN(alphaVal) && alphaVal < 1) {
        entry.alpha = alphaVal;
      } else {
        delete entry.alpha;
      }
      if (!tintCleared) {
        entry.tint = tintVal;
      } else {
        delete entry.tint;
      }
      texArr[idx] = entry;
      levelCell.backgroundTexture = texArr;
      this.bridge.getScene().refreshSprites();
    };
    // Auto-apply on any texture field change
    for (const el of this.container.querySelectorAll<HTMLElement>('.tex-sx, .tex-sy, .tex-ox, .tex-oy, .tex-z-val, .tex-z-enable, .tex-dz-enable, .tex-blend, .tex-alpha, .tex-tint')) {
      const idx = Number.parseInt(el.dataset.texIdx!, 10);
      el.addEventListener('change', () => applyTexTransform(idx));
    }
    for (const btn of this.container.querySelectorAll('.tex-apply')) {
      btn.addEventListener('click', () => {
        const idx = Number.parseInt((btn as HTMLElement).dataset.texIdx!, 10);
        applyTexTransform(idx);
      });
    }
    // Per-texture Delete buttons
    for (const btn of this.container.querySelectorAll('.tex-delete')) {
      btn.addEventListener('click', () => {
        const idx = Number.parseInt((btn as HTMLElement).dataset.texIdx!, 10);
        const levelData = this.bridge.getScene().getLevelData();
        const levelCell = levelData.cells.find(c => c.col === col && c.row === row);
        if (!levelCell) return;
        const texArr = normalizeBgTextures(levelCell.backgroundTexture);
        if (!texArr || idx >= texArr.length) return;
        texArr.splice(idx, 1);
        levelCell.backgroundTexture = texArr.length > 0 ? texArr : undefined;
        if (!levelCell.backgroundTexture) {
          delete levelCell.backgroundTexture;
          this.bridge.getGrid().setCell(col, row, { backgroundTexture: '' });
        } else {
          this.bridge.getGrid().setCell(col, row, { backgroundTexture: bgTextureKey(texArr[0]) });
        }
        this.bridge.getScene().refreshSprites();
        this.showCellForm(col, row);
      });
    }
    this.container.querySelector('#cf-apply-anim-transform')?.addEventListener('click', () => {
      const get = (id: string) => Number.parseFloat((this.container.querySelector(`#${id}`) as HTMLInputElement).value);
      const levelData = this.bridge.getScene().getLevelData();
      const lc = levelData.cells.find(c => c.col === col && c.row === row);
      if (lc?.animatedTexture) {
        lc.animatedTexture.transformOverride = { scaleX: get('cf-asx'), scaleY: get('cf-asy'), offsetX: get('cf-aox'), offsetY: get('cf-aoy') };
        this.bridge.getScene().refreshSprites();
      }
    });
    this.container.querySelector('#cf-clear-anim')?.addEventListener('click', () => {
      const levelData = this.bridge.getScene().getLevelData();
      const lc = levelData.cells.find(c => c.col === col && c.row === row);
      if (lc) { delete lc.animatedTexture; this.bridge.getScene().refreshSprites(); }
      this.showCellForm(col, row);
    });
    this.container.querySelector('#cf-add-anim')?.addEventListener('click', () => {
      this.texturePicker.open((result: PickResult) => {
        if (result.type !== 'animated') return;
        const levelData = this.bridge.getScene().getLevelData();
        let lc = levelData.cells.find(c => c.col === col && c.row === row);
        if (!lc) { lc = { col, row }; levelData.cells.push(lc); }
        const asset = ASSET_REGISTRY[result.key as keyof typeof ASSET_REGISTRY] as { config?: { frameWidth: number; frameHeight: number } };
        lc.animatedTexture = {
          spritesheet: result.key,
          frameWidth: asset.config?.frameWidth ?? 64,
          frameHeight: asset.config?.frameHeight ?? 64,
          frameCount: 2,
          frameRate: 8,
        };
        this.bridge.getScene().refreshSprites();
        this.showCellForm(col, row);
      });
    });
    this.container.querySelector('#cf-clear')?.addEventListener('click', () => {
      this.bridge.clearCell(col, row);
      this.showCellForm(col, row);
    });

    // Conditional textures handlers
    this.container.querySelector('#cf-cond-add')?.addEventListener('click', () => {
      const levelData = this.bridge.getScene().getLevelData();
      let lc = levelData.cells.find(c => c.col === col && c.row === row);
      if (!lc) { lc = { col, row }; levelData.cells.push(lc); }
      lc.conditionalTextures = { flag: '', cases: [] };
      this.showCellForm(col, row);
    });
    this.container.querySelector('#cf-cond-remove')?.addEventListener('click', () => {
      const levelData = this.bridge.getScene().getLevelData();
      const lc = levelData.cells.find(c => c.col === col && c.row === row);
      if (lc) { delete lc.conditionalTextures; }
      this.showCellForm(col, row);
    });
    this.container.querySelector('#cf-cond-flag')?.addEventListener('change', (e) => {
      const levelData = this.bridge.getScene().getLevelData();
      const lc = levelData.cells.find(c => c.col === col && c.row === row);
      if (lc?.conditionalTextures) {
        lc.conditionalTextures.flag = (e.target as HTMLInputElement).value;
      }
    });
    this.container.querySelector('#cf-cond-add-case')?.addEventListener('click', () => {
      const levelData = this.bridge.getScene().getLevelData();
      const lc = levelData.cells.find(c => c.col === col && c.row === row);
      if (lc?.conditionalTextures) {
        lc.conditionalTextures.cases.push({ value: '', textures: [] });
        this.showCellForm(col, row);
      }
    });
    for (const input of this.container.querySelectorAll<HTMLInputElement>('.cond-case-val')) {
      input.addEventListener('change', () => {
        const idx = Number.parseInt(input.dataset.caseIdx!, 10);
        const levelData = this.bridge.getScene().getLevelData();
        const lc = levelData.cells.find(c => c.col === col && c.row === row);
        if (lc?.conditionalTextures?.cases[idx]) {
          lc.conditionalTextures.cases[idx].value = input.value;
        }
      });
    }
    for (const btn of this.container.querySelectorAll('.cond-case-pick')) {
      btn.addEventListener('click', () => {
        const idx = Number.parseInt((btn as HTMLElement).dataset.caseIdx!, 10);
        this.texturePicker.open((result: PickResult) => {
          const levelData = this.bridge.getScene().getLevelData();
          const lc = levelData.cells.find(c => c.col === col && c.row === row);
          if (!lc?.conditionalTextures?.cases[idx]) return;
          const tex = result.type === 'spritesheet'
            ? { image: result.key, sourceRect: result.sourceRect, ...(result.scaleX !== undefined || result.scaleY !== undefined ? { transformOverride: { scaleX: result.scaleX ?? 1, scaleY: result.scaleY ?? 1, offsetX: 0, offsetY: 0 } } : {}), ...(result.zOffsetOverride !== undefined ? { zOffsetOverride: result.zOffsetOverride } : {}) }
            : result.key;
          lc.conditionalTextures.cases[idx].textures.push(tex);
          this.showCellForm(col, row);
        });
      });
    }
    for (const btn of this.container.querySelectorAll('.cond-case-del')) {
      btn.addEventListener('click', () => {
        const idx = Number.parseInt((btn as HTMLElement).dataset.caseIdx!, 10);
        const levelData = this.bridge.getScene().getLevelData();
        const lc = levelData.cells.find(c => c.col === col && c.row === row);
        if (lc?.conditionalTextures) {
          lc.conditionalTextures.cases.splice(idx, 1);
          this.showCellForm(col, row);
        }
      });
    }
    this.container.querySelector('#cf-cond-pick-default')?.addEventListener('click', () => {
      this.texturePicker.open((result: PickResult) => {
        const levelData = this.bridge.getScene().getLevelData();
        const lc = levelData.cells.find(c => c.col === col && c.row === row);
        if (!lc?.conditionalTextures) return;
        const tex = result.type === 'spritesheet'
          ? { image: result.key, sourceRect: result.sourceRect, ...(result.scaleX !== undefined || result.scaleY !== undefined ? { transformOverride: { scaleX: result.scaleX ?? 1, scaleY: result.scaleY ?? 1, offsetX: 0, offsetY: 0 } } : {}), ...(result.zOffsetOverride !== undefined ? { zOffsetOverride: result.zOffsetOverride } : {}) }
          : result.key;
        if (!lc.conditionalTextures.default) lc.conditionalTextures.default = [];
        lc.conditionalTextures.default.push(tex);
        this.showCellForm(col, row);
      });
    });
  }

  showDataEntityForm(entityId: string): void {
    const levelData = this.bridge.getScene().getLevelData();
    const entityDef = levelData.entities?.find(e => e.id === entityId);
    if (!entityDef) return;
    // Render the form using a minimal fake entity shell
    const fakeEntity = { id: entityId, tags: new Set<string>() } as import('../../src/ecs/Entity').Entity;
    this.showEntityForm(fakeEntity);
  }

  showEntityForm(entity: import('../../src/ecs/Entity').Entity): void {
    const levelData = this.bridge.getScene().getLevelData();
    let entityDef = levelData.entities?.find(e => e.id === entity.id);
    // Resolve exit's internal trigger to parent exit
    if (!entityDef && entity.id.endsWith('_trigger')) {
      const parentId = entity.id.replace(/_trigger$/, '');
      entityDef = levelData.entities?.find(e => e.id === parentId);
    }
    if (!entityDef) {
      this.container.innerHTML = `<div class="section-header">Entity: ${entity.id}</div><p>No level data found</p>`;
      return;
    }
    const entityId = entityDef.id;

    const data = entityDef.data;
    let typeFields = '';

    // Difficulty field for enemies
    if (['skeleton', 'thrower', 'bug_base', 'bullet_dude', 'puma', 'stalking_robot', 'worm'].includes(entityDef.type)) {
      typeFields += `<div class="form-group"><label>Difficulty</label>
        <select id="ef-diff">${['easy', 'medium', 'hard'].map(d => `<option ${data.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>`;
    }
    if (entityDef.type === 'puma') {
      typeFields += `<div class="form-group"><label>Start Direction (1-8)</label>
        <input type="number" id="ef-dir" value="${data.startDirection ?? 4}" min="1" max="8" /></div>`;
    }
    if (entityDef.type === 'stalking_robot') {
      const wps = (data.waypoints as Array<{col: number; row: number}>) ?? [];
      typeFields += `<div class="form-group"><label>Waypoints (${wps.length})</label>
        <div id="ef-wps">${wps.map((w, i) => `<span style="font-size:11px">${i}: (${w.col},${w.row}) </span>`).join('')}</div>
        <button class="ed-btn" id="ef-add-wp" style="margin-top:4px">Add Waypoint (click canvas)</button></div>`;
    }
    if (entityDef.type === 'trigger') {
      const cells = (data.triggerCells as Array<{col: number; row: number}>) ?? [];
      typeFields += `<div class="form-group"><label>Event to Raise</label>
        <input id="ef-event" value="${data.eventToRaise ?? ''}" /></div>
        <div class="form-group"><label><input type="checkbox" id="ef-oneshot" ${data.oneShot ? 'checked' : ''} /> One Shot</label></div>
        <div class="form-group"><label>Trigger Cells (${cells.length})</label>
        <div id="ef-tcells">${cells.map((c, i) => `<span style="font-size:11px">${i}: (${c.col},${c.row}) </span>`).join('')}</div>
        <button class="ed-btn" id="ef-edit-cells">Edit Cells</button></div>`;
    }
    if (entityDef.type === 'exit') {
      const cells = (data.triggerCells as Array<{col: number; row: number}>) ?? [];
      typeFields += `<div class="form-group"><label>Target Level</label><input id="ef-target" value="${data.targetLevel ?? ''}" /></div>
        <div class="form-group"><label>Target Col</label><input type="number" id="ef-tcol" value="${data.targetCol ?? 0}" /></div>
        <div class="form-group"><label>Target Row</label><input type="number" id="ef-trow" value="${data.targetRow ?? 0}" /></div>
        <div class="form-group" style="display:flex;gap:12px">
          <label><input type="checkbox" id="ef-preserve-col" ${data.preserveCol ? 'checked' : ''} /> Preserve Col</label>
          <label><input type="checkbox" id="ef-preserve-row" ${data.preserveRow ? 'checked' : ''} /> Preserve Row</label>
        </div>
        <div class="form-group"><label>Trigger Cells (${cells.length})</label>
        <div id="ef-tcells">${cells.map((c, i) => `<span style="font-size:11px">${i}: (${c.col},${c.row}) </span>`).join('')}</div>
        <button class="ed-btn" id="ef-edit-cells">Edit Cells</button></div>
        <button class="ed-btn play" id="ef-leave" style="width:100%;margin-top:4px">Leave → ${data.targetLevel ?? '?'}</button>`;
    }
    if (entityDef.type === 'eventchainer') {
      const events = (data.eventsToRaise as Array<{event: string; delayMs: number}>) ?? [];
      typeFields += `<div class="form-group"><label>Events to Raise</label>
        <textarea id="ef-events" rows="4">${JSON.stringify(events, null, 2)}</textarea></div>`;
    }
    if (entityDef.type === 'cellmodifier') {
      const cells = (data.cellsToModify as Array<{ col: number; row: number; properties?: string[]; layer?: number; backgroundTexture?: string }>) ?? [];
      const cellRows = cells.map((c, i) => `<div class="cellmod-row" style="display:grid;grid-template-columns:1fr 1fr 2fr 1fr 2fr auto;gap:4px;align-items:center;margin-bottom:4px">
        <input type="number" class="cm-col" data-i="${i}" value="${c.col}" style="width:100%" placeholder="col" />
        <input type="number" class="cm-row" data-i="${i}" value="${c.row}" style="width:100%" placeholder="row" />
        <input class="cm-props" data-i="${i}" value="${(c.properties ?? []).join(',')}" style="width:100%" placeholder="props" />
        <input type="number" class="cm-layer" data-i="${i}" value="${c.layer ?? ''}" style="width:100%" placeholder="layer" />
        <input class="cm-tex" data-i="${i}" value="${c.backgroundTexture ?? ''}" style="width:100%" placeholder="texture" />
        <button class="ed-btn cm-remove" data-i="${i}" style="padding:2px 6px">✕</button>
      </div>`).join('');
      typeFields += `<div class="form-group"><label>Cells to Modify (${cells.length})</label>
        <div style="font-size:10px;color:#7f8c8d;margin-bottom:4px">col | row | properties | layer | texture</div>
        <div id="ef-cellmod-list">${cellRows}</div>
        <button class="ed-btn" id="ef-cellmod-add" style="margin-top:4px;width:100%">+ Add Cell</button></div>`;
    }
    if (entityDef.type === 'npc') {
      const npcAssets = (data.assets as string) ?? 'npc1';
      const npcAssetOptions = NPC_ASSET_KEYS.includes(npcAssets as typeof NPC_ASSET_KEYS[number])
        ? NPC_ASSET_KEYS
        : [npcAssets, ...NPC_ASSET_KEYS];
      typeFields += `<div class="form-group"><label>Assets</label>
        <select id="ef-assets">${npcAssetOptions.map(a => `<option ${npcAssets === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
        <div class="form-group"><label>Direction</label>
        <select id="ef-npcdir">${['Down', 'Up', 'Left', 'Right', 'DownLeft', 'DownRight', 'UpLeft', 'UpRight', 'facePlayer'].map(d => `<option ${data.direction === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="form-group"><label>Name</label><input id="ef-npcname" value="${data.name ?? ''}" /></div>
        <div class="form-group" style="font-size:11px;color:#7f8c8d;margin-top:4px">Transform</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          <div class="form-group"><label>scaleX</label><input type="number" id="ef-nsx" value="${(data.transformOverride as any)?.scaleX ?? 1}" step="0.1" /></div>
          <div class="form-group"><label>scaleY</label><input type="number" id="ef-nsy" value="${(data.transformOverride as any)?.scaleY ?? 1}" step="0.1" /></div>
          <div class="form-group"><label>offsetX</label><input type="number" id="ef-nox" value="${(data.transformOverride as any)?.offsetX ?? 0}" step="1" /></div>
          <div class="form-group"><label>offsetY</label><input type="number" id="ef-noy" value="${(data.transformOverride as any)?.offsetY ?? 0}" step="1" /></div>
        </div>
        <div class="form-group"><label>Interactions (JSON)</label>
        <textarea id="ef-interactions" rows="6">${JSON.stringify(data.interactions ?? [], null, 2)}</textarea></div>`;
    }
    if (entityDef.type === 'breakable') {
      const bData = data as { texture?: string; health?: number; rarity?: string; requiresSuperPunch?: boolean; transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number } };
      typeFields += `<div class="form-group"><label>Texture</label><input id="ef-btex" value="${bData.texture ?? ''}" /></div>
        <div class="form-group"><label>Health</label><input type="number" id="ef-bhealth" value="${bData.health ?? 1}" /></div>
        <div class="form-group"><label>Rarity</label>
        <select id="ef-brarity">${['nothing', 'common', 'uncommon', 'rare', 'epic', 'legendary'].map(r => `<option ${bData.rarity === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
        <div class="form-group"><label><input type="checkbox" id="ef-bsuper" ${bData.requiresSuperPunch ? 'checked' : ''} /> Requires Super Punch</label></div>
        <div class="form-group"><label>Scale X</label><input type="number" step="0.1" id="ef-bsx" value="${bData.transformOverride?.scaleX ?? 1}" /></div>
        <div class="form-group"><label>Scale Y</label><input type="number" step="0.1" id="ef-bsy" value="${bData.transformOverride?.scaleY ?? 1}" /></div>
        <div class="form-group"><label>Offset X</label><input type="number" id="ef-box" value="${bData.transformOverride?.offsetX ?? 0}" /></div>
        <div class="form-group"><label>Offset Y</label><input type="number" id="ef-boy" value="${bData.transformOverride?.offsetY ?? 0}" /></div>`;
    }
    if (entityDef.type === 'pushable') {
      typeFields += `<div class="form-group"><label>Texture</label><input id="ef-ptex" value="${data.texture ?? ''}" /></div>
        <div class="form-group"><label><input type="checkbox" id="ef-push-enabled" ${data.pushEnabled !== false ? 'checked' : ''} /> Push Enabled</label></div>
        <div class="form-group"><label><input type="checkbox" id="ef-push-persist" ${data.doesPersist ? 'checked' : ''} /> Persist Position</label></div>
        <div class="form-group"><label><input type="checkbox" id="ef-push-single" ${data.singlePushOnly ? 'checked' : ''} /> Single Push Only</label></div>`;
    }
    if (entityDef.type === 'moving_tile') {
      const mtData = data as { texture?: string; widthCells?: number; heightCells?: number; script?: unknown };
      typeFields += `<div class="form-group"><label>Texture</label>
        <div style="display:flex;gap:4px">
          <input id="ef-mt-tex" value="${mtData.texture ?? MOVING_TILE_DEFAULT_TEXTURE}" style="flex:1" />
          <button class="ed-btn" id="ef-mt-pick">Pick</button>
        </div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          <div class="form-group"><label>Width (cells)</label><input type="number" id="ef-mt-w" value="${mtData.widthCells ?? 1}" min="1" /></div>
          <div class="form-group"><label>Height (cells)</label><input type="number" id="ef-mt-h" value="${mtData.heightCells ?? 1}" min="1" /></div>
        </div>
        <div class="form-group"><label>Script (JSON, loops forever)</label>
        <div style="font-size:10px;color:#7f8c8d;margin-bottom:4px">{ "waitMs": 2000 } | { "moveTo": { "col": 10, "row": 15 }, "speedCellsPerSec": 5 }</div>
        <textarea id="ef-mt-script" rows="8">${JSON.stringify(mtData.script ?? [], null, 2)}</textarea></div>`;
    }
    if (entityDef.type === 'hole') {
      const holeData = data as { texture?: string; targetLevel?: string; targetCol?: number; targetRow?: number; transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number } };
      typeFields += `<div class="form-group"><label>Texture</label><input id="ef-htex" value="${holeData.texture ?? 'hole_with_roots'}" /></div>
        <div class="form-group"><label>Target Level</label><input id="ef-htarget" value="${holeData.targetLevel ?? ''}" /></div>
        <div class="form-group"><label>Target Col</label><input type="number" id="ef-htcol" value="${holeData.targetCol ?? 0}" /></div>
        <div class="form-group"><label>Target Row</label><input type="number" id="ef-htrow" value="${holeData.targetRow ?? 0}" /></div>
        <div class="form-group"><label>Scale X</label><input type="number" step="0.1" id="ef-hsx" value="${holeData.transformOverride?.scaleX ?? 1}" /></div>
        <div class="form-group"><label>Scale Y</label><input type="number" step="0.1" id="ef-hsy" value="${holeData.transformOverride?.scaleY ?? 1}" /></div>
        <div class="form-group"><label>Offset X</label><input type="number" id="ef-hox" value="${holeData.transformOverride?.offsetX ?? 0}" /></div>
        <div class="form-group"><label>Offset Y</label><input type="number" id="ef-hoy" value="${holeData.transformOverride?.offsetY ?? 0}" /></div>
        <button class="ed-btn play" id="ef-hleave" style="width:100%;margin-top:4px">Leave → ${holeData.targetLevel || '?'}</button>`;
    }
    if (entityDef.type === 'lever') {
      typeFields += `<div class="form-group"><label>Event to Raise</label>
        <input id="ef-lever-event" value="${data.eventToRaise ?? ''}" /></div>
        <div class="form-group"><label>Start State</label>
        <select id="ef-lever-state">${['off', 'on'].map(s => `<option ${data.startState === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="form-group"><label><input type="checkbox" id="ef-lever-oneshot" ${data.oneShot ? 'checked' : ''} /> One Shot</label></div>`;
    }
    if (entityDef.type === 'laser') {
      typeFields += `<div class="form-group"><label>Angle (degrees)</label>
        <input type="number" id="ef-laser-angle" value="${data.angle ?? 0}" min="0" max="359" /></div>
        <div class="form-group"><label>Flag Name</label>
        <input id="ef-laser-flag" value="${data.flagName ?? `${entityId}_laser_on`}" /></div>
        <div class="form-group"><label>Destroy on Event</label>
        <input id="ef-laser-destroy" value="${data.onDestroyEvent ?? ''}" placeholder="(optional)" /></div>`;
    }
    if (entityDef.type === 'root_chest') {
      const rcData = data as { specialItem?: string };
      typeFields += `<div class="form-group"><label>Special Item</label>
        <select id="ef-rc-item">${['mushroom', 'boots', 'max_health_increase', 'bandage', 'autoheal', 'push_strength'].map(i => `<option ${rcData.specialItem === i ? 'selected' : ''}>${i}</option>`).join('')}</select></div>`;
    }
    if (entityDef.type === 'escort') {
      const eData = data as { escortType?: string; destinationLevel?: string; destinationCol?: number; destinationRow?: number; awakeOnEvent?: string; reachDistance?: number; followSpeed?: number; followToLevels?: string[]; enemyDetectDistancePx?: number; scale?: number; shadowScale?: number; shadowOffsetX?: number; shadowOffsetY?: number };
      typeFields += `<div class="form-group"><label>Escort Type</label><input id="ef-etype" value="${eData.escortType ?? 'knight'}" /></div>
        <div class="form-group"><label>Awake on Event</label><input id="ef-eawake" value="${eData.awakeOnEvent ?? ''}" /></div>
        <div class="form-group"><label>Destination Level</label><input id="ef-edlevel" value="${eData.destinationLevel ?? ''}" /></div>
        <div class="form-group"><label>Destination Col</label><input type="number" id="ef-edcol" value="${eData.destinationCol ?? 0}" /></div>
        <div class="form-group"><label>Destination Row</label><input type="number" id="ef-edrow" value="${eData.destinationRow ?? 0}" /></div>
        <div class="form-group"><label>Reach Distance</label><input type="number" id="ef-ereach" value="${eData.reachDistance ?? 15}" /></div>
        <div class="form-group"><label>Follow Speed</label><input type="number" id="ef-espeed" value="${eData.followSpeed ?? 200}" /></div>
        <div class="form-group"><label>Follow to Levels (comma-sep)</label><input id="ef-elevels" value="${(eData.followToLevels ?? []).join(', ')}" /></div>
        <div class="form-group"><label>Enemy Detect Px</label><input type="number" id="ef-edetect" value="${eData.enemyDetectDistancePx ?? 128}" /></div>
        <div class="form-group"><label>Scale</label><input type="number" id="ef-escale" value="${eData.scale ?? ''}" step="0.1" placeholder="auto" /></div>
        <div class="form-group"><label>Shadow Scale</label><input type="number" id="ef-eshadowscale" value="${eData.shadowScale ?? 1}" step="0.1" /></div>
        <div class="form-group"><label>Shadow Offset X</label><input type="number" id="ef-eshadowx" value="${eData.shadowOffsetX ?? 0}" /></div>
        <div class="form-group"><label>Shadow Offset Y</label><input type="number" id="ef-eshadowy" value="${eData.shadowOffsetY ?? 0}" /></div>`;
    }
    if (entityDef.type === 'interaction') {
      typeFields += `<div class="form-group"><label>Filename</label><input id="ef-filename" value="${data.filename ?? ''}" /></div>`;
    }

    this.container.innerHTML = `
      <div class="section-header">Entity: ${entityId}</div>
      <div class="level-info-grid">
        <span class="label">Type</span><span>${entityDef.type}</span>
        <span class="label">Position</span><span>${data.col ?? '—'}, ${data.row ?? '—'}</span>
      </div>
      ${typeFields}
      <div class="section-header" style="margin-top:8px">Event Spawning</div>
      <div class="form-group"><label>Spawn on Any Event (comma-sep)</label>
        <input id="ef-any" value="${(entityDef.createOnAnyEvent ?? []).join(', ')}" /></div>
      <div class="form-group"><label>Spawn on All Events (comma-sep)</label>
        <input id="ef-all" value="${(entityDef.createOnAllEvents ?? []).join(', ')}" /></div>
      <div class="form-group"><label><input type="checkbox" id="ef-respawn" ${entityDef.respawnable ? 'checked' : ''} /> Respawnable</label></div>
      <div style="margin-top:8px"><button class="ed-btn danger" id="ef-delete">Delete Entity</button></div>
    `;

    // Prevent WASD in inputs
    for (const input of this.container.querySelectorAll('input, textarea')) {
      input.addEventListener('keydown', (e: Event) => (e as KeyboardEvent).stopPropagation());
    }

    // Wire up common fields
    this.container.querySelector('#ef-any')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean);
      this.bridge.updateEntityMeta(entityId, { createOnAnyEvent: val });
    });
    this.container.querySelector('#ef-all')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean);
      this.bridge.updateEntityMeta(entityId, { createOnAllEvents: val });
    });
    this.container.querySelector('#ef-respawn')?.addEventListener('change', (e) => {
      this.bridge.updateEntityMeta(entityId, { respawnable: (e.target as HTMLInputElement).checked });
    });
    this.container.querySelector('#ef-delete')?.addEventListener('click', () => {
      this.bridge.removeEntity(entityId);
    });

    // Type-specific wiring
    this.container.querySelector('#ef-diff')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { difficulty: (e.target as HTMLSelectElement).value });
    });
    this.container.querySelector('#ef-dir')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { startDirection: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-event')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { eventToRaise: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-oneshot')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { oneShot: (e.target as HTMLInputElement).checked });
    });
    this.container.querySelector('#ef-edit-cells')?.addEventListener('click', () => {
      const isEditing = this.bridge.editingTriggerCells === entityId;
      this.bridge.editingTriggerCells = isEditing ? null : entityId;
      const btn = this.container.querySelector('#ef-edit-cells') as HTMLButtonElement;
      btn.textContent = isEditing ? 'Edit Cells' : 'Done Editing';
      btn.classList.toggle('save', !isEditing);
    });
    this.container.querySelector('#ef-target')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { targetLevel: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-leave')?.addEventListener('click', () => {
      const target = (this.container.querySelector('#ef-target') as HTMLInputElement)?.value;
      if (target) void this.bridge.loadLevel(target);
    });
    this.container.querySelector('#ef-tcol')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { targetCol: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-trow')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { targetRow: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-preserve-col')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { preserveCol: (e.target as HTMLInputElement).checked || undefined });
    });
    this.container.querySelector('#ef-preserve-row')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { preserveRow: (e.target as HTMLInputElement).checked || undefined });
    });
    this.container.querySelector('#ef-events')?.addEventListener('change', (e) => {
      try { this.bridge.updateEntityData(entityId, { eventsToRaise: JSON.parse((e.target as HTMLTextAreaElement).value) }); } catch { /* invalid json */ }
    });
    // CellModifier structured UI
    const collectCellMods = () => {
      const rows = this.container.querySelectorAll('.cellmod-row');
      const mods: Array<{ col: number; row: number; properties?: string[]; layer?: number; backgroundTexture?: string }> = [];
      for (const row of rows) {
        const col = Number.parseInt((row.querySelector('.cm-col') as HTMLInputElement).value);
        const rowVal = Number.parseInt((row.querySelector('.cm-row') as HTMLInputElement).value);
        const propsStr = (row.querySelector('.cm-props') as HTMLInputElement).value.trim();
        const layerStr = (row.querySelector('.cm-layer') as HTMLInputElement).value.trim();
        const texStr = (row.querySelector('.cm-tex') as HTMLInputElement).value.trim();
        const mod: { col: number; row: number; properties?: string[]; layer?: number; backgroundTexture?: string } = { col, row: rowVal };
        mod.properties = propsStr ? propsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (layerStr !== '') mod.layer = Number.parseInt(layerStr);
        if (texStr) mod.backgroundTexture = texStr;
        mods.push(mod);
      }
      return mods;
    };
    for (const input of this.container.querySelectorAll('.cm-col, .cm-row, .cm-props, .cm-layer, .cm-tex')) {
      input.addEventListener('change', () => {
        this.bridge.updateEntityData(entityId, { cellsToModify: collectCellMods() });
      });
    }
    for (const btn of this.container.querySelectorAll('.cm-remove')) {
      btn.addEventListener('click', () => {
        const mods = collectCellMods();
        const i = Number.parseInt((btn as HTMLElement).dataset.i!);
        mods.splice(i, 1);
        this.bridge.updateEntityData(entityId, { cellsToModify: mods });
        const fakeEntity = { id: entityId, tags: new Set<string>() } as import('../../src/ecs/Entity').Entity;
        this.showEntityForm(fakeEntity);
      });
    }
    this.container.querySelector('#ef-cellmod-add')?.addEventListener('click', () => {
      const mods = collectCellMods();
      mods.push({ col: 0, row: 0, properties: [], layer: 0 });
      this.bridge.updateEntityData(entityId, { cellsToModify: mods });
      const fakeEntity = { id: entityId, tags: new Set<string>() } as import('../../src/ecs/Entity').Entity;
      this.showEntityForm(fakeEntity);
    });
    this.container.querySelector('#ef-assets')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { assets: (e.target as HTMLSelectElement).value });
      this.bridge.respawnEntity(entityId);
    });
    this.container.querySelector('#ef-npcdir')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { direction: (e.target as HTMLSelectElement).value });
    });
    this.container.querySelector('#ef-npcname')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { name: (e.target as HTMLInputElement).value });
    });
    const applyNpcTransform = () => {
      const sx = Number.parseFloat((this.container.querySelector('#ef-nsx') as HTMLInputElement)?.value ?? '1');
      const sy = Number.parseFloat((this.container.querySelector('#ef-nsy') as HTMLInputElement)?.value ?? '1');
      const ox = Number.parseFloat((this.container.querySelector('#ef-nox') as HTMLInputElement)?.value ?? '0');
      const oy = Number.parseFloat((this.container.querySelector('#ef-noy') as HTMLInputElement)?.value ?? '0');
      if (Number.isNaN(sx) || Number.isNaN(sy) || Number.isNaN(ox) || Number.isNaN(oy)) return;
      this.bridge.updateEntityData(entityId, { transformOverride: { scaleX: sx, scaleY: sy, offsetX: ox, offsetY: oy } });
    };
    for (const id of ['#ef-nsx', '#ef-nsy', '#ef-nox', '#ef-noy']) {
      this.container.querySelector(id)?.addEventListener('input', applyNpcTransform);
    }
    this.container.querySelector('#ef-interactions')?.addEventListener('change', (e) => {
      try { this.bridge.updateEntityData(entityId, { interactions: JSON.parse((e.target as HTMLTextAreaElement).value) }); } catch { /* invalid json */ }
    });
    this.container.querySelector('#ef-btex')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { texture: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-bhealth')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { health: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-brarity')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { rarity: (e.target as HTMLSelectElement).value });
    });
    this.container.querySelector('#ef-bsuper')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { requiresSuperPunch: (e.target as HTMLInputElement).checked });
    });
    this.container.querySelector('#ef-bsx')?.addEventListener('change', () => {
      this.bridge.updateEntityData(entityId, { transformOverride: {
        scaleX: Number.parseFloat((this.container.querySelector('#ef-bsx') as HTMLInputElement).value),
        scaleY: Number.parseFloat((this.container.querySelector('#ef-bsy') as HTMLInputElement).value),
        offsetX: Number.parseInt((this.container.querySelector('#ef-box') as HTMLInputElement).value),
        offsetY: Number.parseInt((this.container.querySelector('#ef-boy') as HTMLInputElement).value),
      }});
    });
    this.container.querySelector('#ef-bsy')?.addEventListener('change', () => {
      (this.container.querySelector('#ef-bsx') as HTMLInputElement).dispatchEvent(new Event('change'));
    });
    this.container.querySelector('#ef-box')?.addEventListener('change', () => {
      (this.container.querySelector('#ef-bsx') as HTMLInputElement).dispatchEvent(new Event('change'));
    });
    this.container.querySelector('#ef-boy')?.addEventListener('change', () => {
      (this.container.querySelector('#ef-bsx') as HTMLInputElement).dispatchEvent(new Event('change'));
    });
    this.container.querySelector('#ef-ptex')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { texture: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-push-enabled')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { pushEnabled: (e.target as HTMLInputElement).checked });
    });
    this.container.querySelector('#ef-push-persist')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { doesPersist: (e.target as HTMLInputElement).checked });
    });
    this.container.querySelector('#ef-push-single')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { singlePushOnly: (e.target as HTMLInputElement).checked });
    });
    const setMovingTileTexture = (texture: string) => {
      this.bridge.updateEntityData(entityId, { texture });
      this.bridge.respawnEntity(entityId);
    };
    this.container.querySelector('#ef-mt-tex')?.addEventListener('change', (e) => {
      setMovingTileTexture((e.target as HTMLInputElement).value);
    });
    this.container.querySelector('#ef-mt-pick')?.addEventListener('click', () => {
      this.texturePicker.open((result: PickResult) => {
        if (result.type === 'spritesheet') return;
        setMovingTileTexture(result.key);
      });
    });
    for (const id of ['#ef-mt-w', '#ef-mt-h']) {
      this.container.querySelector(id)?.addEventListener('change', () => {
        const widthCells = Number.parseInt((this.container.querySelector('#ef-mt-w') as HTMLInputElement).value);
        const heightCells = Number.parseInt((this.container.querySelector('#ef-mt-h') as HTMLInputElement).value);
        if (Number.isNaN(widthCells) || Number.isNaN(heightCells)) return;
        this.bridge.updateEntityData(entityId, {
          widthCells: Math.max(1, widthCells),
          heightCells: Math.max(1, heightCells),
        });
        this.bridge.respawnEntity(entityId);
      });
    }
    this.container.querySelector('#ef-mt-script')?.addEventListener('change', (e) => {
      const textarea = e.target as HTMLTextAreaElement;
      try {
        const parsed = JSON.parse(textarea.value);
        if (!Array.isArray(parsed)) throw new TypeError('script must be an array of steps');
        this.bridge.updateEntityData(entityId, { script: parsed });
        textarea.style.borderColor = '';
      } catch {
        textarea.style.borderColor = '#e74c3c';
      }
    });
    this.container.querySelector('#ef-htex')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { texture: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-htarget')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { targetLevel: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-htcol')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { targetCol: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-htrow')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { targetRow: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    for (const id of ['#ef-hsx', '#ef-hsy', '#ef-hox', '#ef-hoy']) {
      this.container.querySelector(id)?.addEventListener('change', () => {
        const sx = Number.parseFloat((this.container.querySelector('#ef-hsx') as HTMLInputElement)?.value ?? '1');
        const sy = Number.parseFloat((this.container.querySelector('#ef-hsy') as HTMLInputElement)?.value ?? '1');
        const ox = Number.parseFloat((this.container.querySelector('#ef-hox') as HTMLInputElement)?.value ?? '0');
        const oy = Number.parseFloat((this.container.querySelector('#ef-hoy') as HTMLInputElement)?.value ?? '0');
        this.bridge.updateEntityData(entityId, { transformOverride: { scaleX: sx, scaleY: sy, offsetX: ox, offsetY: oy } });
      });
    }
    this.container.querySelector('#ef-hleave')?.addEventListener('click', () => {
      const target = (this.container.querySelector('#ef-htarget') as HTMLInputElement)?.value;
      if (target) void this.bridge.loadLevel(target);
    });
    this.container.querySelector('#ef-filename')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { filename: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-lever-event')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { eventToRaise: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-lever-state')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { startState: (e.target as HTMLSelectElement).value });
    });
    this.container.querySelector('#ef-lever-oneshot')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { oneShot: (e.target as HTMLInputElement).checked });
    });
    this.container.querySelector('#ef-laser-angle')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { angle: Number((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-laser-flag')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { flagName: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-laser-destroy')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      this.bridge.updateEntityData(entityId, { onDestroyEvent: val || undefined });
    });
    // Root chest fields
    this.container.querySelector('#ef-rc-item')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { specialItem: (e.target as HTMLSelectElement).value });
    });
    // Escort fields
    this.container.querySelector('#ef-etype')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { escortType: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-eawake')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { awakeOnEvent: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-edlevel')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { destinationLevel: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-edcol')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { destinationCol: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-edrow')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { destinationRow: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-ereach')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { reachDistance: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-espeed')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { followSpeed: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-elevels')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { followToLevels: (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) });
    });
    this.container.querySelector('#ef-edetect')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { enemyDetectDistancePx: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-escale')?.addEventListener('change', (e) => {
      const v = Number.parseFloat((e.target as HTMLInputElement).value);
      this.bridge.updateEntityData(entityId, v ? { scale: v } : {});
    });
    this.container.querySelector('#ef-eshadowscale')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { shadowScale: Number.parseFloat((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-eshadowx')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { shadowOffsetX: Number.parseFloat((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-eshadowy')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { shadowOffsetY: Number.parseFloat((e.target as HTMLInputElement).value) });
    });
  }

  showDrawingPanel(): void {
    this.container.innerHTML = `
      <div class="section-header">Drawing Area</div>
      <p style="font-size:11px;color:#95a5a6;margin:4px 0 8px">Click to add vertices. Click near the first point to close.</p>
      <button class="ed-btn danger" id="cancel-drawing" style="width:100%">Cancel Drawing</button>
    `;
    this.container.querySelector('#cancel-drawing')?.addEventListener('click', () => {
      this.bridge.cancelDrawing?.();
    });
  }

  showBlockedAreaForm(areaId: string): void {
    const levelData = this.bridge.getScene().getLevelData();
    const area = levelData.blockedAreas?.find(a => a.id === areaId);
    if (!area) { this.clear(); return; }

    this.container.innerHTML = `
      <h3 style="margin:0 0 8px;color:#e0e0e0">Blocked Area: ${area.id}</h3>
      <div class="form-group"><label>Layer</label>
        <input type="number" id="ba-layer" value="${area.layer}" min="0" max="2" style="width:50px" /></div>
      <div class="form-group"><label style="display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="ba-projectiles" ${area.blocksProjectiles ? 'checked' : ''} /> Blocks Projectiles</label></div>
      <div class="form-group" style="color:#7f8c8d;font-size:11px">${area.vertices.length} vertices</div>
      <button class="ed-btn" id="ba-delete" style="background:#c0392b;margin-top:8px">Delete</button>
    `;

    this.container.querySelector('#ba-layer')?.addEventListener('change', (e) => {
      this.bridge.updateBlockedArea(areaId, { layer: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ba-projectiles')?.addEventListener('change', (e) => {
      this.bridge.updateBlockedArea(areaId, { blocksProjectiles: (e.target as HTMLInputElement).checked });
    });
    this.container.querySelector('#ba-delete')?.addEventListener('click', () => {
      this.bridge.removeBlockedArea(areaId);
      this.clear();
    });
  }
}
