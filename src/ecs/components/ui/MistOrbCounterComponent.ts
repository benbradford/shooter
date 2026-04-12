import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { Depth } from '../../../constants/DepthConstants';

const ICON_SIZE_PX = 28;
const POSITION_X_PERCENT = 0.92;
const POSITION_Y_PERCENT = 0.06;
const CYAN_COLOR = '#66ddff';

export class MistOrbCounterComponent implements Component {
  entity!: Entity;
  private icon: Phaser.GameObjects.Image | null = null;
  private text: Phaser.GameObjects.Text | null = null;
  private lastCount = -1;
  private created = false;

  constructor(private readonly scene: Phaser.Scene) {}

  private createElements(): void {
    if (this.created) return;
    this.created = true;

    this.icon = this.scene.add.image(0, 0, 'mist_orb');
    this.icon.setDisplaySize(ICON_SIZE_PX, ICON_SIZE_PX);
    this.icon.setScrollFactor(0);
    this.icon.setDepth(Depth.hud);
    this.icon.setBlendMode(Phaser.BlendModes.ADD);
    this.icon.setVisible(false);

    this.text = this.scene.add.text(0, 0, '0', {
      fontSize: '22px',
      color: CYAN_COLOR,
      fontStyle: 'bold',
    });
    this.text.setOrigin(1, 0.5);
    this.text.setScrollFactor(0);
    this.text.setDepth(Depth.hud);
    this.text.setVisible(false);
  }

  update(): void {
    if (!this.created) this.createElements();
    if (!this.icon || !this.text) return;

    const wsm = WorldStateManager.getInstance();
    const shouldShow = wsm.getFlag('show_mist_orbs') === 'true' && wsm.getFlag('canPunch') !== 'true';

    this.icon.setVisible(shouldShow);
    this.text.setVisible(shouldShow);

    if (!shouldShow) return;

    // Reposition every frame (handles displaySize not ready on Android)
    const dw = this.scene.cameras.main.width;
    const dh = this.scene.cameras.main.height;
    const x = dw * POSITION_X_PERCENT;
    const y = dh * POSITION_Y_PERCENT;
    this.icon.setPosition(x - ICON_SIZE_PX * 0.7, y);
    this.text.setPosition(x + ICON_SIZE_PX * 0.5, y);

    const count = Number.parseInt(wsm.getFlag('mist_orb') ?? '0', 10);
    if (count !== this.lastCount) {
      this.lastCount = count;
      this.text.setText(count.toString());
    }
  }

  onDestroy(): void {
    this.icon?.destroy();
    this.text?.destroy();
  }
}
