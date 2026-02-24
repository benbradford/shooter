# SOP: Adding Background Textures

## When to Use
When adding new textures that can be placed on grid cells (doors, decorations, floor tiles, etc.).

## Prerequisites
- Texture file (PNG format, ideally 128x128 or smaller)
- Texture placed in `public/assets/` subdirectory

## Step 1: Add Texture File

Place your texture in the appropriate directory:
- Dungeon elements: `public/assets/cell_drawables/`
- Decorations: `public/assets/cell_drawables/`
- Buildings: `public/assets/cell_drawables/`

**Recommended size:** 128x128 pixels (can be resized with `sips -z 128 128 path/to/file.png` on macOS)

## Step 2: Register in AssetRegistry

Add to `src/assets/AssetRegistry.ts`:

```typescript
your_texture: {
  key: 'your_texture',
  path: 'assets/cell_drawables/your_texture.png',
  type: 'image' as const
},
```

**Location:** Add alphabetically within the existing assets.

## Step 3: Add to AssetLoader

Add to default assets in `src/assets/AssetLoader.ts`:

```typescript
const keysToLoad: AssetKey[] = keys ?? [
  'player', 'attacker', ..., 'your_texture', ...
];
```

**Location:** Add to the array (order doesn't matter but alphabetical is cleaner).

## Step 4: Add to Texture Editor

Add to `src/editor/TextureEditorState.ts`:

```typescript
const AVAILABLE_TEXTURES: string[] = [
  'door_closed', 'dungeon_door', ..., 'your_texture', ...
];
```

**Location:** Add alphabetically to the array.

## Step 5: (Optional) Add Transform Override

If the texture needs custom scaling or positioning, add to `src/scenes/theme/GameSceneRenderer.ts`:

```typescript
const BACKGROUND_TEXTURE_TRANSFORM_OVERRIDES: Record<string, { 
  scaleX: number; 
  scaleY: number; 
  offsetX: number; 
  offsetY: number 
}> = {
  house1: { scaleX: 4, scaleY: 4, offsetX: 23, offsetY: 0 },
  your_texture: { scaleX: 2, scaleY: 2, offsetX: 0, offsetY: 0 }
};
```

**When to use:**
- Texture needs to be larger/smaller than cell size
- Texture needs to be offset from cell center

## Step 6: Build and Test

```bash
npm run build
npm run dev
```

**Test in editor:**
1. Press E to enter editor
2. Click Texture button
3. Verify your texture appears in the panel
4. Click texture, then click a cell
5. Verify texture renders correctly

## Step 7: Verify in Level JSON

Click Log button and check the cell has:

```json
{
  "col": 10,
  "row": 5,
  "backgroundTexture": "your_texture"
}
```

## Checklist

- [ ] Texture file added to `public/assets/`
- [ ] Added to `AssetRegistry.ts`
- [ ] Added to `AssetLoader.ts` default assets
- [ ] Added to `AVAILABLE_TEXTURES` in `TextureEditorState.ts`
- [ ] (Optional) Added transform override if needed
- [ ] Build passes (`npm run build`)
- [ ] Texture appears in editor
- [ ] Texture renders correctly on grid
- [ ] Texture saves to level JSON

## Common Issues

**Texture not appearing in editor:**
- Check it's in AVAILABLE_TEXTURES array
- Verify asset key matches exactly

**Texture not rendering:**
- Check AssetRegistry path is correct
- Verify texture is in AssetLoader default assets
- Check browser console for loading errors

**Texture wrong size:**
- Add transform override in GameSceneRenderer.ts
- Use scaleX/scaleY to adjust size

**Texture wrong position:**
- Add transform override with offsetX/offsetY
- Positive offset moves right/down, negative moves left/up
