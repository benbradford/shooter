import Phaser from 'phaser';

import { WorldStateManager } from '../systems/WorldStateManager';

const SLOT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '24px', color: '#aaaaaa', fontFamily: 'sans-serif',
  backgroundColor: '#00000088', padding: { x: 40, y: 12 },
};
const BTN_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '20px', color: '#aaaaaa', fontFamily: 'sans-serif',
  backgroundColor: '#00000088', padding: { x: 20, y: 8 },
};

export default class ProfileSelectScene extends Phaser.Scene {
  constructor() {
    super('profile_select');
  }

  preload(): void {
    this.load.image('profile_select_bg', 'assets/concept/profile_select.png');
  }

  create(): void {
    void this.buildUI();
  }

  private async buildUI(): Promise<void> {
    this.children.removeAll(true);
    const { width, height } = this.cameras.main;
    const bg = this.add.image(width / 2, height / 2, 'profile_select_bg');
    bg.setDisplaySize(width, height);

    this.cameras.main.fadeIn(500);

    let existing: string[] = [];
    const isLocal = await WorldStateManager.shouldUseLocalStorage();
    if (isLocal) {
      for (let i = 1; i <= 3; i++) {
        if (localStorage.getItem(`state_Profile${i}`)) existing.push(`Profile${i}`);
      }
    } else {
      try {
        const res = await fetch('/api/profiles');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        existing = await res.json() as string[];
      } catch {
        for (let i = 1; i <= 3; i++) {
          if (localStorage.getItem(`state_Profile${i}`)) existing.push(`Profile${i}`);
        }
      }
    }

    const existingSet = new Set(existing);
    const slotY = [height * 0.35, height * 0.5, height * 0.65];

    for (let i = 0; i < 3; i++) {
      const profileName = `Profile${i + 1}`;
      const hasProfile = existingSet.has(profileName);
      let label = `Slot ${i + 1} — Empty`;

      if (hasProfile) {
        try {
          let data: { timePlayed?: number } | null = null;
          const localData = localStorage.getItem(`state_${profileName}`);
          if (localData) {
            data = JSON.parse(localData) as { timePlayed?: number };
          } else {
            const res = await fetch(`/states/${profileName}.json`);
            data = await res.json() as { timePlayed?: number };
          }
          const totalSec = Math.floor(data?.timePlayed ?? 0);
          const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
          const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
          const s = String(totalSec % 60).padStart(2, '0');
          label = `Slot ${i + 1} — ${h}:${m}:${s}`;
        } catch {
          label = `Slot ${i + 1} — ${profileName}`;
        }
      }

      const slot = this.add.text(width / 2, slotY[i], label, SLOT_STYLE);
      slot.setOrigin(0.5);
      slot.setInteractive({ useHandCursor: true });
      slot.on('pointerover', () => slot.setColor('#ffffff'));
      slot.on('pointerout', () => slot.setColor('#aaaaaa'));
      slot.on('pointerdown', () => {
        if (hasProfile) {
          this.showPlayDeleteMenu(profileName, slotY[i]);
        } else {
          this.launchProfile(profileName, false);
        }
      });
    }
  }

  private showPlayDeleteMenu(profileName: string, y: number): void {
    // Disable all slot interactions
    this.input.removeAllListeners();
    for (const child of this.children.getAll()) {
      (child as Phaser.GameObjects.Text).removeInteractive?.();
    }

    const { width } = this.cameras.main;
    const overlay = this.add.rectangle(width / 2, y, 400, 50, 0x000000, 0.7);

    const playBtn = this.add.text(width / 2 - 60, y, 'Play', BTN_STYLE);
    playBtn.setOrigin(0.5);
    playBtn.setInteractive({ useHandCursor: true });
    playBtn.on('pointerover', () => playBtn.setColor('#00ff00'));
    playBtn.on('pointerout', () => playBtn.setColor('#aaaaaa'));
    playBtn.on('pointerdown', () => this.launchProfile(profileName, true));

    const deleteBtn = this.add.text(width / 2 + 60, y, 'Delete', BTN_STYLE);
    deleteBtn.setOrigin(0.5);
    deleteBtn.setInteractive({ useHandCursor: true });
    deleteBtn.on('pointerover', () => deleteBtn.setColor('#ff4444'));
    deleteBtn.on('pointerout', () => deleteBtn.setColor('#aaaaaa'));
    deleteBtn.on('pointerdown', () => {
      overlay.destroy(); playBtn.destroy(); deleteBtn.destroy();
      this.showConfirmDelete(profileName, y);
    });
  }

  private showConfirmDelete(profileName: string, y: number): void {
    const { width } = this.cameras.main;
    const prompt = this.add.text(width / 2, y - 20, 'Are you sure?', { fontSize: '20px', color: '#ff4444', fontFamily: 'sans-serif' });
    prompt.setOrigin(0.5);

    const yesBtn = this.add.text(width / 2 - 50, y + 15, 'Yes', BTN_STYLE);
    yesBtn.setOrigin(0.5);
    yesBtn.setInteractive({ useHandCursor: true });
    yesBtn.on('pointerover', () => yesBtn.setColor('#ff4444'));
    yesBtn.on('pointerout', () => yesBtn.setColor('#aaaaaa'));
    yesBtn.on('pointerdown', () => {
      localStorage.removeItem(`state_${profileName}`);
      void fetch('/api/delete-profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName })
      }).catch(() => { /* server unavailable, localStorage already cleared */ });
      void this.buildUI();
    });

    const noBtn = this.add.text(width / 2 + 50, y + 15, 'No', BTN_STYLE);
    noBtn.setOrigin(0.5);
    noBtn.setInteractive({ useHandCursor: true });
    noBtn.on('pointerover', () => noBtn.setColor('#ffffff'));
    noBtn.on('pointerout', () => noBtn.setColor('#aaaaaa'));
    noBtn.on('pointerdown', () => void this.buildUI());
  }

  private launchProfile(profileName: string, exists: boolean): void {
    this.input.removeAllListeners();
    if (!exists) {
      void WorldStateManager.shouldUseLocalStorage().then(isLocal => {
        if (isLocal) {
          const emptyState = JSON.stringify({
            timePlayed: 0,
            player: { health: 100, coins: 0, currentLevel: 'house3_interior', spawnCol: 1, spawnRow: 3 },
            flags: { canPunch: 'false' },
            levels: {}
          });
          localStorage.setItem(`state_${profileName}`, emptyState);
        } else {
          void fetch('/api/create-profile', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: profileName })
          }).catch(() => { /* server unavailable */ });
        }
      });
    }
    this.cameras.main.fadeOut(500);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('game', { profileName });
    });
  }
}
