import type { EditorBridge } from '../EditorBridge';
import { SPRITESHEET_TEXTURES } from '../SpritesheetTextures';
import type { SourceRect } from '../SpritesheetTextures';

const BACKGROUND_TEXTURE_KEYS = [
  'bed1', 'bench1', 'bridge_h', 'bridge_v', 'bush1', 'bush2', 'chair1', 'chair2',
  'door_closed', 'dungeon_door', 'dungeon_floor', 'dungeon_key', 'dungeon_platform',
  'dungeon_window', 'fence1', 'fireplace1', 'house1', 'house2', 'house3',
  'interior6', 'interior_door1', 'interior_door2', 'kitchen1', 'pillar',
  'rocks1', 'rocks2', 'rocks3', 'rocks4', 'rocks5', 'rocks6',
  'rug1', 'rug2', 'rug3', 'rug4', 'rug5', 'rug6', 'rug7', 'rug8',
  'stone_floor', 'stone_stairs', 'stone_wall', 'submerged_rock1',
  'table1', 'table2', 'tree1', 'tree2', 'wall_torch',
  'sconce_bg', 'grass1', 'grass2', 'rock', 'dungeon_vase',
];

const ANIMATED_TEXTURE_KEYS = [
  'sconce_flame', 'fire_interior', 'sconce',
];

// Keys to exclude from the general picker (non-visual / internal textures)
const EXCLUDE_KEYS = new Set([
  '__DEFAULT', '__MISSING', '__WHITE', 'vignette', 'shadow',
  'water_ripple', 'rock_spritesheet', 'dog_spritesheet', 'attacker',
  'coin', 'medi_pack', 'open_hand_icon', 'crosshair', 'smoke', 'lips',
  'slide_icon', 'stone_ring', 'stone_bg', 'hud_rings', 'arrows',
  'water_splash', 'fire', 'bark_icon', 'rock_icon', 'fear_icon', 'lips_icon',
  ...ANIMATED_TEXTURE_KEYS, // animated textures shown in separate tab
]);

type Tab = 'background' | 'animated' | 'spritesheet' | 'all';

export type PickResult =
  | { type: 'image'; key: string }
  | { type: 'animated'; key: string }
  | { type: 'spritesheet'; key: string; sourceRect: SourceRect; scaleX?: number; scaleY?: number };

export class TexturePicker {
  private overlay: HTMLElement | null = null;

  constructor(private readonly bridge: EditorBridge) {}

  open(onPick: (result: PickResult) => void): void {
    this.close();

    const scene = this.bridge.getScene();
    const loadedKeys = Object.keys(scene.textures.list);

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;
      display:flex;flex-direction:column;padding:16px;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;flex-wrap:wrap';

    const search = document.createElement('input');
    search.placeholder = 'Search...';
    search.style.cssText = 'flex:1;min-width:120px;background:#1a1a2e;color:#e0e0e0;border:1px solid #0f3460;padding:6px 10px;border-radius:3px;font-size:13px';
    search.addEventListener('keydown', e => e.stopPropagation());

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.className = 'ed-btn danger';
    closeBtn.addEventListener('click', () => this.close());

    const tabs = document.createElement('div');
    tabs.style.cssText = 'display:flex;gap:4px';
    const tabDefs: Array<{ id: Tab; label: string }> = [
      { id: 'background', label: 'Background' },
      { id: 'animated', label: 'Animated' },
      { id: 'spritesheet', label: 'Spritesheet' },
      { id: 'all', label: 'All' },
    ];
    let activeTab: Tab = 'background';
    const tabBtns: Map<Tab, HTMLButtonElement> = new Map();
    for (const t of tabDefs) {
      const btn = document.createElement('button');
      btn.className = 'ed-btn' + (t.id === activeTab ? ' active' : '');
      btn.textContent = t.label;
      btn.addEventListener('click', () => {
        activeTab = t.id;
        for (const [id, b] of tabBtns) b.classList.toggle('active', id === activeTab);
        renderGrid(search.value);
      });
      tabBtns.set(t.id, btn);
      tabs.appendChild(btn);
    }

    header.appendChild(search);
    header.appendChild(tabs);
    header.appendChild(closeBtn);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;overflow-y:auto;flex:1;align-items:start;align-content:start';

    const addItem = (label: string, drawFn: (canvas: HTMLCanvasElement) => void, onClick: () => void): void => {
      if (label.toLowerCase().includes(search.value.toLowerCase()) === false) return;
      const item = document.createElement('div');
      item.style.cssText = 'background:#1a1a2e;border:2px solid #0f3460;border-radius:4px;cursor:pointer;padding:4px;display:flex;flex-direction:column;align-items:center;gap:4px';
      item.addEventListener('mouseenter', () => { item.style.borderColor = '#e94560'; });
      item.addEventListener('mouseleave', () => { item.style.borderColor = '#0f3460'; });
      item.addEventListener('click', () => { onClick(); this.close(); });

      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      canvas.style.cssText = 'width:64px;height:64px;image-rendering:pixelated';
      try { drawFn(canvas); } catch { /* show blank */ }
      item.appendChild(canvas);

      const lbl = document.createElement('div');
      lbl.textContent = label;
      lbl.style.cssText = 'font-size:9px;color:#95a5a6;text-align:center;word-break:break-all;max-width:80px';
      item.appendChild(lbl);
      grid.appendChild(item);
    };

    const drawFullTexture = (key: string) => (canvas: HTMLCanvasElement) => {
      const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
      canvas.getContext('2d')!.drawImage(src as CanvasImageSource, 0, 0, 64, 64);
    };

    const drawSourceRect = (key: string, r: SourceRect) => (canvas: HTMLCanvasElement) => {
      const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
      const sx = Math.max(0, r.x), sy = Math.max(0, r.y);
      canvas.getContext('2d')!.drawImage(src as CanvasImageSource, sx, sy, r.width, r.height, 0, 0, 64, 64);
    };

    const renderGrid = (filter: string): void => {
      grid.innerHTML = '';
      search.value = filter;

      if (activeTab === 'background') {
        for (const key of BACKGROUND_TEXTURE_KEYS) {
          if (!loadedKeys.includes(key)) continue;
          addItem(key, drawFullTexture(key), () => onPick({ type: 'image', key }));
        }
      } else if (activeTab === 'animated') {
        for (const key of ANIMATED_TEXTURE_KEYS) {
          if (!loadedKeys.includes(key)) continue;
          addItem(key, drawFullTexture(key), () => onPick({ type: 'animated', key }));
        }
      } else if (activeTab === 'spritesheet') {
        for (const sheet of SPRITESHEET_TEXTURES) {
          if (!loadedKeys.includes(sheet.textureKey)) continue;
          for (const sprite of sheet.sprites) {
            addItem(`${sheet.textureKey}/${sprite.name}`,
              drawSourceRect(sheet.textureKey, sprite.sourceRect),
              () => onPick({ type: 'spritesheet', key: sheet.textureKey, sourceRect: sprite.sourceRect, scaleX: sprite.scaleX, scaleY: sprite.scaleY })
            );
          }
        }
      } else {
        for (const key of loadedKeys.filter(k => !EXCLUDE_KEYS.has(k))) {
          addItem(key, drawFullTexture(key), () => onPick({ type: 'image', key }));
        }
      }

      if (grid.children.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'color:#7f8c8d;font-size:12px;padding:16px;grid-column:1/-1';
        empty.textContent = 'No textures found.';
        grid.appendChild(empty);
      }
    };

    renderGrid('');
    search.addEventListener('input', () => renderGrid(search.value));

    this.overlay.appendChild(header);
    this.overlay.appendChild(grid);
    document.body.appendChild(this.overlay);
    search.focus();
  }

  close(): void {
    this.overlay?.remove();
    this.overlay = null;
  }
}
