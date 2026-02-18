# Entity Creation System Refactor - Complete Specification

⚠️ **IMPORTANT: If anything is unclear during implementation, STOP and ask clarifying questions before proceeding.**

## Overview

Unify entity creation through an event-driven system where all entities are defined in a single `entities` array in level JSON. Entities can be created immediately on level load or delayed until an event fires.

## Goals

1. Single unified entity creation system
2. Event-driven delayed spawning
3. Consistent entity ID system
4. Simplified spawner logic (EventChainers just raise events)
5. Cleaner level JSON structure

## Key Concepts

### Entity IDs
- Every entity has a unique ID: `{type}{number}` (e.g., `skeleton0`, `thrower1`, `eventchainer0`)
- Manually specified in JSON
- Editor auto-generates using lowest available number starting from 0
- Duplicate IDs throw error during level load
- Player always has ID "player" (not in entities array)

### Event-Driven Creation
- Entities have optional `createOnEvent` field
- If `createOnEvent` set: Register with EntityCreatorManager, create when event fires
- If no `createOnEvent`: Create immediately during level load
- Once event fires, EntityCreatorManager unsubscribes from that event
- If same event fires twice, throw error (should never happen with oneShot: true)

### EventChainers (formerly Spawners)
- Renamed from "spawner" to "eventchainer" (more accurate name)
- Purpose: Raise multiple events sequentially with delays
- Can be triggered by event (has `createOnEvent`) or start immediately (no `createOnEvent`)
- Raises events listed in `eventsToRaise` with per-event delays

## New Level JSON Structure

```json
{
  "width": 40,
  "height": 30,
  "playerStart": {
    "x": 15,
    "y": 19
  },
  "entities": [
    {
      "id": "skeleton0",
      "type": "skeleton",
      "data": {
        "col": 10,
        "row": 5,
        "difficulty": "easy"
      }
    },
    {
      "id": "skeleton1",
      "type": "skeleton",
      "createOnEvent": "sk1",
      "data": {
        "col": 32,
        "row": 16,
        "difficulty": "easy"
      }
    },
    {
      "id": "trigger1",
      "type": "trigger",
      "data": {
        "createOnEvent": "spawn_wave",
        "triggerCells": [
          {"col": 28, "row": 21},
          {"col": 29, "row": 21}
        ],
        "oneShot": true
      }
    },
    {
      "id": "eventchainer1",
      "type": "eventchainer",
      "createOnEvent": "spawn_wave",
      "data": {
        "col": 30,
        "row": 20,
        "eventsToRaise": [
          {"event": "sk1", "delayMs": 0},
          {"event": "sk2", "delayMs": 1000},
          {"event": "sk3", "delayMs": 500}
        ]
      }
    },
    {
      "id": "exit1",
      "type": "exit",
      "data": {
        "createOnEvent": "exit_to_dungeon2",
        "targetLevel": "dungeon2",
        "targetCol": 2,
        "targetRow": 15,
        "triggerCells": [{"col": 28, "row": 15}],
        "oneShot": true
      }
    },
    {
      "id": "bugbase0",
      "type": "bug_base",
      "data": {
        "col": 15,
        "row": 10,
        "difficulty": "medium"
      }
    }
  ],
  "cells": [...],
  "levelTheme": "dungeon",
  "background": {...}
}
```

## Entity Types

- `stalking_robot` - Patrol robot that shoots fireballs
- `bug_base` - Spawns bugs continuously (has own spawning logic)
- `thrower` - Throws grenades
- `skeleton` - Throws bone projectiles
- `bullet_dude` - Shoots bullets
- `eventchainer` - Raises events sequentially with delays
- `trigger` - Invisible area that fires event when player enters
- `exit` - Level transition portal

## TypeScript Interfaces

### Core Interfaces

```typescript
// Base creator data - common to all entities
interface CreatorData {
  scene: Phaser.Scene;
  grid: Grid;
  entityId: string;
  playerEntity: Entity;
  entityManager: EntityManager;
  eventManager: EventManagerSystem;
}

// Entity-specific creator data
interface SkeletonCreatorData extends CreatorData {
  col: number;
  row: number;
  difficulty: EnemyDifficulty;
}

interface ThrowerCreatorData extends CreatorData {
  col: number;
  row: number;
  difficulty: EnemyDifficulty;
}

interface BugBaseCreatorData extends CreatorData {
  col: number;
  row: number;
  difficulty: EnemyDifficulty;
}

interface EventChainerCreatorData extends CreatorData {
  col: number;
  row: number;
  eventsToRaise: Array<{ event: string; delayMs: number }>;
}

interface TriggerCreatorData extends CreatorData {
  createOnEvent?: string;
  triggerCells: Array<{ col: number; row: number }>;
  oneShot: boolean;
}

interface ExitCreatorData extends CreatorData {
  createOnEvent?: string;
  targetLevel: string;
  targetCol: number;
  targetRow: number;
  triggerCells: Array<{ col: number; row: number }>;
  oneShot: boolean;
}
```

### EntityCreatorManager

```typescript
export type EntityCreator = () => Entity;

export class EntityCreatorManager {
  private readonly creators: Map<string, EntityCreator> = new Map();
  private readonly firedEvents: Set<string> = new Set();

  // Register entity creator for delayed creation
  register(createOnEvent: string, creator: EntityCreator): void {
    if (this.creators.has(createOnEvent)) {
      throw new Error(`Entity creator already registered for event: ${createOnEvent}`);
    }
    this.creators.set(createOnEvent, creator);
  }

  // Called when event fires - creates entity and unsubscribes
  onEvent(createOnEvent: string): Entity | null {
    if (this.firedEvents.has(createOnEvent)) {
      throw new Error(`Event already fired: ${createOnEvent}. Duplicate entity creation prevented.`);
    }

    const creator = this.creators.get(createOnEvent);
    if (!creator) {
      return null; // No entity registered for this event
    }

    this.firedEvents.add(createOnEvent);
    const entity = creator();
    this.creators.delete(createOnEvent); // Unsubscribe after creation
    
    return entity;
  }

  clear(): void {
    this.creators.clear();
    this.firedEvents.clear();
  }
}
```

## Entity Loading Logic (GameScene)

```typescript
async loadLevel(levelName: string): Promise<void> {
  const level = await LevelLoader.load(levelName);
  
  // Validate unique IDs
  const ids = new Set<string>();
  for (const entity of level.entities ?? []) {
    if (ids.has(entity.id)) {
      throw new Error(`Duplicate entity ID: ${entity.id}`);
    }
    ids.add(entity.id);
  }
  
  // Create player first
  const player = createPlayerEntity({...});
  this.entityManager.add(player);
  
  // Load entities
  for (const entityDef of level.entities ?? []) {
    const baseData: CreatorData = {
      scene: this,
      grid: this.grid,
      entityId: entityDef.id,
      playerEntity: player,
      entityManager: this.entityManager,
      eventManager: this.eventManager
    };
    
    const creatorFunc = this.createEntityCreator(entityDef, baseData);
    
    if (!creatorFunc) {
      throw new Error(`Unknown entity type: ${entityDef.type}`);
    }
    
    if (entityDef.createOnEvent) {
      // Delayed creation - register with EntityCreatorManager
      this.entityCreatorManager.register(entityDef.createOnEvent, creatorFunc);
    } else {
      // Immediate creation
      const entity = creatorFunc();
      this.entityManager.add(entity);
    }
  }
}

private createEntityCreator(entityDef: LevelEntity, baseData: CreatorData): EntityCreator | null {
  const data = { ...baseData, ...entityDef.data };
  
  switch (entityDef.type) {
    case 'skeleton':
      return () => createSkeletonEntity(data as SkeletonCreatorData);
    
    case 'thrower':
      return () => createThrowerEntity(data as ThrowerCreatorData);
    
    case 'stalking_robot':
      return () => createStalkingRobotEntity(data as RobotCreatorData);
    
    case 'bug_base':
      return () => createBugBaseEntity(data as BugBaseCreatorData);
    
    case 'bullet_dude':
      return () => createBulletDudeEntity(data as BulletDudeCreatorData);
    
    case 'eventchainer':
      return () => createEventChainerEntity(data as EventChainerCreatorData);
    
    case 'trigger':
      return () => createTriggerEntity(data as TriggerCreatorData);
    
    case 'exit':
      return () => createLevelExitEntity(data as ExitCreatorData);
    
    default:
      return null;
  }
}
```

## EventChainer Implementation

EventChainers replace the current EnemySpawnComponent. They:
1. Listen for their `createOnEvent` (if specified) or start immediately
2. Raise events from `eventsToRaise` sequentially with specified delays
3. Destroy themselves after all events raised

```typescript
export class EventChainerComponent implements Component {
  entity!: Entity;
  private currentIndex = 0;
  private delayTimer = 0;
  private started = false;

  constructor(
    private readonly eventManager: EventManagerSystem,
    private readonly eventsToRaise: Array<{ event: string; delayMs: number }>,
    private readonly startOnEvent?: string
  ) {}

  init(): void {
    if (this.startOnEvent) {
      // Wait for event to start
      this.eventManager.register(this.startOnEvent, this);
    } else {
      // Start immediately
      this.started = true;
    }
  }

  onEvent(createOnEvent: string): void {
    if (createOnEvent === this.startOnEvent) {
      this.started = true;
      this.eventManager.deregister(this.startOnEvent!, this);
    }
  }

  update(delta: number): void {
    if (!this.started || this.currentIndex >= this.eventsToRaise.length) {
      return;
    }

    this.delayTimer += delta;
    const current = this.eventsToRaise[this.currentIndex];

    if (this.delayTimer >= current.delayMs) {
      this.eventManager.raiseEvent(current.event);
      this.currentIndex++;
      this.delayTimer = 0;

      if (this.currentIndex >= this.eventsToRaise.length) {
        // All events raised, destroy self
        this.entity.destroy();
      }
    }
  }

  onDestroy(): void {
    if (this.startOnEvent) {
      this.eventManager.deregister(this.startOnEvent, this);
    }
  }
}
```

## Entity Creator Integration with EntityCreatorManager

The EntityCreatorManager needs to be integrated with EventManagerSystem:

```typescript
// In GameScene.create()
this.entityCreatorManager = new EntityCreatorManager();

// When loading entities with createOnEvent
if (entityDef.createOnEvent) {
  const creatorFunc = () => {
    const entity = createSkeletonEntity({...});
    this.entityManager.add(entity);
    return entity;
  };
  this.entityCreatorManager.register(entityDef.createOnEvent, creatorFunc);
}

// EntityCreatorManager listens to EventManagerSystem
// When event fires:
this.eventManager.register('*', (createOnEvent: string) => {
  const entity = this.entityCreatorManager.onEvent(createOnEvent);
  if (entity) {
    console.log(`Created entity via event: ${createOnEvent}`);
  }
});
```

## Migration Steps

### 1. Update LevelLoader Types
- Add `LevelEntity` type
- Add `EntityType` union
- Add `entities?: LevelEntity[]` to `LevelData`
- Mark old fields as legacy (keep for backward compatibility during transition)

### 2. Create EntityCreatorManager
- File: `src/systems/EntityCreatorManager.ts`
- **Must implement EventListener interface**
- Handles registration and event-driven creation
- Tracks fired events to prevent duplicates
- Registers/deregisters itself with EventManagerSystem for each event
- Constructor takes EntityManager and EventManagerSystem

### 3. Update Entity Factory Functions
All entity factory functions need to accept CreatorData-based props:

```typescript
// Before
export function createSkeletonEntity(
  scene: Phaser.Scene,
  col: number,
  row: number,
  grid: Grid,
  playerEntity: Entity,
  difficulty: EnemyDifficulty
): Entity

// After
export interface SkeletonCreatorData extends CreatorData {
  col: number;
  row: number;
  difficulty: EnemyDifficulty;
}

export function createSkeletonEntity(data: SkeletonCreatorData): Entity
```

### 4. Create EventChainer Entity
- New entity type that replaces spawner logic
- Component: `EventChainerComponent`
- Raises events sequentially with per-event delays
- Has position (col, row) for editor consistency
- Destroys itself after all events raised

### 5. Update GameScene.spawnEntities()
Replace current entity spawning logic with:

```typescript
private spawnEntities(): void {
  const level = this.levelData;
  const player = this.entityManager.getFirst('player')!;

  // Validate unique IDs
  const ids = new Set<string>();
  for (const entityDef of level.entities ?? []) {
    if (ids.has(entityDef.id)) {
      throw new Error(`Duplicate entity ID: ${entityDef.id}`);
    }
    ids.add(entityDef.id);
  }

  // Create entities
  for (const entityDef of level.entities ?? []) {
    const baseData: CreatorData = {
      scene: this,
      grid: this.grid,
      entityId: entityDef.id,
      playerEntity: player,
      entityManager: this.entityManager,
      eventManager: this.eventManager
    };

    const creatorFunc = this.createEntityCreator(entityDef, baseData);

    if (!creatorFunc) {
      throw new Error(`Unknown entity type: ${entityDef.type} for entity ${entityDef.id}`);
    }

    if (entityDef.createOnEvent) {
      // Delayed creation
      this.entityCreatorManager.register(entityDef.createOnEvent, creatorFunc);
    } else {
      // Immediate creation
      const entity = creatorFunc();
      this.entityManager.add(entity);
    }
  }

  // Keep legacy loading for backward compatibility (temporary)
  this.spawnLegacyEntities();
}

private createEntityCreator(entityDef: LevelEntity, baseData: CreatorData): EntityCreator | null {
  const data = { ...baseData, ...entityDef.data };

  switch (entityDef.type) {
    case 'skeleton':
      return () => createSkeletonEntity(data as SkeletonCreatorData);

    case 'thrower':
      return () => createThrowerEntity(data as ThrowerCreatorData);

    case 'stalking_robot':
      return () => createStalkingRobotEntity(data as RobotCreatorData);

    case 'bug_base':
      return () => createBugBaseEntity(data as BugBaseCreatorData);

    case 'bullet_dude':
      return () => createBulletDudeEntity(data as BulletDudeCreatorData);

    case 'eventchainer':
      return () => createEventChainerEntity(data as EventChainerCreatorData);

    case 'trigger':
      return () => createTriggerEntity(data as TriggerCreatorData);

    case 'exit':
      return () => createLevelExitEntity(data as ExitCreatorData);

    default:
      return null;
  }
}
```

### 6. Integrate EntityCreatorManager with EventManagerSystem

EntityCreatorManager implements EventListener and registers for specific events:

```typescript
// In GameScene.create()
this.entityCreatorManager = new EntityCreatorManager(this.entityManager);

// During entity loading
for (const entityDef of level.entities ?? []) {
  const creatorFunc = this.createEntityCreator(entityDef, baseData);
  
  if (entityDef.createOnEvent) {
    // Register creator
    this.entityCreatorManager.register(entityDef.createOnEvent, creatorFunc);
    
    // Register EntityCreatorManager as listener for this event
    this.eventManager.register(entityDef.createOnEvent, this.entityCreatorManager);
  } else {
    // Create immediately
    const entity = creatorFunc();
    this.entityManager.add(entity);
  }
}
```

**Key Points:**
- EntityCreatorManager implements EventListener interface
- Registers itself with EventManagerSystem for each createOnEvent
- When event fires, onEvent() is called, entity is created and added to EntityManager
- Automatically deregisters from EventManagerSystem after creating entity

### 7. Update Trigger Default
Change `oneShot` default to `true` in trigger creation:

```typescript
// In TriggerEditorState and PortalEditorState
oneShot: true  // Default to true to prevent duplicate events
```

### 8. Convert Existing Levels
For each level JSON file:
1. Remove all entity arrays: `robots`, `bugBases`, `throwers`, `skeletons`, `bulletDudes`, `spawners`
2. Remove `triggers` and `exits` arrays
3. Add empty `entities: []` array
4. Keep: `cells`, `playerStart`, `levelTheme`, `background`, `width`, `height`

Example conversion script:
```typescript
const converted = {
  width: level.width,
  height: level.height,
  playerStart: level.playerStart,
  cells: level.cells,
  entities: [],
  levelTheme: level.levelTheme,
  background: level.background
};
```

### 9. Update Editor

#### Add Entity Mode
Replace separate "Add Robot", "Add Thrower" buttons with:
- Single "Add Entity" button in DefaultEditorState
- Opens AddEntityEditorState with dropdown for entity type
- After selecting type, click cell to place
- Auto-generate ID: find lowest available number for that type
- Show dialog to edit properties (difficulty, waypoints, etc.)

#### Entity Extraction
Update `EditorScene.getCurrentLevelData()`:
```typescript
private extractEntities(entityManager: EntityManager, grid: Grid): LevelEntity[] {
  const entities: LevelEntity[] = [];
  
  // Extract each entity type
  for (const entity of entityManager.getAll()) {
    if (entity.id === 'player') continue; // Skip player
    
    const type = this.getEntityType(entity);
    if (!type) continue;
    
    const data = this.extractEntityData(entity, type, grid);
    
    entities.push({
      id: entity.id,
      type,
      createOnEvent: (entity as any).createOnEvent, // If stored on entity
      data
    });
  }
  
  return entities;
}
```

### 10. Entity ID Storage
Store ID on Entity instance:
```typescript
// In Entity class
export class Entity {
  readonly id: string;
  
  constructor(id: string) {
    this.id = id;
  }
}
```

Update all entity factory functions to accept ID:
```typescript
export function createSkeletonEntity(data: SkeletonCreatorData): Entity {
  const entity = new Entity(data.entityId);
  // ... rest of creation
}
```

## EventChainer Entity

Create new entity type:

```typescript
// src/eventchainer/EventChainerEntity.ts
export interface EventChainerCreatorData extends CreatorData {
  col: number;
  row: number;
  eventsToRaise: Array<{ event: string; delayMs: number }>;
}

export function createEventChainerEntity(data: EventChainerCreatorData): Entity {
  const entity = new Entity(data.entityId);
  entity.tags.add('eventchainer');

  const worldPos = data.grid.cellToWorld(data.col, data.row);
  const centerX = worldPos.x + data.grid.cellSize / 2;
  const centerY = worldPos.y + data.grid.cellSize / 2;

  entity.add(new TransformComponent(centerX, centerY, 0, 1));
  
  const chainer = entity.add(new EventChainerComponent(
    data.eventManager,
    data.eventsToRaise,
    (entity as any).createOnEvent // Get from entity definition
  ));
  chainer.init();

  entity.setUpdateOrder([
    TransformComponent,
    EventChainerComponent
  ]);

  return entity;
}
```

## Trigger and Exit as Entities

Triggers and exits move to entities array but keep similar structure:

```typescript
// Trigger entity
{
  "id": "trigger1",
  "type": "trigger",
  "data": {
    "createOnEvent": "spawn_wave",
    "triggerCells": [{"col": 28, "row": 21}],
    "oneShot": true
  }
}

// Exit entity
{
  "id": "exit1",
  "type": "exit",
  "data": {
    "createOnEvent": "exit_to_dungeon2",
    "targetLevel": "dungeon2",
    "targetCol": 2,
    "targetRow": 15,
    "triggerCells": [{"col": 28, "row": 15}],
    "oneShot": true
  }
}
```

## Implementation Checklist

⚠️ **Before implementing each item, verify you understand the requirements. Ask clarifying questions if:**
- The interface or behavior is ambiguous
- Multiple valid approaches exist
- Edge cases aren't covered
- Integration points are unclear

- [ ] Update Entity class to require ID in constructor
- [ ] Create CreatorData interfaces for all entity types
- [ ] Update all entity factory functions to accept CreatorData
- [ ] Create EntityCreatorManager
- [ ] Add registerGlobalListener() to EventManagerSystem
- [ ] Create EventChainerComponent
- [ ] Create createEventChainerEntity()
- [ ] Update GameScene.spawnEntities() with new logic
- [ ] Integrate EntityCreatorManager with EventManagerSystem
- [ ] Convert all level JSON files (remove entities, keep structure)
- [ ] Update editor: single "Add Entity" button with dropdown
- [ ] Update editor: auto-generate IDs with lowest available number
- [ ] Update editor: extract entities to new format
- [ ] Remove old spawner component (EnemySpawnComponent)
- [ ] Test entity creation (immediate and event-driven)
- [ ] Test EventChainer with delays
- [ ] Test duplicate ID detection
- [ ] Test duplicate event detection

## Example Flow

1. **Level loads** - trigger1, eventchainer1, skeleton1 registered
2. **Player walks into trigger** - trigger1 fires "spawn_wave"
3. **EventChainer receives event** - eventchainer1 starts
4. **EventChainer raises "sk1"** - after 0ms delay
5. **EntityCreatorManager receives "sk1"** - creates skeleton1
6. **Skeleton1 added to game** - via EntityManager

## Notes

- BugBase keeps its own bug spawning logic (not event-driven)
- Player stays separate from entities array
- Legacy entity arrays kept temporarily for backward compatibility
- Editor will need significant updates for unified entity management
- All entities must have position (col, row) for consistency
- EventChainer is invisible but has position for editor placement

## Files to Create/Modify

### New Files
- `src/systems/EntityCreatorManager.ts`
- `src/ecs/components/eventchainer/EventChainerComponent.ts`
- `src/eventchainer/EventChainerEntity.ts`
- `src/editor/AddEntityEditorState.ts` (replaces individual Add states)

### Modified Files
- `src/systems/level/LevelLoader.ts` - Add LevelEntity type
- `src/ecs/Entity.ts` - Require ID in constructor
- `src/scenes/GameScene.ts` - New entity loading logic
- `src/systems/EventManagerSystem.ts` - Add registerGlobalListener()
- All entity factory functions - Accept CreatorData instead of individual params
- `src/editor/DefaultEditorState.ts` - Replace add buttons with single button
- `src/scenes/EditorScene.ts` - Update entity extraction logic
- All level JSON files - Convert to new format

### Files to Remove
- `src/ecs/components/spawner/EnemySpawnComponent.ts` (replaced by EventChainerComponent)
- Individual Add editor states (replaced by unified AddEntityEditorState)

## Testing Strategy

1. Test immediate entity creation (no createOnEvent)
2. Test event-driven creation (with createOnEvent)
3. Test EventChainer with multiple events and delays
4. Test duplicate ID detection
5. Test duplicate event detection
6. Test trigger → eventchainer → entity flow
7. Test editor ID generation
8. Test level save/load with new format
