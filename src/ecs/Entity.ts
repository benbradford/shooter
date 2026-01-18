import type { Component } from './Component';

export class Entity {
  private readonly components: Map<string, Component> = new Map();
  private updateOrder: Component[] = [];
  public isDestroyed: boolean = false;

  constructor(public readonly id: string) {}

  add<T extends Component>(component: T): T {
    const name = component.constructor.name;
    this.components.set(name, component);
    this.updateOrder.push(component);
    component.entity = this;
    return component;
  }

  get<T extends Component>(componentClass: new (...args: never[]) => T): T | undefined {
    return this.components.get(componentClass.name) as T | undefined;
  }

  has(componentClass: new (...args: never[]) => Component): boolean {
    return this.components.has(componentClass.name);
  }

  update(delta: number): void {
    this.updateOrder.forEach(component => component.update(delta));
  }

  setUpdateOrder(components: Component[]): void {
    this.updateOrder = components;
  }

  destroy(): void {
    this.isDestroyed = true;
    this.components.forEach(component => component.onDestroy());
    this.components.clear();
    this.updateOrder = [];
  }
}
