import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export class GridCellBlocker implements Component {
  entity!: Entity;
  private readonly blockedTags: Set<string>;

  constructor(blockedTags: string[] = []) {
    this.blockedTags = new Set(blockedTags);
  }

  blocks(entity: Entity): boolean {
    if (this.blockedTags.size === 0) return true;
    
    for (const tag of this.blockedTags) {
      if (entity.tags.has(tag)) return true;
    }
    return false;
  }
}
