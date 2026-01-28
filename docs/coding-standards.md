# Coding Standards

## ⚠️ MANDATORY: Build and Lint After Every Change ⚠️

**Run these commands after EVERY code modification:**

```bash
npm run build                # MUST pass with zero errors
npx eslint src --ext .ts     # MUST pass with zero errors
```

**Both commands must complete with zero errors before considering work complete. Warnings must be reviewed and addressed or documented as acceptable.**

*Note: `npm run dev` is optional if you already have the dev server running in another terminal.*

---

## Comments

### No Redundant Comments

**Comments should only explain WHY, not WHAT. The code itself should be self-documenting.**

**DON'T ❌**
```typescript
// Shadow
const shadow = entity.add(new ShadowComponent(scene));
shadow.init();

// Grid position
const startCell = grid.worldToCell(x, y);
entity.add(new GridPositionComponent(startCell.col, startCell.row, ROBOT_GRID_COLLISION_BOX));

// Health
entity.add(new HealthComponent({ maxHealth: health }));

// Patrol
entity.add(new PatrolComponent(waypoints, speed));
```

**DO ✅**
```typescript
// No comments needed - code is self-explanatory
const shadow = entity.add(new ShadowComponent(scene));
shadow.init();

const startCell = grid.worldToCell(x, y);
entity.add(new GridPositionComponent(startCell.col, startCell.row, ROBOT_GRID_COLLISION_BOX));
entity.add(new HealthComponent({ maxHealth: health }));
entity.add(new PatrolComponent(waypoints, speed));
```

**When to use comments:**
```typescript
// ✅ Explains surprising behavior
// Must init() after add() because component needs entity reference
shadow.init();

// ✅ Explains non-obvious logic
// Knockback uses higher friction than player to prevent robots sliding too far
entity.add(new KnockbackComponent(0.92, 500));

// ✅ Explains workaround or limitation
// Phaser doesn't support rotation on sprite sheets, so we pre-render all 8 directions
const frame = IDLE_FRAME_OFFSET + directionIndex;
```

**Rule of thumb:** If you can delete the comment and the code is still clear, delete it.

---

## Modern JavaScript Standards

### Limit Function Parameters

**Functions should not have more than 7 parameters. Use props objects instead.**

**DO ✅**
```typescript
// Define props interface
export interface CreateBulletProps {
  scene: Phaser.Scene;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  grid: Grid;
  layer?: number;
  fromTransition?: boolean;
}

// Use props object
export function createBulletEntity(props: CreateBulletProps): Entity {
  const { scene, x, y, dirX, dirY, grid, layer = 0, fromTransition = false } = props;
  // ...
}

// Usage: Named parameters, self-documenting
createBulletEntity({
  scene: this,
  x: 100,
  y: 200,
  dirX: 1,
  dirY: 0,
  grid: this.grid,
  layer: 0,
  fromTransition: false
});
```

**DON'T ❌**
```typescript
// Too many parameters - hard to read and maintain
export function createBulletEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  grid: Grid,
  layer: number = 0,
  fromTransition: boolean = false
): Entity {
  // ...
}

// Usage: What does each parameter mean?
createBulletEntity(this, 100, 200, 1, 0, this.grid, 0, false);
```

**Benefits:**
- Named parameters (self-documenting)
- Easy to add new options without breaking existing code
- Optional parameters with defaults
- Clear what each value represents at call site

### Use Modern Math APIs

**DO ✅**
```typescript
// Use Math.hypot for distance calculations
const distance = Math.hypot(dx, dy);

// Use Math.log10 for base-10 logarithms
const result = Math.log10(x);
```

**DON'T ❌**
```typescript
// Don't use manual calculations
const distance = Math.sqrt(dx * dx + dy * dy);

// Don't use legacy logarithm expressions
const result = Math.log(x) / Math.LN10;
```

### Use Number Static Methods

**DO ✅**
```typescript
const num = Number.parseInt('42', 10);
const float = Number.parseFloat('3.14');
if (Number.isNaN(value)) { /* ... */ }
if (Number.isFinite(value)) { /* ... */ }
```

**DON'T ❌**
```typescript
const num = parseInt('42', 10);
const float = parseFloat('3.14');
if (isNaN(value)) { /* ... */ }  // Coerces types unexpectedly
if (isFinite(value)) { /* ... */ }
```

### Clean Number Literals

**DO ✅**
```typescript
const scale = 1;
const speed = 300;
```

**DON'T ❌**
```typescript
const scale = 1.0;  // Unnecessary decimal
const speed = 300.;  // Trailing decimal point
```

### Avoid Negated Conditions with Else

**DO ✅**
```typescript
if (isValid) {
  processData();
} else {
  handleError();
}
```

**DON'T ❌**
```typescript
if (!isValid) {  // Harder to read
  handleError();
} else {
  processData();
}
```

### No Duplicate Conditional Branches

**Never have identical code in multiple branches of a conditional.**

**DO ✅**
```typescript
// Extract common code
const result = calculateBase();
if (condition) {
  result.applySpecialLogic();
}
return result;

// Or use different logic per branch
if (type === 'player') {
  return createPlayer();
} else if (type === 'enemy') {
  return createEnemy();
} else {
  return createNPC();
}
```

**DON'T ❌**
```typescript
// Duplicate code in branches
if (condition) {
  const result = calculate();
  return result;
} else {
  const result = calculate();  // Same as above!
  return result;
}

// All branches do the same thing
if (type === 'player') {
  return defaultEntity();
} else if (type === 'enemy') {
  return defaultEntity();  // Why have the condition?
} else {
  return defaultEntity();
}
```

**Why this matters:**
- Duplicate branches indicate logic errors
- Makes code harder to maintain
- If branches are identical, the condition is meaningless
- Violates DRY (Don't Repeat Yourself) principle

### No Lonely If Statements

**Don't use if as the only statement in an else block - use else if instead.**

**DO ✅**
```typescript
if (condition1) {
  doSomething();
} else if (condition2) {
  doSomethingElse();
}

// Or flatten the logic
if (!condition1 && condition2) {
  doSomethingElse();
}
```

**DON'T ❌**
```typescript
if (condition1) {
  doSomething();
} else {
  if (condition2) {  // Lonely if - use else if instead
    doSomethingElse();
  }
}
```

**Why this matters:**
- Reduces nesting depth
- Makes code more readable
- Standard pattern in most style guides

### No Useless Constructors

**Don't create constructors that only call super() with the same parameters.**

**DO ✅**
```typescript
// No constructor needed - parent constructor is sufficient
export class MyState extends EditorState {
  private data: string = '';
  
  onEnter(): void {
    // Implementation
  }
}

// Constructor only needed if you do additional work
export class MyState extends EditorState {
  private data: string;
  
  constructor(scene: EditorScene, initialData: string) {
    super(scene);
    this.data = initialData;  // Additional initialization
  }
}
```

**DON'T ❌**
```typescript
// Useless constructor - just calls super with same params
export class MyState extends EditorState {
  constructor(scene: EditorScene) {
    super(scene);  // Does nothing extra
  }
}
```

**Why this matters:**
- Reduces boilerplate code
- Parent constructor is called automatically
- Only add constructor if you need to do additional work

### No Unnecessary Type Assertions

**Only use type assertions when TypeScript cannot infer the type correctly.**

**DO ✅**
```typescript
// Necessary - narrowing from unknown
const data = JSON.parse(jsonString) as MyType;

// Necessary - DOM element type
const canvas = document.getElementById('game') as HTMLCanvasElement;

// No assertion needed - type is already correct
const health = entity.get(HealthComponent);
if (health) {
  health.takeDamage(10);
}
```

**DON'T ❌**
```typescript
// Unnecessary - already the correct type
const health = entity.get(HealthComponent);
if (health) {
  (health as HealthComponent).takeDamage(10);  // Redundant!
}

// Unnecessary - TypeScript already knows this
const value: number = 42;
const result = (value as number) + 10;  // Redundant!
```

**Why this matters:**
- Clutters code with noise
- Hides actual type information
- May mask real type errors
- Makes refactoring harder

### Boolean Naming Convention

**Always prefix boolean variables and methods with `is`, `has`, `should`, `will`, or `can`.**

**DO ✅**
```typescript
// Variables
const isVisible = true;
const hasPermission = false;
const shouldUpdate = true;
const willComplete = false;
const canMove = true;

// Methods
isFirePressed(): boolean
hasInput(): boolean
shouldRender(): boolean
willCollide(): boolean
canAttack(): boolean

// Properties
interface Config {
  isEnabled: boolean;
  hasFeature: boolean;
}
```

**DON'T ❌**
```typescript
// Ambiguous names
const visible = true;  // Is this a boolean or visibility level?
const permission = false;  // Is this a boolean or permission object?
const update = true;  // Is this a boolean or update function?

// Methods without prefix
pressed(): boolean  // Unclear return type
input(): boolean
render(): boolean
```

**Benefits:**
- Immediately clear that value is boolean
- Self-documenting code
- Prevents confusion with other types
- Consistent with TypeScript/JavaScript conventions

### Include Units in Number Variable Names

**MANDATORY: Always include the unit of measurement in variable names when applicable.**

**This applies to:**
- Constants (top of file)
- Class fields/properties
- Function parameters
- Local variables with meaningful lifetime

**DO ✅**
```typescript
// Constants - ALWAYS include units
const ALERT_DURATION_MS = 1000;
const PLAYER_SPEED_PX_PER_SEC = 500;
const ATTACK_RANGE_PX = 300;
const FIELD_OF_VIEW_RAD = Math.PI / 2;

// Class fields - ALWAYS include units
class Component {
  private flashIntervalMs: number = 300;
  private shakeSpeedMs: number = 100;
  private offsetXPx: number = -120;
}

// Parameters - include units when not obvious
function wait(durationMs: number): void { }
function move(distancePx: number, speedPxPerSec: number): void { }

// Local variables with meaningful lifetime
const elapsedMs = Date.now() - startTimeMs;
const distancePx = Math.hypot(dx, dy);
```

**DON'T ❌**
```typescript
// Missing units - WRONG!
const ALERT_DURATION = 1000;  // Milliseconds? Seconds?
const PLAYER_SPEED = 500;  // What unit?
const ATTACK_RANGE = 300;  // Pixels? Meters?

// Class fields without units - WRONG!
class Component {
  private flashInterval: number = 300;  // What unit?
  private shakeSpeed: number = 100;  // What unit?
}

// Ambiguous parameters - WRONG!
function wait(duration: number): void { }  // What unit?
function move(distance: number, speed: number): void { }  // What units?
```

**Common unit suffixes:**
```typescript
// Time units
const stalkingTimeMs = 2000;  // Milliseconds
const animationTimerInSeconds = 1.5;  // Seconds
const cooldownMs = 200;
const durationInMinutes = 5;

// Distance/size units
const attackRangePx = 300;  // Pixels
const radiusInMeters = 10;
const offsetXPx = -120;

// Speed/velocity units
const speedPxPerSec = 500;  // Pixels per second
const velocityMps = 9.8;  // Meters per second

// Angles
const fieldOfViewRad = Math.PI / 2;  // Radians
const rotationDeg = 45;  // Degrees

// Other units
const healthPoints = 100;
const damagePercent = 25;
const weightKg = 5.5;
```

**DON'T ❌**
```typescript
// Ambiguous - what unit?
const stalkingTime = 2000;  // Milliseconds? Seconds?
const animationTimer = 1.5;  // Seconds? Frames?
const cooldown = 200;  // What unit?
const attackRange = 300;  // Pixels? Meters? Tiles?
const speed = 500;  // Pixels per second? Meters per second?
const fieldOfView = Math.PI / 2;  // Radians? Degrees?
```

**Common unit suffixes:**
- Time: `Ms` (milliseconds), `InSeconds`, `InMinutes`, `InHours`
- Distance: `Px` (pixels), `InMeters`, `InTiles`
- Speed: `PxPerSec`, `Mps` (meters per second)
- Angle: `Rad` (radians), `Deg` (degrees)
- Other: `Points`, `Percent`, `Kg`, etc.

**⚠️ CRITICAL: This is NOT optional!**
- Every time you write a number variable, ask: "What unit is this?"
- If it has a unit, add the suffix IMMEDIATELY
- No exceptions for "obvious" cases - be explicit
- Code review will reject PRs without unit suffixes

**Benefits:**
- Eliminates confusion about units
- Prevents unit conversion bugs (mixing ms with seconds, etc.)
- Self-documenting code
- Makes math operations clearer
- Easier to spot unit mismatches
- Catches bugs at code review time instead of runtime

### No Magic Numbers

**MANDATORY: Never use literal numbers directly in code. Always define them as named constants.**

**Magic numbers include:**
- Thresholds and limits (0.3, 100, 500)
- Multipliers and divisors (2, 0.5, 10)
- Mathematical constants beyond Math.PI (360, 2π)
- Array indices that have meaning (0 for "first", 1 for "second")
- Any number that isn't immediately obvious
- **Offsets and positions (50, -120, 16)**
- **Counts and quantities (3, 5, 10)**

**⚠️ CRITICAL RULE: If you type a number in code, STOP and ask yourself:**
1. **"What does this number represent?"**
2. **"Could someone want to change this value?"**
3. **"Will this number be used in multiple places?"**

**If the answer to ANY of these is YES, it MUST be a constant.**

**DO ✅**
```typescript
// Define ALL numbers as constants at top of file/class
const SHAKE_LOW_THRESHOLD = 0.3; // 30% - shake when below this
const SHAKE_FREQUENCY = 2; // full sine wave cycles
const MAX_HEALTH = 100;
const SPEED_MULTIPLIER = 2;
const DEGREES_IN_CIRCLE = 360;
const FIRST_WAYPOINT_INDEX = 0;
const SHADOW_OFFSET_Y_PX = 50; // pixels below sprite
const PARTICLE_BURST_COUNT = 3; // particles per burst

// Use named constants in code
if (ratio < SHAKE_LOW_THRESHOLD) {
  const offset = Math.sin(progress * Math.PI * SHAKE_FREQUENCY);
  health = Math.min(MAX_HEALTH, health + amount);
  speed = baseSpeed * SPEED_MULTIPLIER;
  angle = (angle + DEGREES_IN_CIRCLE) % DEGREES_IN_CIRCLE;
  const waypoint = waypoints[FIRST_WAYPOINT_INDEX];
  shadow.y = sprite.y + SHADOW_OFFSET_Y_PX;
  particles.explode(PARTICLE_BURST_COUNT);
}
```

**DON'T ❌**
```typescript
// Magic numbers inline - WRONG!
if (ratio < 0.3) {  // What does 0.3 mean?
  const offset = Math.sin(progress * Math.PI * 2);  // Why 2?
  health = Math.min(100, health + amount);  // Why 100?
  speed = baseSpeed * 2;  // Why 2?
  angle = (angle + 360) % 360;  // Why 360?
  const waypoint = waypoints[0];  // Why 0?
  shadow.y = sprite.y + 50;  // Why 50?
  particles.explode(3);  // Why 3?
}
```

**Only acceptable literal numbers:**
- `0` and `1` for initialization, array bounds, or obvious math
- `-1` for "not found" or "invalid index"
- `Math.PI` (but not multiples like `2 * Math.PI`)
- Powers of 2 in bit operations (but prefer named constants)

**⚠️ CRITICAL: This is NOT optional!**
- Every number you type should make you ask: "What does this represent?"
- If it has meaning, it needs a name
- No exceptions for "obvious" numbers like 2, 10, 100, 50
- Code review will reject PRs with magic numbers
- **AI assistants: You MUST add constants for ALL numbers. No excuses.**

**Benefits:**
- Self-documenting - name explains what the number means
- Easy to change - modify in one place
- Prevents typos - use the constant everywhere
- Makes relationships clear - see all related values together
- Easier to tune/balance - all config in one place

### No Unused Assignments

**Never assign a value to a variable that is immediately overwritten before being read.**

**DON'T ❌**
```typescript
let baseFrame = SPRITE_FRAME_DOWN;  // Unused - immediately overwritten
if (Math.abs(dx) > Math.abs(dy)) {
  baseFrame = dx > 0 ? SPRITE_FRAME_RIGHT : SPRITE_FRAME_LEFT;
} else {
  baseFrame = dy > 0 ? SPRITE_FRAME_DOWN : SPRITE_FRAME_UP;
}
```

**DO ✅**
```typescript
// Declare without initialization
let baseFrame: number;
if (Math.abs(dx) > Math.abs(dy)) {
  baseFrame = dx > 0 ? SPRITE_FRAME_RIGHT : SPRITE_FRAME_LEFT;
} else {
  baseFrame = dy > 0 ? SPRITE_FRAME_DOWN : SPRITE_FRAME_UP;
}

// Or use single expression
const isHorizontal = Math.abs(dx) > Math.abs(dy);
let baseFrame: number;
if (isHorizontal) {
  baseFrame = dx > 0 ? SPRITE_FRAME_RIGHT : SPRITE_FRAME_LEFT;
} else {
  baseFrame = dy > 0 ? SPRITE_FRAME_DOWN : SPRITE_FRAME_UP;
}
```

**Why this matters:**
- Wastes computation
- Misleads readers about intent
- May hide logic errors
- Reduces code clarity

### Derive Values from Base Constants

**Calculate dependent values instead of hardcoding them. This reduces the number of values you need to change.**

**DO ✅**
```typescript
// Single source of truth
const BUG_BASE_COLLISION_SIZE = grid.cellSize * 0.75;  // 75% of cell
const BASE_GRID_COLLISION_BOX = { 
  offsetX: 0, 
  offsetY: 0, 
  width: BUG_BASE_COLLISION_SIZE, 
  height: BUG_BASE_COLLISION_SIZE 
};
const BASE_ENTITY_COLLISION_BOX = { 
  offsetX: -BUG_BASE_COLLISION_SIZE / 2,  // Calculated from size
  offsetY: -BUG_BASE_COLLISION_SIZE / 2, 
  width: BUG_BASE_COLLISION_SIZE, 
  height: BUG_BASE_COLLISION_SIZE 
};

// Sprite scale derived from cell size
const scale = grid.cellSize / SPRITE_WIDTH_PX;

// Centering offset calculated
const centerOffset = (grid.cellSize - BUG_BASE_COLLISION_SIZE) / 2;
```

**DON'T ❌**
```typescript
// Multiple hardcoded values that must stay in sync
const BUG_BASE_COLLISION_SIZE = 48;  // What if cell size changes?
const BUG_BASE_GRID_OFFSET = 8;      // Must recalculate if size changes
const BUG_BASE_ENTITY_OFFSET = -24;  // Must recalculate if size changes
const BASE_GRID_COLLISION_BOX = { 
  offsetX: 8,   // Hardcoded
  offsetY: 8, 
  width: 48,    // Hardcoded
  height: 48 
};
```

**Benefits:**
- Change one value (e.g., `grid.cellSize`) and everything adjusts
- Relationships between values are explicit
- Fewer places to update when tuning
- Less chance of values getting out of sync

**Common patterns:**
```typescript
// Percentages of base values
const COLLISION_SIZE = BASE_SIZE * 0.75;
const OFFSET = BASE_SIZE * 0.25;

// Centering calculations
const centerX = baseX + (width / 2);
const offsetToCenter = (containerSize - itemSize) / 2;

// Negative of positive value
const leftOffset = -rightOffset;
const halfSize = size / 2;
const negativeHalfSize = -halfSize;
```

### No Unnecessary Fallbacks in Spread

**Don't use fallback objects when spreading - spreading `undefined` or `null` is safe.**

**DON'T ❌**
```typescript
const config = { ...DEFAULT_CONFIG, ...(data.options || {}) };
const merged = { ...base, ...(override ?? {}) };
```

**DO ✅**
```typescript
const config = { ...DEFAULT_CONFIG, ...data.options };
const merged = { ...base, ...override };
```

**Why this matters:**
- Spreading `undefined` or `null` in objects is safe - no error thrown
- Fallback creates unnecessary empty object
- Adds code bloat and reduces readability
- Small performance cost

**Rule enforced by:** `unicorn/no-useless-fallback-in-spread`

### Avoid Duplicate Branch Implementations

**If two branches in a conditional have identical implementations, combine them.**

**DON'T ❌**
```typescript
if (!xBlocked && !yBlocked) {
  reset();
  stop();
} else if (xBlocked) {
  slideY();
} else if (yBlocked) {
  reset();  // Duplicate of first branch
  stop();
} else {
  slideX();
}
```

**DO ✅**
```typescript
if ((!xBlocked && !yBlocked) || yBlocked) {
  reset();
  stop();
} else if (xBlocked) {
  slideY();
} else {
  slideX();
}
```

**Why this matters:**
- Reduces code duplication
- Makes logic clearer
- Easier to maintain
- May indicate logic error

**Note:** ESLint doesn't catch this - requires manual review or SonarQube

### Use for-of for Iterables

**DO ✅**
```typescript
for (const entity of entities) {
  entity.update(delta);
}
```

**DON'T ❌**
```typescript
for (let i = 0; i < entities.length; i++) {
  entities[i].update(delta);
}
```

**Exception:** Use traditional for loop when you need the index or are modifying the array during iteration.

---

## TypeScript Standards

### No Non-Null Assertions

**Never use non-null assertions (`!`) - use `entity.require()` or proper null checks instead.**

**DO ✅**
```typescript
// Use require() for mandatory components (throws if missing)
const transform = entity.require(TransformComponent);
const sprite = entity.require(SpriteComponent);
transform.x += velocity.x;

// Use get() + null check ONLY for truly optional components
const knockback = entity.get(KnockbackComponent);  // May not exist
if (knockback) {
  knockback.apply(dirX, dirY);
}
```

**DON'T ❌**
```typescript
// Non-null assertion - bypasses type safety
const transform = entity.get(TransformComponent)!;
transform.x += velocity.x;

// get() + early return for mandatory components
const transform = entity.get(TransformComponent);
if (!transform) return;  // Should use require()
```

**When to use each:**
- `entity.require()` - Component is mandatory for this entity type
- `entity.get()` - Component is truly optional (may not exist)
  - Examples: `KnockbackComponent`, `HitFlashComponent` (temporary)
  - Examples: Optional features, temporary effects
- Never use `!` - Bypasses safety

**Special case - Collision handlers:**
When accessing components on the OTHER entity in a collision handler, the entity might be destroyed by its own collision handler first. In this case, use `require()` and ensure projectiles delay their destruction:

```typescript
// Projectile collision handler - delay destruction
entity.add(new CollisionComponent({
  collidesWith: ['enemy'],
  onHit: (other) => {
    // Apply damage, effects, etc.
    scene.time.delayedCall(0, () => entity.destroy());  // Delay to next frame
  }
}));

// Target collision handler - safe to use require()
entity.add(new CollisionComponent({
  collidesWith: ['player_projectile'],
  onHit: (other) => {
    const projectile = other.require(ProjectileComponent);  // Safe - not destroyed yet
    const dirX = projectile.dirX;
    const dirY = projectile.dirY;
    // Use projectile data...
  }
}));
```

**Why this matters:**
- `require()` fails fast with clear error messages
- Bugs caught immediately in development
- No silent failures that hide issues
- Makes component dependencies explicit
- Delayed destruction ensures all collision handlers can access data

### Use Class Fields Instead of Constructor Assignment

**Declare class properties as fields when they don't depend on constructor parameters.**

**DO ✅**
```typescript
class MyComponent {
  // Properties declared as fields
  private elapsedTime = 0;
  private isActive = false;
  private items: string[] = [];
  
  // Only use constructor for parameters
  constructor(private readonly scene: Phaser.Scene) {}
}
```

**DON'T ❌**
```typescript
class MyComponent {
  private elapsedTime: number;
  private isActive: boolean;
  private items: string[];
  
  constructor(private readonly scene: Phaser.Scene) {
    // Don't assign in constructor if not using parameters
    this.elapsedTime = 0;
    this.isActive = false;
    this.items = [];
  }
}
```

**Why this matters:**
- Cleaner, more readable code
- Follows modern JavaScript standards
- Reduces boilerplate
- Makes property declarations immediately visible
- Aligns with class field syntax in ES2022+

**When to use constructor:**
```typescript
// DO ✅ - Uses constructor parameter
class MyComponent {
  private readonly maxValue: number;
  
  constructor(maxValue: number) {
    this.maxValue = maxValue;
  }
}

// DO ✅ - Needs computation
class MyComponent {
  private readonly halfSize: number;
  
  constructor(size: number) {
    this.halfSize = size / 2;
  }
}

// DON'T ❌ - No parameter needed
class MyComponent {
  private count: number;
  
  constructor() {
    this.count = 0;  // Should be: private count = 0;
  }
}
```

**Rule enforced by:** `unicorn/prefer-class-fields`

### No Default Parameter Values

**DO ✅**
```typescript
// Require all parameters explicitly
interface HealthProps {
  maxHealth: number;  // Required, no default
}

class HealthComponent {
  constructor(props: HealthProps) {
    this.maxHealth = props.maxHealth;
  }
}

// Usage - explicit at call site
new HealthComponent({ maxHealth: 100 });

// Defaults at API boundaries only
function enterMoveMode(entity?: Entity): void {
  if (!entity) {
    entity = getDefaultEntity();  // Explicit default at entry point
  }
  stateMachine.enter('move', entity);
}
```

**DON'T ❌**
```typescript
// Don't use default parameter values
interface HealthProps {
  maxHealth?: number;  // Optional with implicit default
}

class HealthComponent {
  constructor(props: HealthProps = {}) {
    this.maxHealth = props.maxHealth ?? 100;  // Hidden default
  }
}

// Don't use default values in function parameters
function createEntity(health: number = 100) {  // Hidden default
  // ...
}

// Don't use defaults deep in implementation
class MoveState {
  onEnter(entity?: Entity) {
    this.entity = entity ?? getDefaultEntity();  // Hidden default
  }
}
```

**Rationale:**
- Defaults hide behavior and make code harder to understand
- Explicit values at call sites make intent clear
- Defaults at API boundaries (public methods) are acceptable for convenience
- Internal implementation should be strict and require what it needs

**Common violations to watch for:**
- `props.value ?? defaultValue` in constructors
- Optional props with `?:` that have implicit defaults
- `entity.get()` with early return instead of `entity.require()`
- Silent failures that hide missing components

### Use Type Aliases Instead of Interfaces

**Always use `type` instead of `interface` for type definitions.**

**DO ✅**
```typescript
export type MyComponentProps = {
  speed: number;
  duration: number;
};

export type LevelData = {
  width: number;
  height: number;
  cells: CellData[];
};
```

**DON'T ❌**
```typescript
export interface MyComponentProps {  // Use type instead
  speed: number;
  duration: number;
}

export interface LevelData {  // Use type instead
  width: number;
  height: number;
  cells: CellData[];
}
```

**Why this matters:**
- Consistent codebase style
- Types are more flexible (can represent unions, intersections, primitives)
- Interfaces have subtle differences that can cause confusion
- TypeScript team recommends types for most cases

**Rule enforced by:** `@typescript-eslint/consistent-type-definitions`

### Imports

**DO ✅**
```typescript
// Use relative paths based on file location
import type { Component } from '../Component';  // In components/ folder
import type { Entity } from '../Entity';

// Use 'import type' for type-only imports
import type { IState } from '../utils/state/IState';

// Use 'export type' when re-exporting interfaces
export type { Component } from './Component';
```

**DON'T ❌**
```typescript
// Wrong relative path
import type { Component } from './Component';  // In components/ folder

// Missing 'type' keyword
import { Component } from '../Component';

// Re-exporting without 'type'
export { Component } from './Component';
```

### Readonly Properties

**DO ✅**
```typescript
// Mark properties readonly if never reassigned
class MyComponent {
  constructor(
    private readonly grid: Grid,
    private readonly transform: TransformComponent
  ) {}
}

// Mutable state is fine
class MyComponent {
  private currentHealth: number = 100;  // Changes during gameplay
}
```

**DON'T ❌**
```typescript
// Readonly on reassigned property
class MyComponent {
  private readonly occupiedCells: Set<string> = new Set();
  
  update() {
    this.occupiedCells = new Set();  // ERROR: Can't reassign readonly
  }
}

// Not using readonly for immutable references
class MyComponent {
  constructor(private grid: Grid) {}  // Should be readonly
}
```

### Unused Parameters

**DO ✅**
```typescript
// Prefix unused parameters with underscore
update(_delta: number): void {
  // delta not used
}
```

### Type Safety

**DO ✅**
```typescript
// Specific types
private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;

// Constructor types
get<T extends Component>(componentClass: new (...args: never[]) => T): T | undefined

// Optional chaining
scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.G);

// Non-null assertion when guaranteed
const transform = this.entity.get(TransformComponent)!;
```

**DON'T ❌**
```typescript
// Never use 'any'
private keys: any;
get<T>(componentClass: new (...args: any[]) => T): T

// Untyped objects
private keys: { [key: string]: any };
```

### Duplicate Declarations

**DON'T ❌**
```typescript
// Declaring property twice
class Grid {
  private scene: Phaser.Scene;
  
  constructor(private scene: Phaser.Scene) {}  // Duplicate!
}
```

**DO ✅**
```typescript
// Use parameter property OR separate declaration
class Grid {
  constructor(private readonly scene: Phaser.Scene) {}
}
```

## Component Design Principles

### Props-Based Configuration

**ALWAYS use props objects for component configuration.** Think about what might vary between different entities and pass those values as props.

**DO ✅**
```typescript
// Define props interface
export interface WalkProps {
  speed?: number;
  accelerationTime?: number;
  stopThreshold?: number;
}

// Use props in constructor
export class WalkComponent implements Component {
  private readonly speed: number;
  private readonly accelerationTime: number;
  private readonly stopThreshold: number;

  constructor(
    private readonly transformComp: TransformComponent,
    private readonly inputComp: InputComponent,
    props: WalkProps = {}
  ) {
    this.speed = props.speed ?? 300;
    this.accelerationTime = props.accelerationTime ?? 300;
    this.stopThreshold = props.stopThreshold ?? 50;
  }
}

// Usage: Easy to customize per entity
new WalkComponent(transform, input)  // Player with defaults
new WalkComponent(transform, input, { speed: 450 })  // Fast enemy
new WalkComponent(transform, input, { speed: 150, accelerationTime: 500 })  // Slow tank
```

**DON'T ❌**
```typescript
// Hardcoded values - not reusable
class WalkComponent {
  private readonly speed = 300;  // Can't change for different entities
  private readonly accelerationTime = 300;
}

// Long parameter lists - hard to read
constructor(
  transform: TransformComponent,
  input: InputComponent,
  speed: number = 300,
  accelerationTime: number = 300,
  stopThreshold: number = 50,
  friction: number = 0.8,
  maxVelocity: number = 500
) {}  // What does each number mean?
```

**Benefits:**
- Named parameters (self-documenting)
- Easy to add new options without breaking existing code
- Same component works for player, enemies, NPCs
- Clear what each value represents

### Single Responsibility

Each component should do ONE thing:

**DO ✅**
```typescript
// InputComponent - ONLY handles input
class InputComponent {
  getInputDelta(): { dx: number; dy: number }
  getRawInputDelta(): { dx: number; dy: number }
  isFirePressed(): boolean
}

// WalkComponent - ONLY handles movement physics
class WalkComponent {
  update(delta: number): void  // Movement logic
  isMoving(): boolean
  getVelocityMagnitude(): number
}
```

**DON'T ❌**
```typescript
// Component doing too much
class PlayerComponent {
  handleInput()      // Should be InputComponent
  updateMovement()   // Should be WalkComponent
  updateAnimation()  // Should be AnimationComponent
  checkCollision()   // Should be GridCollisionComponent
}
```

### Decoupling Through Callbacks

**DO ✅**
```typescript
// Reusable across player, enemies, turrets
class ProjectileEmitterComponent {
  constructor(
    private readonly onFire: (x: number, y: number, dirX: number, dirY: number) => void,
    private readonly shouldFire: () => boolean,  // Callback decides when
    private readonly cooldown: number
  ) {}
}

// Player: shouldFire: () => input.isFirePressed()
// Enemy: shouldFire: () => aiComponent.shouldAttack()
// Turret: shouldFire: () => playerInRange && hasLineOfSight
```

**DON'T ❌**
```typescript
// Hardcoded to player input
class ProjectileEmitterComponent {
  constructor(scene: Phaser.Scene) {
    this.fireKey = scene.input.keyboard!.addKey(KeyCodes.SPACE);
  }
}
```

### Minimal Dependencies

**DO ✅**
```typescript
// Component only depends on what it needs
class WalkComponent {
  constructor(
    private readonly transformComp: TransformComponent,
    private readonly inputComp: InputComponent
  ) {}
}
```

**DON'T ❌**
```typescript
// Component depends on entire entity or scene
class WalkComponent {
  constructor(private readonly entity: Entity) {}
  
  update() {
    // Reaches into entity to get everything
    const transform = this.entity.get(TransformComponent)!;
    const input = this.entity.get(InputComponent)!;
  }
}
```

## Entity Design

### One Component Type Per Entity

**DO ✅**
```typescript
// Entity enforces this at runtime
entity.add(new HealthComponent());
entity.add(new AmmoComponent());  // Different types - OK
```

**DON'T ❌**
```typescript
// This will throw an error
entity.add(new HudBarComponent(health));
entity.add(new HudBarComponent(ammo));  // ERROR: Duplicate type
```

**Solution**: Design components to handle multiple instances internally:
```typescript
// Single component handles multiple bars
entity.add(new HudBarComponent(scene, [
  { dataSource: health, offsetY: 70, fillColor: 0x00ff00 },
  { dataSource: ammo, offsetY: 90, fillColor: 0x0000ff },
]));
```

### Class-Based Update Order

**DO ✅**
```typescript
entity.setUpdateOrder([
  TransformComponent,
  SpriteComponent,
  InputComponent,
  WalkComponent,
  GridCollisionComponent,
  StateMachineComponent,
  AnimationComponent,
]);
```

**DON'T ❌**
```typescript
// Don't use instances
entity.setUpdateOrder([
  transform,
  sprite,
  input,
  // ...
]);
```

## File Organization

### Constants vs Domain Code

**DO ✅**
```
src/
├── constants/
│   └── Direction.ts        # Shared across systems
├── animation/
│   ├── Animation.ts
│   └── AnimationSystem.ts
├── ecs/
│   └── components/
└── player/
```

**DON'T ❌**
```
src/
├── animation/
│   ├── Direction.ts        # Implies animation-specific
│   ├── Animation.ts
│   └── AnimationSystem.ts
```

## Asset Management

### Register All Assets

**DO ✅**
```typescript
// In AssetRegistry.ts
export const ASSET_REGISTRY = {
  crosshair: {
    key: 'crosshair',
    path: 'assets/player/crosshair.png',
    type: 'image' as const,
  },
} as const;

// In AssetLoader.ts
const keysToLoad: AssetKey[] = keys || ['player', 'bullet_default', 'crosshair'];
```

**DON'T ❌**
```typescript
// Loading assets directly in scene
this.load.image('crosshair', 'assets/player/crosshair.png');  // Not centralized
```

## Common Patterns

### Private Helper Methods

**DO ✅**
```typescript
class WalkComponent {
  update(delta: number): void {
    const movementInput = this.inputComp.getInputDelta();
    const facingInput = this.inputComp.getRawInputDelta();
    
    if (facingInput.dx !== 0 || facingInput.dy !== 0) {
      this.updateFacingDirection(facingInput.dx, facingInput.dy);
    }
    
    const targetVelocity = this.calculateTargetVelocity(movementInput.dx, movementInput.dy);
    this.applyMomentum(targetVelocity, delta);
    this.applyStopThreshold();
  }

  private updateFacingDirection(dx: number, dy: number): void { /* ... */ }
  private calculateTargetVelocity(dx: number, dy: number): { x: number; y: number } { /* ... */ }
  private applyMomentum(target: { x: number; y: number }, delta: number): void { /* ... */ }
  private applyStopThreshold(): void { /* ... */ }
}
```

**Benefits:**
- Clear intent from method names
- Single responsibility per method
- Easy to test and debug
- Self-documenting code

### Named Constants

**DO ✅**
```typescript
class WalkComponent {
  private readonly accelerationTime = 300; // ms to reach full speed
  private readonly stopThreshold = 50;     // velocity below this snaps to zero
}
```

**DON'T ❌**
```typescript
// Magic numbers
if (velocityMagnitude < 50) {  // What does 50 mean?
  this.velocityX = 0;
}
```

### Avoiding Duplicate Configuration

**DON'T ❌**
```typescript
// Duplicate values in different components
class TouchJoystickComponent {
  private readonly maxRadius = 70;
}

class JoystickVisualsComponent {
  private readonly outerRadius = 100;  // Different value!
}
```

**DO ✅**
```typescript
// Single source of truth
class TouchJoystickComponent {
  public readonly maxRadius = 70;      // Owner of the value
  public readonly innerRadius = 30;
}

class JoystickVisualsComponent {
  constructor(private readonly joystick: TouchJoystickComponent) {}
  
  init(): void {
    this.outerCircle = this.scene.add.circle(0, 0, this.joystick.maxRadius);
    this.innerCircle = this.scene.add.circle(0, 0, this.joystick.innerRadius);
  }
}
```

**Why this matters:**
- Configuration stays in sync
- Clear ownership of values
- Single place to update
- No confusion about which value is correct

### Shared UI Patterns in Editor

**DO ✅**
```typescript
// In EditorState base class
protected createBackButton(): Phaser.GameObjects.Text {
  const height = this.scene.cameras.main.height;
  const backButton = this.scene.add.text(100, height - 50, 'Back', {
    fontSize: '24px',
    color: '#ffffff',
    backgroundColor: '#333333',
    padding: { x: 20, y: 10 }
  });
  // ... setup interactions
  return backButton;
}

// In GridEditorState, MoveEditorState, ResizeEditorState
onEnter(): void {
  this.backButton = this.createBackButton();  // Consistent position and style
  // ... other UI
}
```

**Benefits:**
- Consistent positioning (lower-left corner)
- Consistent styling
- Single place to update
- Less code duplication

### Components with init() Methods

Some components need initialization after being added to an entity:

**Pattern:**
```typescript
// In entity factory function
const hudBars = entity.add(new HudBarComponent(scene, configs));
hudBars.init();  // Must call init() after add()

const overheatSmoke = entity.add(new OverheatSmokeComponent(scene, ammo, offsets));
overheatSmoke.init();  // Must call init() after add()
```

**Why init() is needed:**
- Component needs access to `this.entity` (set by `add()`)
- Component creates Phaser game objects that need scene reference
- Separation of construction from initialization

**When to use init():**
- Creating Phaser sprites, particles, or graphics
- Setting up event listeners
- Accessing other components on the entity

### Configuration Constants

**Always define configuration values as constants at the top of the file.**

**DO ✅**
```typescript
// At top of file
const PLAYER_WALK_SPEED = 500;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_FIRE_COOLDOWN = 200;
const ALERT_DURATION = 1000;
const EXCLAMATION_OFFSET_Y = -120;

// Use in code
entity.add(new WalkComponent(transform, input, {
  speed: PLAYER_WALK_SPEED,
  // ...
}));

if (this.elapsed >= ALERT_DURATION) {
  stateMachine.enter('stalking');
}
```

**DON'T ❌**
```typescript
// Hardcoded inline values
entity.add(new WalkComponent(transform, input, {
  speed: 500,  // What does 500 mean? Hard to find and change
  // ...
}));

if (this.elapsed >= 1000) {  // Magic number
  stateMachine.enter('stalking');
}
```

**Benefits:**
- Easy to find and tweak values
- Self-documenting code
- Single source of truth
- Easier to balance gameplay
- Clear what values are configurable

**Where to place constants:**
- Top of file, after imports
- Use UPPER_SNAKE_CASE for naming
- Group related constants together
- Add comments for non-obvious values

### Circular Hit Detection

For touch/click areas, use circular collision for natural feel:

```typescript
// Set bounds
const radius = (this.sprite.width / 2) * this.scale;
this.joystick.setCrosshairBounds(x, y, radius);

// Check if touch is within circle
const dx = pointer.x - this.crosshairBounds.x;
const dy = pointer.y - this.crosshairBounds.y;
const distance = Math.sqrt(dx * dx + dy * dy);

if (distance <= this.crosshairBounds.radius) {
  // Touch is inside circle
}
```

**Benefits:**
- More natural than rectangular hit boxes
- Matches circular UI elements
- Easy to calculate
- Scales with sprite size

## ESLint Configuration

Key rules enforced:
- `@typescript-eslint/no-unused-vars`: Allows `_` prefix for unused parameters, catches unused assignments
- `@typescript-eslint/no-explicit-any`: Disallows `any` type
- `@typescript-eslint/prefer-readonly`: Suggests readonly for immutable properties
- `@typescript-eslint/no-empty-function`: Disallows empty functions (use comments if intentionally empty)
- `@typescript-eslint/consistent-type-definitions`: Enforces `type` over `interface`
- `unicorn/no-useless-fallback-in-spread`: Prevents unnecessary `|| {}` in object spreads
- `unicorn/prefer-class-fields`: Enforces class field syntax over constructor assignment
- `no-nested-ternary`: Warns about nested ternary expressions (use if-else instead)

## Summary

1. **Always build and lint** after every change
2. **Single responsibility** - one component, one job
3. **Decouple through callbacks** - make components reusable
4. **Minimal dependencies** - only depend on what you need
5. **Type safety** - never use `any`, use specific types
6. **Configuration constants** - define values at top of file, not inline
7. **Private helpers** - break complex methods into focused functions
8. **One component type per entity** - enforced at runtime
9. **Shared UI patterns** - use base class methods (e.g., `createBackButton()`)
10. **Grid cell size consistency** - always use `this.grid.cellSize`
