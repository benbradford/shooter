import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export class RemoteInputComponent implements Component {
  entity!: Entity;
  private moveX: number = 0;
  private moveY: number = 0;
  private movePressed: boolean = false;
  private aimX: number = 0;
  private aimY: number = 1;
  private aimPressed: boolean = false;

  setWalk(x: number, y: number, isPressed: boolean): void {
    this.moveX = x;
    this.moveY = y;
    this.movePressed = isPressed;
  }

  setAim(x: number, y: number, isPressed: boolean): void {
    this.aimX = x;
    this.aimY = y;
    this.aimPressed = isPressed;
  }

  getWalkInput(): { x: number; y: number; isPressed: boolean } {
    return { x: this.moveX, y: this.moveY, isPressed: this.movePressed };
  }

  getAimInput(): { x: number; y: number; isPressed: boolean } {
    return { x: this.aimX, y: this.aimY, isPressed: this.aimPressed };
  }

  update(_delta: number): void {}
}
