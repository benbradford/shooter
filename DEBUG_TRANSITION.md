# Debug Level Transition

## Instructions

1. Start the game: `npm run dev`
2. Open browser console (F12)
3. Press **L** key to trigger level transition
4. Watch the console logs to see the exact sequence

## What to Look For

### Expected Sequence (if working correctly):
```
[LoadingScene] init() called
[SceneState] Before scene.stop: { active: true, objects: X }
[LoadingScene] Calling scene.stop("game")
[SceneState] After scene.stop (immediate): { active: true, objects: X }
[SceneDebug] shutdown game
[SceneState] loadLevel start: { active: false, objects: 0 }
[LoadingScene] About to unload previous level assets
[SceneState] Before unload: { active: false, objects: 0 }
[TextureDebug] Removing texture: ...
[SceneState] After unload: { active: false, objects: 0 }
```

### Bug Indicators:
1. **Texture removed while objects > 0** → Objects still exist when texture removed
2. **No shutdown event before unload** → Unloading before scene fully stopped
3. **Double destroy logs** → Objects destroyed twice
4. **Animation references** → Animations still reference removed textures

## Next Steps

Based on the logs, we'll know:
1. When does `shutdown` event fire relative to `scene.stop()`?
2. When does `DisplayList.shutdown()` happen?
3. When are Text objects destroyed?
4. When does `unloadPreviousLevelAssets()` run?

This will tell us the EXACT fix needed.
