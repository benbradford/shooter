import type { Component } from './Component';

export class Entity {
  private readonly components: Map<string, Component> = new Map();
  private updateOrder: Component[] = [];
  public isDestroyed: boolean = false;
  public markedForRemoval: boolean = false;
  public readonly tags: Set<string> = new Set();
  public throwerId?: string; // For editor: ID of thrower entity for spawner system

  constructor(public readonly id: string) {}

  add<T extends Component>(component: T): T {
    const name = component.constructor.name;
    
    if (this.components.has(name)) {
      throw new Error(`Entity ${this.id} already has a component of type ${name}`);
    }
    
    this.components.set(name, component);
    this.updateOrder.push(component);
    component.entity = this;
    return component;
  }

  get<T extends Component>(componentClass: new (...args: never[]) => T): T | undefined {
    return this.components.get(componentClass.name) as T | undefined;
  }

  require<T extends Component>(componentClass: new (...args: never[]) => T): T {
    const component = this.get(componentClass);
    if (!component) {
      throw new Error(`Entity ${this.id} missing required component ${componentClass.name}`);
    }
    return component;
  }

  has(componentClass: new (...args: never[]) => Component): boolean {
    return this.components.has(componentClass.name);
  }

  remove(componentClass: new (...args: never[]) => Component): void {
    const name = componentClass.name;
    const component = this.components.get(name);
    if (component) {
      component.onDestroy?.();
      this.components.delete(name);
      this.updateOrder = this.updateOrder.filter(c => c !== component);
    }
  }

  update(delta: number): void {
    if (this.isDestroyed) return;
    
    for (const component of this.updateOrder) {
      if (this.isDestroyed) break;
      component.update?.(delta);
    }
  }

  setUpdateOrder(componentClasses: Array<new (...args: never[]) => Component>): void {
    this.updateOrder = componentClasses.map(cls => {
      const component = this.components.get(cls.name);
      if (!component) {
        throw new Error(`Entity ${this.id} does not have component ${cls.name}`);
      }
      return component;
    });
  }

  destroy(): void {
    this.isDestroyed = true;
    this.components.forEach(component => component.onDestroy?.());
    this.components.clear();
    this.updateOrder = [];
  }

  markForRemoval(): void {
    this.markedForRemoval = true;
  }
}
