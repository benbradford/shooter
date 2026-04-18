import Phaser from 'phaser';

import { WorldStateManager } from '../systems/WorldStateManager';

const SLOT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '24px', color: '#aaaaaa', fontFamily: 'sans-serif',
  backgroundColor: '#00000088', padding: { x: 40, y: 12 },
};
const BTN_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '28px', color: '#aaaaaa', fontFamily: 'sans-serif',
  backgroundColor: '#00000088', padding: { x: 32, y: 14 },
};
const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '32px', color: '#ffffff', fontFamily: 'sans-serif',
};
const WARN_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '24px', color: '#ff4444', fontFamily: 'sans-serif',
};

export default class ProfileSelectScene extends Phaser.Scene {
  constructor() {
    super('profile_select');
  }

  preload(): void {
    this.load.image('profile_select_bg', 'assets/concept/profile_select.png');
  }

  create(): void {
    void this.showSlotList();
  }

  private async showSlotList(): Promise<void> {
    this.children.removeAll(true);
    this.input.removeAllListeners();
    const { width, height } = this.cameras.main;
    this.addBackground(width, height);

    this.cameras.main.fadeIn(500);

    const profiles = await this.getExistingProfiles();
    const existingSet = new Set(profiles);
    const slotY = [height * 0.35, height * 0.5, height * 0.65];

    for (let i = 0; i < 3; i++) {
      const profileName = `Profile${i + 1}`;
      const hasProfile = existingSet.has(profileName);
      const label = hasProfile
        ? await this.getProfileLabel(i + 1, profileName)
        : `Slot ${i + 1} — Empty`;

      const slot = this.add.text(width / 2, slotY[i], label, SLOT_STYLE);
      slot.setOrigin(0.5);
      slot.setInteractive({ useHandCursor: true });
      slot.on('pointerover', () => slot.setColor('#ffffff'));
      slot.on('pointerout', () => slot.setColor('#aaaaaa'));
      slot.on('pointerdown', () => {
        if (hasProfile) {
          this.showProfileSubscreen(profileName, label);
        } else {
          this.showNameEntry(profileName);
        }
      });
    }
  }

  private showProfileSubscreen(profileName: string, label: string): void {
    this.children.removeAll(true);
    this.input.removeAllListeners();
    const { width, height } = this.cameras.main;
    this.addBackground(width, height);

    // Profile name on the left
    this.add.text(width * 0.3, height * 0.45, label, LABEL_STYLE).setOrigin(0.5);

    // Play and Delete buttons on the right
    const playBtn = this.add.text(width * 0.7, height * 0.38, 'Play', BTN_STYLE);
    playBtn.setOrigin(0.5);
    playBtn.setInteractive({ useHandCursor: true });
    playBtn.on('pointerover', () => playBtn.setColor('#00ff00'));
    playBtn.on('pointerout', () => playBtn.setColor('#aaaaaa'));
    playBtn.on('pointerdown', () => this.launchProfile(profileName, true));

    const deleteBtn = this.add.text(width * 0.7, height * 0.52, 'Delete', BTN_STYLE);
    deleteBtn.setOrigin(0.5);
    deleteBtn.setInteractive({ useHandCursor: true });
    deleteBtn.on('pointerover', () => deleteBtn.setColor('#ff4444'));
    deleteBtn.on('pointerout', () => deleteBtn.setColor('#aaaaaa'));
    deleteBtn.on('pointerdown', () => this.showConfirmDelete(profileName, label));

    const backBtn = this.add.text(width * 0.7, height * 0.66, 'Back', BTN_STYLE);
    backBtn.setOrigin(0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#aaaaaa'));
    backBtn.on('pointerdown', () => void this.showSlotList());
  }

  private showConfirmDelete(profileName: string, label: string): void {
    this.children.removeAll(true);
    this.input.removeAllListeners();
    const { width, height } = this.cameras.main;
    this.addBackground(width, height);

    // Profile name on the left
    this.add.text(width * 0.3, height * 0.45, label, LABEL_STYLE).setOrigin(0.5);

    // Confirmation on the right
    this.add.text(width * 0.7, height * 0.35, 'Are you sure?', WARN_STYLE).setOrigin(0.5);

    const yesBtn = this.add.text(width * 0.7, height * 0.48, 'Yes, Delete', BTN_STYLE);
    yesBtn.setOrigin(0.5);
    yesBtn.setInteractive({ useHandCursor: true });
    yesBtn.on('pointerover', () => yesBtn.setColor('#ff4444'));
    yesBtn.on('pointerout', () => yesBtn.setColor('#aaaaaa'));
    yesBtn.on('pointerdown', () => {
      localStorage.removeItem(`state_${profileName}`);
      void fetch('/api/delete-profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName })
      }).catch(() => { /* server unavailable */ });
      void this.showSlotList();
    });

    const backBtn = this.add.text(width * 0.7, height * 0.62, 'Back', BTN_STYLE);
    backBtn.setOrigin(0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#aaaaaa'));
    backBtn.on('pointerdown', () => this.showProfileSubscreen(profileName, label));
  }

  private showNameEntry(profileName: string): void {
    this.children.removeAll(true);
    this.input.removeAllListeners();
    const { width, height } = this.cameras.main;
    this.addBackground(width, height);

    this.add.text(width / 2, height * 0.3, 'Enter your name', LABEL_STYLE).setOrigin(0.5);

    const MAX_NAME_LENGTH = 12;
    let currentName = '';

    const nameDisplay = this.add.text(width / 2, height * 0.45, '|', {
      fontSize: '32px', color: '#ffffff', fontFamily: 'sans-serif',
      backgroundColor: '#00000088', padding: { x: 40, y: 12 },
    }).setOrigin(0.5);

    // Blinking cursor
    this.tweens.add({
      targets: nameDisplay,
      alpha: 0.7,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Hidden HTML input for native keyboard
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = MAX_NAME_LENGTH;
    input.autocomplete = 'off';
    input.style.cssText = 'position:fixed;top:-100px;left:0;opacity:0;font-size:16px;';
    document.body.appendChild(input);
    input.focus();

    input.addEventListener('input', () => {
      currentName = input.value.slice(0, MAX_NAME_LENGTH);
      nameDisplay.setText(currentName.length > 0 ? currentName : '|');
      nameDisplay.setAlpha(1);
    });

    // Tap the display to refocus input (in case keyboard dismissed)
    nameDisplay.setInteractive({ useHandCursor: true });
    nameDisplay.on('pointerdown', () => input.focus());

    const startBtn = this.add.text(width / 2, height * 0.62, 'Start', BTN_STYLE);
    startBtn.setOrigin(0.5);
    startBtn.setInteractive({ useHandCursor: true });
    startBtn.on('pointerover', () => startBtn.setColor('#00ff00'));
    startBtn.on('pointerout', () => startBtn.setColor('#aaaaaa'));
    startBtn.on('pointerdown', () => {
      const name = currentName.trim() || 'Player';
      input.remove();
      this.launchProfile(profileName, false, name);
    });

    const backBtn = this.add.text(width / 2, height * 0.75, 'Back', BTN_STYLE);
    backBtn.setOrigin(0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#aaaaaa'));
    backBtn.on('pointerdown', () => {
      input.remove();
      void this.showSlotList();
    });
  }

  private addBackground(width: number, height: number): void {
    const bg = this.add.image(width / 2, height / 2, 'profile_select_bg');
    bg.setDisplaySize(width, height);
  }

  private async getExistingProfiles(): Promise<string[]> {
    const isLocal = await WorldStateManager.shouldUseLocalStorage();
    if (isLocal) {
      const profiles: string[] = [];
      for (let i = 1; i <= 3; i++) {
        if (localStorage.getItem(`state_Profile${i}`)) profiles.push(`Profile${i}`);
      }
      return profiles;
    }
    try {
      const res = await fetch('/api/profiles');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json() as string[];
    } catch {
      const profiles: string[] = [];
      for (let i = 1; i <= 3; i++) {
        if (localStorage.getItem(`state_Profile${i}`)) profiles.push(`Profile${i}`);
      }
      return profiles;
    }
  }

  private async getProfileLabel(slotNum: number, profileName: string): Promise<string> {
    try {
      let data: { timePlayed?: number; profileDisplayName?: string } | null = null;
      const localData = localStorage.getItem(`state_${profileName}`);
      if (localData) {
        data = JSON.parse(localData) as { timePlayed?: number; profileDisplayName?: string };
      } else {
        const res = await fetch(`/states/${profileName}.json`);
        data = await res.json() as { timePlayed?: number; profileDisplayName?: string };
      }
      const totalSec = Math.floor(data?.timePlayed ?? 0);
      const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const s = String(totalSec % 60).padStart(2, '0');
      const name = data?.profileDisplayName ?? `Slot ${slotNum}`;
      return `${name} — ${h}:${m}:${s}`;
    } catch {
      return `Slot ${slotNum} — ${profileName}`;
    }
  }

  private launchProfile(profileName: string, exists: boolean, displayName?: string): void {
    this.input.removeAllListeners();
    if (!exists) {
      void WorldStateManager.shouldUseLocalStorage().then(isLocal => {
        const state = {
          timePlayed: 0,
          profileDisplayName: displayName ?? 'Player',
          player: { health: 100, coins: 0, currentLevel: 'house3_interior', spawnCol: 1, spawnRow: 3 },
          flags: { canPunch: 'false' },
          levels: {}
        };
        if (isLocal) {
          localStorage.setItem(`state_${profileName}`, JSON.stringify(state));
        } else {
          void fetch('/api/create-profile', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: profileName })
          }).then(() =>
            fetch('/api/save-state', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ profile: profileName, data: JSON.stringify(state, null, 2) })
            })
          ).catch(() => { /* server unavailable */ });
        }
      });
    }
    this.cameras.main.fadeOut(500);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('game', { profileName });
    });
  }
}
