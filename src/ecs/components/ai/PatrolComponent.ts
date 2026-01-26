import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export type PatrolWaypoint = {
  col: number;
  row: number;
}

export class PatrolComponent implements Component {
  entity!: Entity;
  waypoints: PatrolWaypoint[];
  currentWaypointIndex: number;
  speed: number;

  constructor(waypoints: PatrolWaypoint[], speed: number) {
    this.waypoints = waypoints;
    this.currentWaypointIndex = 0;
    this.speed = speed;
  }

  getCurrentWaypoint(): PatrolWaypoint {
    return this.waypoints[this.currentWaypointIndex];
  }

  nextWaypoint(): void {
    this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
  }

  update(_delta: number): void {
    // Handled by state machine
  }

  onDestroy(): void {
    // Clean up
  }
}
