# World State Directory

This directory contains saved game state files.

## default.json

The game automatically loads `default.json` on startup if it exists. This file tracks:
- Player health and current level
- Destroyed entities per level
- Live entities (spawned via events) per level
- Fired triggers (prevents re-firing)
- Modified cells (doors opened, walls removed, etc.)

## Creating a Save File

1. Play the game
2. Press **Y** to export world state
3. World state is copied to clipboard and logged to console
4. Paste into `public/states/default.json`
5. Refresh browser to load from saved state

## File Format

See `specs/world-state-system.md` for complete structure.

## Note

This file is gitignored - each developer has their own save state.
