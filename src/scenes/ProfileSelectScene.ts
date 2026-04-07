import Phaser from 'phaser';

export default class ProfileSelectScene extends Phaser.Scene {
  constructor() {
    super('profile_select');
  }

  preload(): void {
    this.load.image('profile_select_bg', 'assets/concept/profile_select.png');
  }

  async create(): Promise<void> {
    const { width, height } = this.cameras.main;
    const bg = this.add.image(width / 2, height / 2, 'profile_select_bg');
    bg.setDisplaySize(width, height);

    this.cameras.main.fadeIn(500);

    // Check which profiles exist
    let existing: string[] = [];
    try {
      const res = await fetch('/api/profiles');
      existing = await res.json() as string[];
    } catch { /* dev server may not be ready */ }

    const existingSet = new Set(existing);
    const slotY = [height * 0.35, height * 0.5, height * 0.65];

    for (let i = 0; i < 3; i++) {
      const profileName = `Profile${i + 1}`;
      const hasProfile = existingSet.has(profileName);
      let label = `Slot ${i + 1} — Empty`;

      if (hasProfile) {
        try {
          const res = await fetch(`/states/${profileName}.json`);
          const data = await res.json() as { timePlayed?: number };
          const totalSec = Math.floor(data.timePlayed ?? 0);
          const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
          const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
          const s = String(totalSec % 60).padStart(2, '0');
          label = `Slot ${i + 1} — ${h}:${m}:${s}`;
        } catch {
          label = `Slot ${i + 1} — ${profileName}`;
        }
      }

      const slot = this.add.text(width / 2, slotY[i], label, {
        fontSize: '24px', color: '#aaaaaa', fontFamily: 'sans-serif',
        backgroundColor: '#00000088', padding: { x: 40, y: 12 },
      });
      slot.setOrigin(0.5);
      slot.setInteractive({ useHandCursor: true });
      slot.on('pointerover', () => slot.setColor('#ffffff'));
      slot.on('pointerout', () => slot.setColor('#aaaaaa'));
      slot.on('pointerdown', () => {
        this.input.removeAllListeners();
        this.launchProfile(profileName, hasProfile);
      });
    }
  }

  private async launchProfile(profileName: string, exists: boolean): Promise<void> {
    if (!exists) {
      try {
        await fetch('/api/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: profileName })
        });
      } catch { /* will fall back to empty state */ }
    }

    this.cameras.main.fadeOut(500);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('game', { profileName });
    });
  }
}
