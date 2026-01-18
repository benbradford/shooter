**Project Overview: Dodging Bullets**

**Goal:**
Create a 2D top-down cross-platform game using Phaser, with fixed grid-based movement, player animations, and support for scrolling rooms.

---

**1. Grid System:**

* **Fixed-size cells:** 64x64 pixels.
* **Grid dimensions:** 30x30 to 40x30, depending on room.
* **Purpose:** Easier collision detection and placement of walls/enemies.
* **Scrolling:** The grid can be larger than the visible screen; camera follows player.
* **Debug rendering:** Toggle grid lines with 'G' key; non-walkable cells are filled in red.
* **Grid API:**

  ```ts
  class Grid {
    cells: CellData[][];
    render(): void;
    setCell(col: number, row: number, data: Partial<CellData>): void;
    getCell(col: number, row: number): CellData | null;
  }
  ```

**2. Player System:**

* **Player class:** Extends `Phaser.GameObjects.Sprite`.
* **Movement:** Keyboard controls (WASD + arrow keys) with normalized diagonal movement.
* **Speed:** Adjustable (default 300 px/s).
* **Animation System:**

  * Supports multiple directions and states (`idle`, `walk`).
  * `AnimationSystem` manages multiple `Animation` objects keyed by `{name}_{direction}`.
  * `Animation` supports `static`, `repeat`, and `pingpong` styles.
* **Player API:**

  ```ts
  class Player extends Phaser.GameObjects.Sprite {
    update(time: number, delta: number): void;
    animationSystem: AnimationSystem;
  }
  ```
* **State Machine (planned):**

  * For handling states like `walk`, `idle`, `attack`, `hit`, `die`.
  * Each state implements `IState` with `onEnter()`, `onExit()`, `update(delta)`.

**3. Scene Setup:**

* **GameScene:**

  * Loads player assets via `preloadPlayerAssets(scene)`.
  * Creates `Player` and `Grid` instances.
  * Camera setup:

    ```ts
    this.cameras.main.setBounds(0, 0, gridWidth * cellSize, gridHeight * cellSize);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    ```
  * `update()` calls `player.update()` and `grid.render()`.

**4. Asset Loading:**

* Player sprite sheets for 8 directions and idle animations.
* Example naming convention:

  * `mcdown01.png`, `mcdown02.png`, `mcdown03.png` (walking down)
  * `mcdownidle.png` (idle down)
  * Similar for `up`, `left`, `right`, `upleft`, `upright`, `downleft`, `downright`

**5. Scaling / Alignment:**

* Fixed 64x64 cells always align with visible screen.
* Initial canvas width and height are **multiples of 64** to ensure perfect alignment.
* Camera handles scrolling; later we can add zoom/scaling.

**6. Controls:**

* Player movement: Arrow keys + WASD.
* Toggle grid debug: G.

**7. Next Steps / Planned Features:**

* Implement collision detection against `grid.getCell(col,row).walkable`.
* Add multiple rooms / level transitions.
* Add enemies with their own state machines (move, shoot, throw, hit, die).
* Integrate animation state machine fully into player and enemies.
* Optionally add tile snapping for player and NPCs.

---

This document provides a **high-level overview** of the current state of the game project, grid, player, animation systems, and scene setup. It is meant to **help Kiro understand the architecture and next steps** for development.
