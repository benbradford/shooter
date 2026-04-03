import type { EditorBridge } from '../EditorBridge';

// Keys to exclude from the texture picker (non-visual / internal textures)
const EXCLUDE_KEYS = new Set([
  '__DEFAULT', '__MISSING', '__WHITE', 'vignette', 'shadow',
  'water_ripple', 'rock_spritesheet', 'dog_spritesheet', 'attacker',
  'coin', 'medi_pack', 'open_hand_icon', 'crosshair', 'smoke', 'lips',
  'slide_icon', 'stone_ring', 'stone_bg', 'hud_rings', 'arrows',
  'water_splash', 'fire', 'bark_icon', 'rock_icon', 'fear_icon', 'lips_icon',
]);

export class TexturePicker {
  private overlay: HTMLElement | null = null;

  constructor(private readonly bridge: EditorBridge) {}

  open(onPick: (key: string) => void): void {
    this.close();

    const scene = this.bridge.getScene();
    const keys = Object.keys(scene.textures.list).filter(k => !EXCLUDE_KEYS.has(k));

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;
      display:flex;flex-direction:column;padding:16px;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;align-items:center';

    const search = document.createElement('input');
    search.placeholder = 'Search textures...';
    search.style.cssText = 'flex:1;background:#1a1a2e;color:#e0e0e0;border:1px solid #0f3460;padding:6px 10px;border-radius:3px;font-size:13px';
    search.addEventListener('keydown', e => e.stopPropagation());

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.className = 'ed-btn danger';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(search);
    header.appendChild(closeBtn);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;overflow-y:auto;flex:1';

    const renderGrid = (filter: string): void => {
      grid.innerHTML = '';
      const filtered = keys.filter(k => k.toLowerCase().includes(filter.toLowerCase()));
      for (const key of filtered) {
        const item = document.createElement('div');
        item.style.cssText = 'background:#1a1a2e;border:2px solid #0f3460;border-radius:4px;cursor:pointer;padding:4px;display:flex;flex-direction:column;align-items:center;gap:4px';
        item.addEventListener('mouseenter', () => { item.style.borderColor = '#e94560'; });
        item.addEventListener('mouseleave', () => { item.style.borderColor = '#0f3460'; });
        item.addEventListener('click', () => {
          onPick(key);
          this.close();
        });

        // Render texture as canvas thumbnail
        try {
          const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
          const canvas = document.createElement('canvas');
          canvas.width = 64; canvas.height = 64;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(src as CanvasImageSource, 0, 0, 64, 64);
          canvas.style.cssText = 'width:64px;height:64px;image-rendering:pixelated';
          item.appendChild(canvas);
        } catch {
          const placeholder = document.createElement('div');
          placeholder.style.cssText = 'width:64px;height:64px;background:#0f3460;display:flex;align-items:center;justify-content:center;font-size:10px;color:#7f8c8d';
          placeholder.textContent = '?';
          item.appendChild(placeholder);
        }

        const label = document.createElement('div');
        label.textContent = key;
        label.style.cssText = 'font-size:9px;color:#95a5a6;text-align:center;word-break:break-all;max-width:80px';
        item.appendChild(label);
        grid.appendChild(item);
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
