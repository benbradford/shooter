import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import type { EventListener } from '../../systems/EventListener';
import { TransformComponent } from '../../components/core/TransformComponent';
import { dirFromDelta, Direction } from '../../../constants/Direction';
import { TvFaceComponent } from './TvFaceComponent';
import type { TvMood } from './TvFaceMoods';

import { SpriteComponent } from '../../components/core/SpriteComponent';

const MONK_EVENTS: readonly string[] = [
  'monk_off', 'monk_booting', 'monk_neutral', 'monk_happy', 'monk_sad',
  'monk_love', 'monk_scared', 'monk_surprised', 'monk_smug', 'monk_laughing',
  'monk_angry', 'monk_enraged', 'monk_charging', 'monk_stunned', 'monk_defeated',
  'monk_glitching', 'monk_fight',
];

const EVENT_TO_MOOD: Record<string, TvMood> = {
  monk_off: 'off', monk_booting: 'booting', monk_neutral: 'neutral',
  monk_happy: 'happy', monk_sad: 'sad', monk_love: 'love',
  monk_scared: 'scared', monk_surprised: 'surprised', monk_smug: 'smug',
  monk_laughing: 'laughing', monk_angry: 'angry', monk_enraged: 'enraged',
  monk_charging: 'charging', monk_stunned: 'stunned', monk_defeated: 'defeated',
  monk_glitching: 'glitching',
};

export type TvMonkBehaviorComponentProps = {
  readonly playerEntity: Entity;
  readonly grid: GridReader;
  readonly eventManager: EventManagerSystem;
};

export class TvMonkBehaviorComponent implements Component, EventListener {
  entity!: Entity;
  private readonly playerEntity: Entity;
  private readonly eventManager: EventManagerSystem;
  private currentDirection: Direction = Direction.Down;
  private phase: 'pre-combat' | 'combat' = 'pre-combat';

  constructor(props: TvMonkBehaviorComponentProps) {
    this.playerEntity = props.playerEntity;
    this.eventManager = props.eventManager;
  }

  init(): void {
    for (const event of MONK_EVENTS) {
      this.eventManager.register(event, this);
    }
  }

  onEvent(eventName: string): void {
    if (eventName === 'monk_fight') {
      this.phase = 'combat';
      const face = this.entity.get(TvFaceComponent);
      face?.enterCombat();
      return;
    }

    // Only accept mood changes in pre-combat
    if (this.phase !== 'pre-combat') return;
    const mood = EVENT_TO_MOOD[eventName];
    if (!mood) return;

    const face = this.entity.get(TvFaceComponent);
    face?.setMood(mood);
  }

  update(_delta: number): void {
    // Face toward player
    const transform = this.entity.get(TransformComponent);
    const playerTransform = this.playerEntity.get(TransformComponent);
    if (!transform || !playerTransform) return;

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const dir = dirFromDelta(dx, dy);

    if (dir !== Direction.None && dir !== this.currentDirection) {
      this.currentDirection = dir;
      const face = this.entity.get(TvFaceComponent);
      face?.setDirection(dir);
    }

    // Depth sort: render behind player when player is below, in front when above
    const sprite = this.entity.get(SpriteComponent);
    const playerSprite = this.playerEntity.get(SpriteComponent);
    if (sprite && playerSprite) {
      const playerDepth = playerSprite.sprite.depth;
      sprite.sprite.setDepth(playerTransform.y < transform.y ? playerDepth + 1 : playerDepth - 1);
    }
  }

  onDestroy(): void {
    for (const event of MONK_EVENTS) {
      this.eventManager.deregister(event, this);
    }
  }
}
