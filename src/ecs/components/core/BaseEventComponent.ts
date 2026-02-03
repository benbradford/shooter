import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import type { EventListener } from '../../systems/EventListener';

export abstract class BaseEventComponent implements Component, EventListener {
  entity!: Entity;
  private readonly registeredEvents: string[] = [];

  constructor(private readonly eventManager: EventManagerSystem) {}

  abstract onEvent(eventName: string): void;

  protected registerEvent(eventName: string): void {
    this.eventManager.register(eventName, this);
    this.registeredEvents.push(eventName);
  }

  onDestroy(): void {
    for (const eventName of this.registeredEvents) {
      this.eventManager.deregister(eventName, this);
    }
  }
}
