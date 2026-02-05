import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export type CollisionBox = {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export type CollisionComponentProps = {
  box: CollisionBox;
  collidesWith: string[];
  onHit: (other: Entity) => void;
}

export class CollisionComponent implements Component {
  entity!: Entity;
  public readonly box: CollisionBox;
  public readonly collidesWith: string[];
  private readonly onHitCallback: (other: Entity) => void;
  public enabled: boolean = true;

  constructor(props: CollisionComponentProps) {
    this.box = props.box;
    this.collidesWith = props.collidesWith;
    this.onHitCallback = props.onHit;
  }

  onHit(other: Entity): void {
    this.onHitCallback(other);
  }

  update(_delta: number): void {
    // Collision detection handled by CollisionSystem
  }

}
