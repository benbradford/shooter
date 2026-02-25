import type { EventListener } from './EventListener';

export class EventManagerSystem {
  private readonly listeners: Map<string, EventListener[]> = new Map();

  register(eventName: string, listener: EventListener): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    const list = this.listeners.get(eventName);
    if (list) {
      list.push(listener);
    }
  }

  deregister(eventName: string, listener: EventListener): void {
    const list = this.listeners.get(eventName);
    if (!list) return;
    const index = list.indexOf(listener);
    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  raiseEvent(eventName: string): void {
    // NOSONAR - Keep for debugging
    // console.log(`🎯 TRIGGER EVENT: ${eventName}`);

    const list = this.listeners.get(eventName);
    if (!list) return;

    const copy = [...list];
    for (const listener of copy) {
      if (list.includes(listener)) {
        listener.onEvent(eventName);
      }
    }
  }
}
