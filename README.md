**Project Overview: Dodging Bullets**

**Goal:**
Create a 2D top-down cross-platform game using Phaser, with fixed grid-based movement, player animations, and support for scrolling rooms.

WIP hosted on https://dodging-bullets.netlify.app/

---

**Development:**

Use
```
kiro-cli chat --agent dodging-bullets
```
to start a kiro session with context on the project

## Setup Instructions

### Prerequisites

**All Platforms:**
- Node.js 18+ and npm
- Git

**macOS:**
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Verify installation
node --version  # Should be 18+
npm --version
```

**Linux/Raspberry Pi:**
```bash
# Update package list
sudo apt update

# Install Node.js 18+ (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be 18+
npm --version

# Install build essentials (required for some npm packages)
sudo apt install -y build-essential
```

### Initial Setup

1. **Clone the repository:**
```bash
git clone <repository-url>
cd dodging-bullets
```

2. **Install dependencies:**
```bash
npm install
```

3. **Verify installation:**
```bash
# This should complete without errors
npm run build
```

### Development

**Start the development server:**
```bash
npm run dev
```

The game will be available at `http://localhost:5173`

**Development workflow:**
- The dev server has hot reload - changes are reflected automatically
- Keep the dev server running in one terminal
- Make code changes in your editor
- After each change, run build and lint in another terminal:

```bash
npm run build                # Must pass with zero errors
npx eslint src --ext .ts     # Must pass with zero errors
```

**Level editing workflow:**
- Press **E** in-game to open the level editor
- Make changes to the grid (see [Level Editor docs](./docs/level-editor.md))
- Click **Save** to download the level JSON
- Run `./scripts/update-levels.sh` to copy from Downloads to project
- Refresh browser to see changes

### Building for Production

**Create production build:**
```bash
npm run build
```

This creates optimized files in the `dist/` directory.

**Preview production build locally:**
```bash
npm run preview
```

### Deployment

#### Deploy to Static Hosting (Netlify, Vercel, GitHub Pages)

1. **Build the project:**
```bash
npm run build
```

2. **Deploy the `dist/` directory:**

**Netlify:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**Vercel:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**GitHub Pages:**
```bash
# Add to package.json scripts:
# "deploy": "npm run build && gh-pages -d dist"

npm install -g gh-pages
npm run deploy
```

#### Deploy to Raspberry Pi (Local Web Server)

1. **Install Nginx:**
```bash
sudo apt install -y nginx
```

2. **Build the project:**
```bash
npm run build
```

3. **Copy files to web server:**
```bash
sudo cp -r dist/* /var/www/html/
```

4. **Start Nginx:**
```bash
sudo systemctl start nginx
sudo systemctl enable nginx  # Start on boot
```

5. **Access the game:**
- Local: `http://localhost`
- Network: `http://<raspberry-pi-ip>`

#### Deploy as Electron App (Desktop)

1. **Install Electron dependencies:**
```bash
npm install --save-dev electron electron-builder
```

2. **Create `electron.js` in project root:**
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 960,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  win.loadFile('dist/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

3. **Add to `package.json`:**
```json
{
  "main": "electron.js",
  "scripts": {
    "electron": "npm run build && electron .",
    "package": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.dodgingbullets.game",
    "files": ["dist/**/*", "electron.js"],
    "directories": {
      "output": "release"
    }
  }
}
```

4. **Run or package:**
```bash
# Run in development
npm run electron

# Package for distribution
npm run package
```

### Troubleshooting

**Build fails with TypeScript errors:**
- Check the error message for the file and line number
- Fix the TypeScript error
- Run `npm run build` again

**ESLint errors:**
- Run `npx eslint src --ext .ts` to see all errors
- Fix each error (unused variables, type issues, etc.)
- Run again until it passes

**Port 5173 already in use:**
```bash
# Kill the process using the port
lsof -ti:5173 | xargs kill -9

# Or use a different port
npm run dev -- --port 3000
```

**Permission denied on Linux/Pi:**
```bash
# If you get EACCES errors with npm
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER .
```

**Missing dependencies:**
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## ⚠️ CRITICAL: Development Workflow ⚠️

**After EVERY code change, you MUST run:**

```bash
npm run build                # TypeScript compilation - MUST pass
npx eslint src --ext .ts     # Code quality check - MUST pass
```

**Both commands must complete with zero errors before considering any change complete.**

---

## Documentation

### Core Guides
- **[Coding Standards](./docs/coding-standards.md)** - TypeScript best practices, modern JavaScript standards, component design principles
- **[ECS Architecture](./docs/ecs-architecture.md)** - Entity-Component system, EntityManager, creating new entities, component library
- **[Collision System](./docs/collision-system.md)** - Entity collision detection, tags, collision boxes, damage system
- **[Grid and Collision](./docs/grid-and-collision.md)** - Grid system, layer-based collision, scene setup
- **[Input Systems](./docs/input-systems.md)** - Joystick controls, keyboard input, touch firing
- **[Level System](./docs/level-system.md)** - Loading levels from JSON, level data structure, creating levels
- **[Level Editor](./docs/level-editor.md)** - Editor mode, scene overlay system, future features
- **[Adding Enemies](./docs/adding-enemies.md)** - Complete guide for implementing new enemy types with state machines and components
- **[Particle Effects](./docs/particle-effects.md)** - Creating particle effects, entity ownership, following transforms, common patterns
- **[Hit Flash System](./docs/hit-flash-system.md)** - Reusable damage feedback component for all entities
- **[Screen Scaling and HUD](./docs/screen-scaling-and-hud.md)** - Critical quirks for screen scaling, coordinate systems, HUD positioning, Android compatibility

### Quick Reference
- **[Quick Reference](./docs/quick-reference.md)** - Common tasks, patterns, troubleshooting
- **[Component Props Pattern](./docs/component-props-pattern.md)** - Props-based component configuration

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
