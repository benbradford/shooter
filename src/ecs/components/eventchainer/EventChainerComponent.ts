import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import type { EventListener } from '../../systems/EventListener';

export class EventChainerComponent implements Component, EventListener {
  entity!: Entity;
  private currentIndex = 0;
  private delayTimer = 0;
  private started = false;

  constructor(
    private readonly eventManager: EventManagerSystem,
    private readonly eventsToRaise: Array<{ event: string; delayMs: number }>,
    private readonly startOnEvent?: string
  ) {}

  init(): void {
    console.log('[EventChainer] Init, startOnEvent:', this.startOnEvent, 'eventsToRaise:', this.eventsToRaise);
    if (this.startOnEvent) {
      this.eventManager.register(this.startOnEvent, this);
    } else {
      this.started = true;
      console.log('[EventChainer] Starting immediately');
    }
  }

  onEvent(eventName: string): void {
    console.log('[EventChainer] Received event:', eventName);
    if (eventName === this.startOnEvent && this.startOnEvent) {
      this.started = true;
      this.eventManager.deregister(this.startOnEvent, this);
      console.log('[EventChainer] Started via event');
    }
  }

  update(delta: number): void {
    if (!this.started || this.currentIndex >= this.eventsToRaise.length) {
      return;
    }

    this.delayTimer += delta;
    const current = this.eventsToRaise[this.currentIndex];

    if (this.delayTimer >= current.delayMs) {
      console.log('[EventChainer] Raising event:', current.event);
      this.eventManager.raiseEvent(current.event);
      this.currentIndex++;
      this.delayTimer = 0;

      if (this.currentIndex >= this.eventsToRaise.length) {
        console.log('[EventChainer] All events raised, destroying');
        this.entity.destroy();
      }
    }
  }

  onDestroy(): void {
    if (this.startOnEvent) {
      this.eventManager.deregister(this.startOnEvent, this);
    }
  }
}
