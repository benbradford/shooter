import type { Component } from './Component';

export class Entity {
  private components: Map<string, Component> = new Map();
  private updateOrder: Component[] = [];

  constructor(public id: string) {}

  add<T extends Component>(component: T): T {
    const name = component.constructor.name;
    this.components.set(name, component);
    this.updateOrder.push(component);
    component.entity = this;
    return component;
  }

  get<T extends Component>(componentClass: new (...args: any[]) => T): T | undefined {
    return this.components.get(componentClass.name) as T | undefined;
  }

  has(componentClass: new (...args: any[]) => any): boolean {
    return this.components.has(componentClass.name);
  }

  update(delta: number): void {
    this.updateOrder.forEach(component => component.update(delta));
  }

  setUpdateOrder(componentClasses: (new (...args: any[]) => Component)[]): void {
    this.updateOrder = componentClasses
      .map(cls => this.components.get(cls.name))
      .filter(c => c !== undefined) as Component[];
  }

  destroy(): void {
    this.components.forEach(component => component.onDestroy());
    this.components.clear();
    this.updateOrder = [];
  }
}
