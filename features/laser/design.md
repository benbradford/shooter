# Laser Enemy — Design

## Architecture Overview

```
GameScene.initializeScene()
  ↓
EntityLoader.createEntityCreator('laser')
  ↓
createLaserEntity()
  ├── TransformComponent (cell center)
  ├── SpriteComponent (laser_base.png, rotated)
  ├── GridPositionComponent (full cell collision box)
  ├── GridCollisionComponent (occupant registration)
  ├── GridCellBlocker (blocks movement)
  ├── CollisionComponent (absorbs projectiles)
  └── LaserBeamComponent (single component: raycast + render + collision + damage + particles + toggle)
        ├── Owns: Phaser.GameObjects.Graphics (beam lines)
        ├── Owns: Phaser.GameObjects.Particles.ParticleEmitter (impact sparks)
        ├── Reads: WorldStateManager flag each frame
        ├── Reads: Grid cells + occupants for raycast
        ├── Reads: BlockedAreaManager for blocked cells
        ├── Reads: Player entity for damage detection
        └── Reads: EntityManager for enemy kill detection
```

**Key architectural decision:** `LaserBeamComponent` is a single monolithic component that handles all beam logic. This follows the pattern of other self-contained components in the codebase (`BreakableComponent`, `PushableComponent`, `LeverComponent`) where a single component owns all the behavior for its entity type. Splitting into sub-components (raycast, render, collision, particles) would add coupling overhead with no benefit — the beam's raycast result is consumed by rendering, collision, AND particles in the same frame.

---

## Data Flow

### Per-Frame Update (LaserBeamComponent.update)

```
1. Poll world state flag → determine isOn
2. If OFF: hide graphics + emitter, return early
3. Raycast from emitter center along angle → beamEndX, beamEndY
4. Render 3-layer beam lines (graphics.clear() + redraw)
5. Position particle emitter at beam endpoint
6. Check player AABB overlap with beam segment → apply damage + knockback
7. Check enemy positions against beam segment → destroy enemies in path
```

### Level Load Flow

```
1. LevelLoader.load() → LevelData with laser entities
2. GameScene.initializeScene() → spawnEntities()
3. EntityLoader case 'laser' → createLaserEntity()
   3.1. Read angle, flagName from entity data
   3.2. Create all components
   3.3. LaserBeamComponent receives: scene, grid, blockedAreaManager, entityManager, angle, flagName, layer
4. First update frame: raycast + render + collision all run
```

### World State Toggle Flow

```
1. External system sets flag (lever, trigger, Lua script)
   → WorldStateManager.setFlag('laser0_laser_on', 'false')
2. Next frame: LaserBeamComponent.update()
   → reads flag: WorldStateManager.getInstance().getState().flags[flagName]
   → flag === 'false' → isOn = false
   → graphics.setVisible(false), emitter.stop(), skip collision
3. External system sets flag back to 'true'
4. Next frame: isOn = true → graphics.setVisible(true), emitter.start(), resume collision
```

---

## LaserEntity Factory

### File: `src/ecs/entities/laser/LaserEntity.ts`

Follows the `PushableEntity` / `BreakableEntity` pattern: props object, component assembly, explicit update order.

```typescript
export type CreateLaserProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  entityId: string;
  angle: number;
  flagName: string;
  blockedAreaManager?: BlockedAreaManager;
  entityManager: EntityManager;
};

export function createLaserEntity(props: CreateLaserProps): Entity {
  const entity = new Entity(props.entityId);
  entity.tags.add('laser');

  const worldPos = props.grid.cellToWorld(props.col, props.row);
  const x = worldPos.x + props.grid.cellSize / 2;
  const y = worldPos.y + props.grid.cellSize / 2;

  // Scale base sprite to cell size (same pattern as BreakableEntity)
  const textureObj = props.scene.textures.get('laser_base');
  const frame = textureObj.get(0);
  const scale = props.grid.cellSize / Math.max(frame.width, frame.height);

  const transform = entity.add(new TransformComponent(x, y, 0, scale));
  const sprite = entity.add(new SpriteComponent(props.scene, 'laser_base', transform));
  sprite.sprite.setDepth(Depth.breakable);
  // Rotate base sprite to face beam direction
  sprite.sprite.setRotation(props.angle * Math.PI / 180);

  const COLLISION_SIZE = props.grid.cellSize;
  entity.add(new GridPositionComponent(props.col, props.row, {
    offsetX: 0, offsetY: 0, width: COLLISION_SIZE, height: COLLISION_SIZE
  }));
  entity.add(new GridCollisionComponent(props.grid));
  entity.add(new GridCellBlocker());

  // Absorb ALL projectiles — same pattern as PushableEntity
  entity.add(new CollisionComponent({
    box: { offsetX: -COLLISION_SIZE / 2, offsetY: -COLLISION_SIZE / 2, width: COLLISION_SIZE, height: COLLISION_SIZE },
    collidesWith: ['player_projectile', 'enemy_projectile'],
    onHit: (other) => {
      if (other.tags.has('player_projectile') || other.tags.has('enemy_projectile')) {
        props.scene.time.delayedCall(0, () => other.destroy());
      }
    }
  }));

  // Determine layer from spawn cell
  const spawnCell = props.grid.getCell(props.col, props.row);
  const layer = spawnCell ? props.grid.getLayer(spawnCell) : 0;

  entity.add(new LaserBeamComponent({
    scene: props.scene,
    grid: props.grid,
    angle: props.angle,
    flagName: props.flagName,
    layer,
    blockedAreaManager: props.blockedAreaManager,
    entityManager: props.entityManager,
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    GridPositionComponent,
    GridCollisionComponent,
    GridCellBlocker,
    CollisionComponent,
    LaserBeamComponent, // Last — reads transform, writes graphics
  ]);

  return entity;
}
```

### EntityLoader Integration

```typescript
// In EntityLoader.createEntityCreator(), add case:
case 'laser':
  return () => {
    const laserData = data as { col: number; row: number; angle: number; flagName?: string };
    return createLaserEntity({
      scene: this.scene,
      col: laserData.col,
      row: laserData.row,
      grid: this.grid,
      entityId: entityDef.id,
      angle: laserData.angle ?? 0,
      flagName: laserData.flagName ?? `${entityDef.id}_laser_on`,
      blockedAreaManager: this.scene.blockedAreaManager,
      entityManager: this.scene.entityManager,
    });
  };
```

---

## LaserBeamComponent — Detailed Design

### File: `src/ecs/components/laser/LaserBeamComponent.ts`

### Constructor and State

```typescript
type LaserBeamProps = {
  scene: Phaser.Scene;
  grid: Grid;
  angle: number;          // degrees: 0=right, 90=down, 180=left, 270=up
  flagName: string;       // world state flag controlling on/off
  layer: number;          // inherited from spawn cell
  blockedAreaManager?: BlockedAreaManager;
  entityManager: EntityManager;
};

// Constants
const BEAM_OUTER_WIDTH = 8;
const BEAM_INNER_WIDTH = 3;
const BEAM_COLLISION_HALF_WIDTH = 4; // 8px total, centered on line
const RAYCAST_STEP_PX = 4;
const PULSE_PERIOD_MS = 500;
const PLAYER_DAMAGE_PER_FRAME = 50;
const KNOCKBACK_FORCE = 20;

class LaserBeamComponent implements Component {
  entity!: Entity;

  // Config (immutable after construction)
  private readonly scene: Phaser.Scene;
  private readonly grid: Grid;
  private readonly dirX: number;  // unit vector from angle
  private readonly dirY: number;
  private readonly flagName: string;
  private readonly layer: number;
  private readonly blockedAreaManager?: BlockedAreaManager;
  private readonly entityManager: EntityManager;

  // Owned Phaser objects
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;

  // Per-frame state
  private isOn = true;
  private beamEndX = 0;
  private beamEndY = 0;
  private pulseTimeMs = 0;

  constructor(props: LaserBeamProps) {
    this.scene = props.scene;
    this.grid = props.grid;
    this.flagName = props.flagName;
    this.layer = props.layer;
    this.blockedAreaManager = props.blockedAreaManager;
    this.entityManager = props.entityManager;

    // Pre-compute direction unit vector
    const rad = props.angle * Math.PI / 180;
    this.dirX = Math.cos(rad);
    this.dirY = Math.sin(rad);

    // Create Graphics for beam rendering
    this.graphics = props.scene.add.graphics();
    this.graphics.setDepth(Depth.particle);

    // Create particle emitter for impact sparks
    this.emitter = this.createImpactEmitter();
  }
}
```

### Update — Main Loop

```typescript
update(delta: number): void {
  this.pulseTimeMs += delta;

  // 1. Poll world state flag
  const flagValue = WorldStateManager.getInstance().getState().flags[this.flagName];
  this.isOn = flagValue !== 'false'; // ON if 'true', undefined, or any other value

  if (!this.isOn) {
    this.graphics.setVisible(false);
    this.emitter.stop();
    return;
  }

  const transform = this.entity.require(TransformComponent);
  const startX = transform.x;
  const startY = transform.y;

  // 2. Raycast to find beam endpoint
  const endpoint = this.raycast(startX, startY);
  this.beamEndX = endpoint.x;
  this.beamEndY = endpoint.y;

  // 3. Render beam
  this.renderBeam(startX, startY, this.beamEndX, this.beamEndY);

  // 4. Position impact particles
  this.emitter.setPosition(this.beamEndX, this.beamEndY);
  if (!this.emitter.active) this.emitter.start();

  // 5. Player collision + damage
  this.checkPlayerCollision(startX, startY, this.beamEndX, this.beamEndY);

  // 6. Enemy collision + instant kill
  this.checkEnemyCollision(startX, startY, this.beamEndX, this.beamEndY);
}
```

---

## Raycasting Algorithm

Steps along the beam direction in `RAYCAST_STEP_PX` (4px) increments, checking each position against termination conditions. Returns the world-pixel position of the first blocker hit.

**Why 4px steps instead of cell-stepping:** Arbitrary angles mean the beam can cross cell boundaries at any point. A cell-stepping algorithm (DDA/Bresenham) would need to check partial cell intersections. Stepping in small pixel increments is simpler, handles all angles uniformly, and at 4px steps with <10 lasers and typical beam lengths of ~20 cells (1280px), each laser does ~320 checks per frame — negligible.

```typescript
private raycast(startX: number, startY: number): { x: number; y: number } {
  let x = startX;
  let y = startY;
  let prevCol = -1;
  let prevRow = -1;

  // Max distance: diagonal of entire grid
  const maxDist = Math.hypot(
    this.grid.width * this.grid.cellSize,
    this.grid.height * this.grid.cellSize
  );
  const steps = Math.ceil(maxDist / RAYCAST_STEP_PX);

  for (let i = 1; i <= steps; i++) {
    x = startX + this.dirX * i * RAYCAST_STEP_PX;
    y = startY + this.dirY * i * RAYCAST_STEP_PX;

    const col = Math.floor(x / this.grid.cellSize);
    const row = Math.floor(y / this.grid.cellSize);

    // Skip re-checking same cell
    if (col === prevCol && row === prevRow) continue;
    prevCol = col;
    prevRow = row;

    // Termination: grid boundary
    if (col < 0 || col >= this.grid.width || row < 0 || row >= this.grid.height) {
      return { x, y };
    }

    const cell = this.grid.getCell(col, row);
    if (!cell) return { x, y };

    // Termination: wall, platform, blocked
    if (this.grid.isWall(cell) || cell.properties.has('platform')) {
      return { x, y };
    }

    // Termination: blocked area polygon cell
    if (this.blockedAreaManager?.getBlockedCells().has(`${col},${row}`)) {
      return { x, y };
    }

    // Termination: cell occupant with GridCellBlocker on same layer
    // (catches pushables, breakables, bug bases, other laser bases)
    if (cell.layer === this.layer) {
      for (const occupant of cell.occupants) {
        if (occupant === this.entity) continue; // skip self
        if (occupant.get(GridCellBlocker)) {
          return { x, y };
        }
      }
    }
  }

  return { x, y };
}
```

### Termination Priority

The step-based approach naturally handles priority — the first blocker encountered along the ray wins. The check order within each cell is:
1. Grid boundary (checked before cell access)
2. Wall / platform / blocked property
3. Blocked area polygon
4. GridCellBlocker occupant (pushable, breakable, other laser, etc.)

All checks are on the same layer as the laser entity. Cells on different layers are transparent.

---

## Beam Rendering

Uses a single `Phaser.GameObjects.Graphics` object, cleared and redrawn each frame. Three visual layers drawn in order (back to front).

```typescript
private renderBeam(startX: number, startY: number, endX: number, endY: number): void {
  this.graphics.clear();
  this.graphics.setVisible(true);

  // Layer 1: Outer glow (red, 8px, alpha 0.4)
  this.graphics.lineStyle(BEAM_OUTER_WIDTH, 0xff0000, 0.4);
  this.graphics.lineBetween(startX, startY, endX, endY);

  // Layer 2: Inner core (white-yellow, 3px, alpha 1.0)
  this.graphics.lineStyle(BEAM_INNER_WIDTH, 0xffffcc, 1.0);
  this.graphics.lineBetween(startX, startY, endX, endY);

  // Layer 3: Pulsing energy overlay
  const t = this.pulseTimeMs / PULSE_PERIOD_MS;
  const pulseWidth = 4 + Math.sin(t * Math.PI * 2) * 1;   // oscillates 3–5px
  const pulseAlpha = 0.25 + Math.sin(t * Math.PI * 2) * 0.1; // oscillates 0.15–0.35
  this.graphics.lineStyle(pulseWidth, 0xff4400, pulseAlpha);
  this.graphics.lineBetween(startX, startY, endX, endY);
}
```

**Why Graphics, not sprites/textures:** The beam is a line at an arbitrary angle. `Graphics.lineBetween()` handles any angle natively with correct line width. Sprite-based approaches would require rotation + tiling, which is more complex for no visual benefit.

**Performance:** `graphics.clear()` + 3 `lineBetween()` calls per laser per frame. With <10 lasers, this is ~30 draw calls — negligible.

---

## Collision Detection

### Core Algorithm: Point-to-Line-Segment Distance

Both player and enemy collision use the same geometric primitive — distance from a point (or AABB) to the beam line segment. The beam is treated as a rectangle of width 8px centered on the line.

```typescript
/**
 * Returns the shortest distance from point (px, py) to the line segment (ax, ay)→(bx, by).
 */
private pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);

  // Project point onto line, clamped to [0,1]
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}
```

### Player Collision + Damage

Checks if the player's grid collision box (AABB) overlaps the beam. Uses the AABB center point for distance check — the 8px beam width + 34px player width means center-point distance < `BEAM_COLLISION_HALF_WIDTH + playerHalfWidth` is a reliable overlap test.

```typescript
private checkPlayerCollision(startX: number, startY: number, endX: number, endY: number): void {
  const player = this.entityManager.getFirst('player');
  if (!player || player.isDestroyed) return;

  const playerTransform = player.require(TransformComponent);
  const gridPos = player.require(GridPositionComponent);

  // Only damage on same layer
  if (gridPos.currentLayer !== this.layer) return;

  // AABB center = transform position + collision box offset
  const box = gridPos.collisionBox;
  const cx = playerTransform.x + box.offsetX;
  const cy = playerTransform.y + box.offsetY;

  const dist = this.pointToSegmentDist(cx, cy, startX, startY, endX, endY);

  // Overlap if distance < beam half-width + player half-width
  if (dist >= BEAM_COLLISION_HALF_WIDTH + box.width / 2) return;

  // Apply damage
  const health = player.get(HealthComponent);
  if (!health || health.getHealth() <= 0) return;
  health.takeDamage(PLAYER_DAMAGE_PER_FRAME);

  // Hit flash
  const flash = player.get(HitFlashComponent);
  flash?.flash(300);

  // Knockback — direction depends on player movement
  const knockback = player.get(KnockbackComponent);
  if (knockback) {
    const walk = player.get(WalkComponent);
    let kbDirX: number;
    let kbDirY: number;

    if (walk?.isMoving()) {
      // Opposite of movement direction
      const vel = walk.getVelocity();
      const len = Math.hypot(vel.x, vel.y);
      kbDirX = len > 0 ? -vel.x / len : 0;
      kbDirY = len > 0 ? -vel.y / len : 0;
    } else {
      // Perpendicular to beam, toward player's side
      const perpX = -this.dirY;
      const perpY = this.dirX;
      // Determine which side of the beam the player is on
      const toPlayerX = cx - startX;
      const toPlayerY = cy - startY;
      const side = toPlayerX * perpX + toPlayerY * perpY;
      kbDirX = side >= 0 ? perpX : -perpX;
      kbDirY = side >= 0 ? perpY : -perpY;
    }

    knockback.applyKnockback(kbDirX, kbDirY, KNOCKBACK_FORCE);
  }
}
```

### Enemy Collision + Instant Kill

Checks all entities with the `'enemy'` tag. Uses center-point distance to beam segment. Enemies within 8px of the beam line are destroyed.

```typescript
private checkEnemyCollision(startX: number, startY: number, endX: number, endY: number): void {
  for (const entity of this.entityManager.getAll()) {
    if (entity.isDestroyed) continue;
    if (!entity.tags.has('enemy')) continue;
    if (entity.tags.has('laser')) continue; // lasers can't kill other lasers

    const transform = entity.get(TransformComponent);
    if (!transform) continue;

    const dist = this.pointToSegmentDist(transform.x, transform.y, startX, startY, endX, endY);
    if (dist < BEAM_COLLISION_HALF_WIDTH) {
      entity.destroy();
    }
  }
}
```

**Why center-point for enemies, AABB for player:** Enemies are killed instantly — pixel-perfect detection isn't needed. The player takes continuous damage with knockback, so the wider AABB check ensures the player can't "thread the needle" through the beam by aligning their center with the beam line while their collision box overlaps.

---

## Impact Particles

Uses Phaser's built-in particle emitter. The emitter is created once in the constructor and repositioned each frame to the beam endpoint.

```typescript
private createImpactEmitter(): Phaser.GameObjects.Particles.ParticleEmitter {
  // Use a tiny generated texture for particles
  const key = '__laser_spark';
  if (!this.scene.textures.exists(key)) {
    const g = this.scene.make.graphics({ add: false });
    g.fillStyle(0xffffff);
    g.fillCircle(2, 2, 2);
    g.generateTexture(key, 4, 4);
    g.destroy();
  }

  const emitter = this.scene.add.particles(0, 0, key, {
    speed: { min: 20, max: 60 },
    angle: { min: 0, max: 360 },
    scale: { start: 1, end: 0 },
    lifespan: { min: 100, max: 300 },
    frequency: 40,           // emit every 40ms → ~6 particles active
    quantity: 1,
    tint: [0xffff00, 0xff6600],
    alpha: { start: 1, end: 0 },
    blendMode: Phaser.BlendModes.ADD,
  });
  emitter.setDepth(Depth.particle);

  return emitter;
}
```

**Particle direction:** The `angle: { min: 0, max: 360 }` config emits in all directions from the impact point. This is simpler than computing perpendicular directions and visually reads as "sparks scattering from impact" regardless of beam angle.

**Lifecycle:** The emitter is created once and reused. `emitter.stop()` when laser is OFF, `emitter.start()` when ON. Position updated via `emitter.setPosition(beamEndX, beamEndY)` each frame.

---

## Resource Cleanup — onDestroy

```typescript
onDestroy(): void {
  this.graphics.destroy();
  this.emitter.destroy();
}
```

The `Graphics` object and particle emitter are Phaser scene objects that must be explicitly destroyed when the entity is destroyed. Without this, they would leak as orphaned display objects.

---

## Editor Integration

### Entity Palette

Add `'laser'` to the entity palette list in `editor/panels/ContextPanel.ts` (or wherever the palette is defined). Follows the same pattern as all other entity types.

### EditorBridge Defaults

```typescript
// In EditorBridge.addEntity() defaults:
laser: { col, row, angle: 0, flagName: `${newId}_laser_on` },
```

### Context Panel — Laser-Specific Fields

When a laser entity is selected, the context panel shows angle and flagName inputs. Follows the lever field pattern:

```typescript
// In ContextPanel.showEntityForm(), add:
if (entityDef.type === 'laser') {
  typeFields += `<div class="form-group"><label>Angle (0–359)</label>
    <input type="number" id="ef-laser-angle" value="${data.angle ?? 0}" min="0" max="359" /></div>
    <div class="form-group"><label>Flag Name</label>
    <input id="ef-laser-flag" value="${data.flagName ?? ''}" /></div>`;
}

// Wire change handlers:
this.container.querySelector('#ef-laser-angle')?.addEventListener('change', (e) => {
  this.bridge.updateEntityData(entityId, { angle: Number((e.target as HTMLInputElement).value) });
});
this.container.querySelector('#ef-laser-flag')?.addEventListener('change', (e) => {
  this.bridge.updateEntityData(entityId, { flagName: (e.target as HTMLInputElement).value });
});
```

### Beam Preview in Editor

When a laser entity is selected, render a preview line on the canvas showing beam direction. This uses the editor's overlay rendering (same mechanism as trigger cell highlights).

```typescript
// In editor overlay rendering, when selected entity is a laser:
private renderLaserPreview(entityDef: LevelEntity): void {
  const data = entityDef.data as { col: number; row: number; angle: number };
  const grid = this.bridge.getGrid();
  const startX = data.col * grid.cellSize + grid.cellSize / 2;
  const startY = data.row * grid.cellSize + grid.cellSize / 2;

  const rad = (data.angle ?? 0) * Math.PI / 180;
  const dirX = Math.cos(rad);
  const dirY = Math.sin(rad);

  // Simplified raycast — check grid cells only (no occupants in editor)
  let endX = startX;
  let endY = startY;
  const maxDist = Math.hypot(grid.width * grid.cellSize, grid.height * grid.cellSize);
  const step = grid.cellSize / 2;

  for (let d = step; d <= maxDist; d += step) {
    const px = startX + dirX * d;
    const py = startY + dirY * d;
    const col = Math.floor(px / grid.cellSize);
    const row = Math.floor(py / grid.cellSize);

    if (col < 0 || col >= grid.width || row < 0 || row >= grid.height) break;
    const cell = grid.getCell(col, row);
    if (!cell || grid.isWall(cell) || cell.properties.has('platform')) break;
    endX = px;
    endY = py;
  }

  // Draw dashed preview line
  this.overlayGraphics.lineStyle(2, 0xff0000, 0.5);
  this.overlayGraphics.lineBetween(startX, startY, endX, endY);
}
```

The preview is simplified — it checks grid terrain only, not entity occupants (since entities are paused in editor mode). This is sufficient for level design visualization.
