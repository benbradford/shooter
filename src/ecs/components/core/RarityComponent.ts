import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Rarity } from '../../../constants/Rarity';

export class RarityComponent implements Component {
  entity!: Entity;
  
  constructor(public rarity: Rarity) {}
}
