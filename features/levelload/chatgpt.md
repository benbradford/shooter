1. Manually destroying another scene’s children (major red flag)

This block is dangerous:

const gameScene = this.scene.get('game');
if (gameScene && gameScene.children) {
  gameScene.children.removeAll(true);
}

const hudScene = this.scene.get('HudScene');
if (hudScene && hudScene.children) {
  hudScene.children.removeAll(true);
}
Why this breaks Phaser

Phaser scenes manage their own lifecycle. When you do:

this.scene.stop('game');

Phaser automatically destroys display objects when the scene shuts down.

By manually doing:

removeAll(true)

you can cause:

objects destroyed twice

physics bodies referencing destroyed sprites

animations referencing destroyed textures

cameras still referencing display objects

This can easily cause recursive destroy calls → stack overflow → unknown callstack.

Fix

Remove this entire block.

Just do:

this.scene.stop('game');
this.scene.stop('HudScene');

Let Phaser handle destruction.

2. Unloading textures that are still referenced

This code is the second most likely crash source:

const textureKeys = this.textures.getTextureKeys()

and then:

AssetManager.getInstance().unloadSafe(this, candidates);

Even if you stopped the scene, Phaser objects might still exist during the same frame.

Common offenders:

animations referencing textures

tilemaps referencing tilesets

sprite frames cached in animation manager

render textures

If you unload a texture that any animation still references, Phaser will crash.

Safer pattern

Unload textures only after the scene is fully shutdown.

Example:

this.scene.stop('game');

this.time.delayedCall(0, () => {
    this.unloadPreviousLevelAssets(levelData);
});

or better:

this.scene.get('game').events.once('shutdown', () => {
    this.unloadPreviousLevelAssets(levelData);
});
3. Renderer destroying resources it created

This is suspicious:

const tilesetResult = await renderer.prepareRuntimeTilesets(levelData);
renderer.destroy();

If prepareRuntimeTilesets() creates:

textures

render textures

tilemaps

canvas textures

and destroy() removes them, but they are expected later by the game scene, you will get missing texture crashes.

Ensure:

renderer.destroy()

only destroys temporary objects, not generated textures.

4. Animations referencing unloaded textures

If you use global animations:

this.anims.create(...)

they persist across scenes.

If you unload a texture used by an animation:

Sprite → Animation → Frame → Texture

Phaser will explode.

Solution: before unloading textures:

this.anims.remove(key)

or keep shared assets always loaded.

You already mentioned:

attacker / hud should stay loaded

Make sure those textures are never included in candidates.

5. Calling children.removeAll(true) inside shutdown

Your shutdown does this:

shutdown(): void {
  this.children.removeAll(true);
}

But Phaser already destroys children on shutdown.

This can again double destroy.

Safer:

shutdown(): void {
  this.progressBar = undefined;
  this.progressBox = undefined;
}
6. Scene start + launch in same frame

You do:

this.scene.start('game', {...});
this.scene.launch('HudScene');

Usually fine, but if HUD references game textures immediately, and you unload them in the same tick, race conditions appear.

Recommended safe transition flow

A robust Phaser level transition looks like this:

LoadingScene
   ↓
Stop Game Scene
   ↓
Wait for shutdown
   ↓
Unload unused assets
   ↓
Load new assets
   ↓
Start Game Scene
   ↓
Launch HUD
The biggest bug in your code

If I had to bet, this line is the crash source:

gameScene.children.removeAll(true);

Destroying another scene's objects before Phaser stops the scene commonly produces the exact error you're seeing.

My recommended minimal fix
Remove this completely
gameScene.children.removeAll(true);
hudScene.children.removeAll(true);
Remove this from shutdown
this.children.removeAll(true);
Delay asset unloading

After the game scene stops. ------ What you’re trying to build ( load/unload level assets between scenes but keep core assets like HUD/attacker ) is exactly the kind of thing that Phaser easily breaks if you rely on the texture manager alone. The safest approach used in larger Phaser games is a reference-counted asset pool.

This avoids:

destroying textures still referenced by sprites

animations referencing unloaded frames

scene lifecycle race conditions

stack overflow from recursive destruction

Below is a battle-tested architecture for Phaser scene streaming.

1. Split assets into 3 tiers

Never treat all textures equally.

Tier 1 — Core (never unloaded)

Loaded once at boot.

Examples:

player

attacker

HUD

UI fonts

shared particles

global animations

BootScene
   ↓
Preload core assets
   ↓
Start LoadingScene

These must never be candidates for unloading.

Example keys:

const CORE_ASSETS = new Set([
  'player',
  'attacker',
  'hud',
  'ui-icons',
  'damage-font'
]);
Tier 2 — Level assets

Loaded/unloaded per level.

Examples:

dungeon_tiles
swamp_tiles
wilds_tiles
enemy_swamp
enemy_wilds

These are managed by the AssetManager.

Tier 3 — Runtime generated

Things like:

runtime tilesets

procedural textures

render textures

These should be tracked separately because Phaser does not manage their lifecycle well.

2. Reference-counted asset manager

Instead of blindly unloading textures, track who uses them.

Example implementation:

export class AssetManager {
  private static instance: AssetManager;

  private refCounts = new Map<string, number>();

  static getInstance() {
    if (!this.instance) {
      this.instance = new AssetManager();
    }
    return this.instance;
  }

  retain(key: string) {
    const count = this.refCounts.get(key) ?? 0;
    this.refCounts.set(key, count + 1);
  }

  release(key: string) {
    const count = this.refCounts.get(key);
    if (!count) return;

    if (count <= 1) {
      this.refCounts.delete(key);
    } else {
      this.refCounts.set(key, count - 1);
    }
  }

  canUnload(key: string) {
    return !this.refCounts.has(key);
  }
}
3. Scene asset registration

When a scene loads assets, register them.

Example inside GameScene.create():

const manager = AssetManager.getInstance();

manager.retain('swamp_tiles');
manager.retain('swamp_enemies');
4. Scene shutdown releases assets

When scene shuts down:

this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
  const manager = AssetManager.getInstance();

  manager.release('swamp_tiles');
  manager.release('swamp_enemies');
});

Now the manager knows when assets are no longer used.

5. Safe unloading

Instead of your current approach:

textures.getTextureKeys()

Use the manager:

unloadUnused(scene: Phaser.Scene) {
  const textures = scene.textures.getTextureKeys();

  for (const key of textures) {

    if (CORE_ASSETS.has(key)) continue;

    if (this.canUnload(key)) {
      scene.textures.remove(key);
    }
  }
}

Now you cannot accidentally remove textures still in use.

6. Correct scene transition order

The safest order:

GameScene
   ↓
Player touches exit
   ↓
Start LoadingScene
   ↓
Stop GameScene
   ↓
GameScene SHUTDOWN fires
   ↓
release assets
   ↓
AssetManager unloadUnused()
   ↓
LoadingScene loads next level
   ↓
Start GameScene again

Important: unload after shutdown event, not before.

Example:

this.scene.get('game').events.once('shutdown', () => {
   AssetManager.getInstance().unloadUnused(this);
});
7. Animation safety (critical)

Phaser animations are global.

If an animation references a texture you unload → crash.

Solution: define animations only for core assets.

Example safe:

player_walk
attacker_attack
hud_flash

Avoid level-specific animations like:

swamp_enemy_walk

If needed, remove them:

this.anims.remove('swamp_enemy_walk');

before unloading textures.

8. Runtime texture registry

Track generated textures separately.

Example:

class RuntimeTextureRegistry {

  private runtimeTextures = new Set<string>();

  register(key: string) {
    this.runtimeTextures.add(key);
  }

  destroy(scene: Phaser.Scene) {
    for (const key of this.runtimeTextures) {
      scene.textures.remove(key);
    }
    this.runtimeTextures.clear();
  }
}

Used by your prepareRuntimeTilesets.

9. Remove dangerous code in your current scene

Delete these:

gameScene.children.removeAll(true)
hudScene.children.removeAll(true)

and

shutdown() {
  children.removeAll(true)
}

Phaser already does this internally.

10. Resulting memory behavior

With this system:

Core assets        → persistent
HUD assets         → persistent
Level tilesets     → streamed
Enemy sprites      → streamed
Runtime textures   → destroyed per level

Memory becomes flat and predictable instead of growing or crashing.

✅ This architecture supports:

100+ levels

procedural tilesets

large atlases

streaming worlds

no texture crashes ------ it usually means something tried to use a destroyed texture/frame/object. Unfortunately Phaser often swallows the real stack. The best way to debug it is to instrument Phaser’s managers so they tell you exactly what is being destroyed or accessed.

Below are three extremely useful debug hooks you can drop into your project. They will usually reveal the crash source in minutes.

1. Hook the TextureManager (most important)

This shows every texture being removed and warns if anything still references it.

Create a small debug helper.

export function installTextureDebug(scene: Phaser.Scene) {
  const textures = scene.textures;
  const originalRemove = textures.remove.bind(textures);

  textures.remove = function (key: string) {
    console.warn('[TextureDebug] Removing texture:', key);

    const frames = textures.get(key)?.getFrameNames?.() ?? [];
    if (frames.length > 0) {
      console.warn('[TextureDebug] Frames:', frames);
    }

    return originalRemove(key);
  };
}

Install it once (BootScene or LoadingScene):

installTextureDebug(this);

Now when a crash happens you will see something like:

[TextureDebug] Removing texture: swamp_tiles

Right before the failure.

That immediately tells you which asset caused the crash.

2. Detect sprites still using a texture

Often the real bug is:

sprite.texture → destroyed texture

Add this check before unloading textures.

function detectTextureUsers(scene: Phaser.Scene, textureKey: string) {

  scene.children.list.forEach(obj => {

    const sprite = obj as Phaser.GameObjects.Sprite;

    if (sprite.texture?.key === textureKey) {
      console.error(
        '[TextureDebug] Object still using texture:',
        textureKey,
        sprite
      );
    }

  });

}

Call before removal:

detectTextureUsers(this, key);
this.textures.remove(key);

If anything logs here, you found the bug.

3. Hook AnimationManager (very common crash)

Animations persist globally and can reference destroyed frames.

Add this logger:

export function installAnimationDebug(scene: Phaser.Scene) {

  const anims = scene.anims;

  const originalCreate = anims.create.bind(anims);

  anims.create = function (config: Phaser.Types.Animations.Animation) {
    console.log('[AnimDebug] Creating animation:', config.key);
    return originalCreate(config);
  };

}

You can also detect animation frame usage:

function checkAnimationFrames(scene: Phaser.Scene, textureKey: string) {

  scene.anims.anims.each(anim => {

    anim.frames.forEach(frame => {

      if (frame.textureKey === textureKey) {
        console.error(
          '[AnimDebug] Animation still referencing texture:',
          textureKey,
          'animation:',
          anim.key
        );
      }

    });

  });

}

Run before unloading a texture.

4. Catch Phaser silent errors

Phaser sometimes hides errors inside events.

Add this once in BootScene:

window.addEventListener('error', (event) => {
  console.error('[GlobalError]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UnhandledPromise]', event.reason);
});

This restores real stack traces.

5. Detect double-destroy (common recursion crash)

Another common issue:

destroy()
 → triggers shutdown
 → shutdown destroys again
 → recursive destroy

You can detect it:

const originalDestroy = Phaser.GameObjects.Sprite.prototype.destroy;

Phaser.GameObjects.Sprite.prototype.destroy = function (...args) {

  if ((this as any).__destroyed) {
    console.error('[DestroyDebug] Double destroy:', this);
  }

  (this as any).__destroyed = true;

  return originalDestroy.apply(this, args);
};

If you see logs here, that explains the callstack overflow.

6. Log every scene lifecycle event

Sometimes crashes happen because scenes overlap incorrectly.

[dodging-bullets] 16% λ > this is what chatgpt says: 1. Manually destroying another scene’s children (major red flag)

This block is dangerous:

const gameScene = this.scene.get('game');
if (gameScene && gameScene.children) {
  gameScene.children.removeAll(true);
}

const hudScene = this.scene.get('HudScene');
if (hudScene && hudScene.children) {
  hudScene.children.removeAll(true);
}
Why this breaks Phaser

Phaser scenes manage their own lifecycle. When you do:

this.scene.stop('game');

Phaser automatically destroys display objects when the scene shuts down.

By manually doing:

removeAll(true)

you can cause:

objects destroyed twice

physics bodies referencing destroyed sprites

animations referencing destroyed textures

cameras still referencing display objects

This can easily cause recursive destroy calls → stack overflow → unknown callstack.

Fix

Remove this entire block.

Just do:

this.scene.stop('game');
this.scene.stop('HudScene');

Let Phaser handle destruction.

2. Unloading textures that are still referenced

This code is the second most likely crash source:

const textureKeys = this.textures.getTextureKeys()

and then:

AssetManager.getInstance().unloadSafe(this, candidates);

Even if you stopped the scene, Phaser objects might still exist during the same frame.

Common offenders:

animations referencing textures

tilemaps referencing tilesets

sprite frames cached in animation manager

render textures

If you unload a texture that any animation still references, Phaser will crash.

Safer pattern

Unload textures only after the scene is fully shutdown.

Example:

this.scene.stop('game');

this.time.delayedCall(0, () => {
    this.unloadPreviousLevelAssets(levelData);
});

or better:

this.scene.get('game').events.once('shutdown', () => {
    this.unloadPreviousLevelAssets(levelData);
});
3. Renderer destroying resources it created

This is suspicious:

const tilesetResult = await renderer.prepareRuntimeTilesets(levelData);
renderer.destroy();

If prepareRuntimeTilesets() creates:

textures

render textures

tilemaps

canvas textures

and destroy() removes them, but they are expected later by the game scene, you will get missing texture crashes.

Ensure:

renderer.destroy()

only destroys temporary objects, not generated textures.

4. Animations referencing unloaded textures

If you use global animations:

this.anims.create(...)

they persist across scenes.

If you unload a texture used by an animation:

Sprite → Animation → Frame → Texture

Phaser will explode.

Solution: before unloading textures:

this.anims.remove(key)

or keep shared assets always loaded.

You already mentioned:

attacker / hud should stay loaded

Make sure those textures are never included in candidates.

5. Calling children.removeAll(true) inside shutdown

Your shutdown does this:

shutdown(): void {
  this.children.removeAll(true);
}

But Phaser already destroys children on shutdown.

This can again double destroy.

Safer:

shutdown(): void {
  this.progressBar = undefined;
  this.progressBox = undefined;
}
6. Scene start + launch in same frame

You do:

this.scene.start('game', {...});
this.scene.launch('HudScene');

Usually fine, but if HUD references game textures immediately, and you unload them in the same tick, race conditions appear.

Recommended safe transition flow

A robust Phaser level transition looks like this:

LoadingScene
   ↓
Stop Game Scene
   ↓
Wait for shutdown
   ↓
Unload unused assets
   ↓
Load new assets
   ↓
Start Game Scene
   ↓
Launch HUD
The biggest bug in your code

If I had to bet, this line is the crash source:

gameScene.children.removeAll(true);

Destroying another scene's objects before Phaser stops the scene commonly produces the exact error you're seeing.

My recommended minimal fix
Remove this completely
gameScene.children.removeAll(true);
hudScene.children.removeAll(true);
Remove this from shutdown
this.children.removeAll(true);
Delay asset unloading

After the game scene stops. ------ What you’re trying to build ( load/unload level assets between scenes but keep core assets like HUD/attacker ) is exactly the kind of thing that Phaser easily breaks if you rely on the texture manager alone. The safest approach used in larger Phaser games is a reference-counted asset pool.

This avoids:

destroying textures still referenced by sprites

animations referencing unloaded frames

scene lifecycle race conditions

stack overflow from recursive destruction

Below is a battle-tested architecture for Phaser scene streaming.

1. Split assets into 3 tiers

Never treat all textures equally.

Tier 1 — Core (never unloaded)

Loaded once at boot.

Examples:

player

attacker

HUD

UI fonts

shared particles

global animations

BootScene
   ↓
Preload core assets
   ↓
Start LoadingScene

These must never be candidates for unloading.

Example keys:

const CORE_ASSETS = new Set([
  'player',
  'attacker',
  'hud',
  'ui-icons',
  'damage-font'
]);
Tier 2 — Level assets

Loaded/unloaded per level.

Examples:

dungeon_tiles
swamp_tiles
wilds_tiles
enemy_swamp
enemy_wilds

These are managed by the AssetManager.

Tier 3 — Runtime generated

Things like:

runtime tilesets

procedural textures

render textures

These should be tracked separately because Phaser does not manage their lifecycle well.

2. Reference-counted asset manager

Instead of blindly unloading textures, track who uses them.

Example implementation:

export class AssetManager {
  private static instance: AssetManager;

  private refCounts = new Map<string, number>();

  static getInstance() {
    if (!this.instance) {
      this.instance = new AssetManager();
    }
    return this.instance;
  }

  retain(key: string) {
    const count = this.refCounts.get(key) ?? 0;
    this.refCounts.set(key, count + 1);
  }

  release(key: string) {
    const count = this.refCounts.get(key);
    if (!count) return;

    if (count <= 1) {
      this.refCounts.delete(key);
    } else {
      this.refCounts.set(key, count - 1);
    }
  }

  canUnload(key: string) {
    return !this.refCounts.has(key);
  }
}
3. Scene asset registration

When a scene loads assets, register them.

Example inside GameScene.create():

const manager = AssetManager.getInstance();

manager.retain('swamp_tiles');
manager.retain('swamp_enemies');
4. Scene shutdown releases assets

When scene shuts down:

this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
  const manager = AssetManager.getInstance();

  manager.release('swamp_tiles');
  manager.release('swamp_enemies');
});

Now the manager knows when assets are no longer used.

5. Safe unloading

Instead of your current approach:

textures.getTextureKeys()

Use the manager:

unloadUnused(scene: Phaser.Scene) {
  const textures = scene.textures.getTextureKeys();

  for (const key of textures) {

    if (CORE_ASSETS.has(key)) continue;

    if (this.canUnload(key)) {
      scene.textures.remove(key);
    }
  }
}

Now you cannot accidentally remove textures still in use.

6. Correct scene transition order

The safest order:

GameScene
   ↓
Player touches exit
   ↓
Start LoadingScene
   ↓
Stop GameScene
   ↓
GameScene SHUTDOWN fires
   ↓
release assets
   ↓
AssetManager unloadUnused()
   ↓
LoadingScene loads next level
   ↓
Start GameScene again

Important: unload after shutdown event, not before.

Example:

this.scene.get('game').events.once('shutdown', () => {
   AssetManager.getInstance().unloadUnused(this);
});
7. Animation safety (critical)

Phaser animations are global.

If an animation references a texture you unload → crash.

Solution: define animations only for core assets.

Example safe:

player_walk
attacker_attack
hud_flash

Avoid level-specific animations like:

swamp_enemy_walk

If needed, remove them:

this.anims.remove('swamp_enemy_walk');

before unloading textures.

8. Runtime texture registry

Track generated textures separately.

Example:

class RuntimeTextureRegistry {

  private runtimeTextures = new Set<string>();

  register(key: string) {
    this.runtimeTextures.add(key);
  }

  destroy(scene: Phaser.Scene) {
    for (const key of this.runtimeTextures) {
      scene.textures.remove(key);
    }
    this.runtimeTextures.clear();
  }
}

Used by your prepareRuntimeTilesets.

9. Remove dangerous code in your current scene

Delete these:

gameScene.children.removeAll(true)
hudScene.children.removeAll(true)

and

shutdown() {
  children.removeAll(true)
}

Phaser already does this internally.

10. Resulting memory behavior

With this system:

Core assets        → persistent
HUD assets         → persistent
Level tilesets     → streamed
Enemy sprites      → streamed
Runtime textures   → destroyed per level

Memory becomes flat and predictable instead of growing or crashing.

✅ This architecture supports:

100+ levels

procedural tilesets

large atlases

streaming worlds

no texture crashes ------ it usually means something tried to use a destroyed texture/frame/object. Unfortunately Phaser often swallows the real stack. The best way to debug it is to instrument Phaser’s managers so they tell you exactly what is being destroyed or accessed.

Below are three extremely useful debug hooks you can drop into your project. They will usually reveal the crash source in minutes.

1. Hook the TextureManager (most important)

This shows every texture being removed and warns if anything still references it.

Create a small debug helper.

export function installTextureDebug(scene: Phaser.Scene) {
  const textures = scene.textures;
  const originalRemove = textures.remove.bind(textures);

  textures.remove = function (key: string) {
    console.warn('[TextureDebug] Removing texture:', key);

    const frames = textures.get(key)?.getFrameNames?.() ?? [];
    if (frames.length > 0) {
      console.warn('[TextureDebug] Frames:', frames);
    }

    return originalRemove(key);
  };
}

Install it once (BootScene or LoadingScene):

installTextureDebug(this);

Now when a crash happens you will see something like:

[TextureDebug] Removing texture: swamp_tiles

Right before the failure.

That immediately tells you which asset caused the crash.

2. Detect sprites still using a texture

Often the real bug is:

sprite.texture → destroyed texture

Add this check before unloading textures.

function detectTextureUsers(scene: Phaser.Scene, textureKey: string) {

  scene.children.list.forEach(obj => {

    const sprite = obj as Phaser.GameObjects.Sprite;

    if (sprite.texture?.key === textureKey) {
      console.error(
        '[TextureDebug] Object still using texture:',
        textureKey,
        sprite
      );
    }

  });

}

Call before removal:

detectTextureUsers(this, key);
this.textures.remove(key);

If anything logs here, you found the bug.

3. Hook AnimationManager (very common crash)

Animations persist globally and can reference destroyed frames.

Add this logger:

export function installAnimationDebug(scene: Phaser.Scene) {

  const anims = scene.anims;

  const originalCreate = anims.create.bind(anims);

  anims.create = function (config: Phaser.Types.Animations.Animation) {
    console.log('[AnimDebug] Creating animation:', config.key);
    return originalCreate(config);
  };

}

You can also detect animation frame usage:

function checkAnimationFrames(scene: Phaser.Scene, textureKey: string) {

  scene.anims.anims.each(anim => {

    anim.frames.forEach(frame => {

      if (frame.textureKey === textureKey) {
        console.error(
          '[AnimDebug] Animation still referencing texture:',
          textureKey,
          'animation:',
          anim.key
        );
      }

    });

  });

}

Run before unloading a texture.

4. Catch Phaser silent errors

Phaser sometimes hides errors inside events.

Add this once in BootScene:

window.addEventListener('error', (event) => {
  console.error('[GlobalError]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UnhandledPromise]', event.reason);
});

This restores real stack traces.

5. Detect double-destroy (common recursion crash)

Another common issue:

destroy()
 → triggers shutdown
 → shutdown destroys again
 → recursive destroy

You can detect it:

const originalDestroy = Phaser.GameObjects.Sprite.prototype.destroy;

Phaser.GameObjects.Sprite.prototype.destroy = function (...args) {

  if ((this as any).__destroyed) {
    console.error('[DestroyDebug] Double destroy:', this);
  }

  (this as any).__destroyed = true;

  return originalDestroy.apply(this, args);
};

If you see logs here, that explains the callstack overflow.

6. Log every scene lifecycle event

Sometimes crashes happen because scenes overlap incorrectly.

Add:

function debugScene(scene: Phaser.Scene) {

  scene.events.on('shutdown', () => {
    console.log('[SceneDebug] shutdown', scene.scene.key);
  });

  scene.events.on('destroy', () => {
    console.log('[SceneDebug] destroy', scene.scene.key);
  });

  scene.events.on('sleep', () => {
    console.log('[SceneDebug] sleep', scene.scene.key);
  });

}

Install in every scene constructor.

7. The single most useful debug check

Before unloading textures, run this:

console.log('Active objects:', this.children.list.length);
console.log('Textures:', this.textures.getTextureKeys());
console.log('Animations:', this.anims.anims.getKeys());

If a texture appears in animations but not scenes, unloading it will crash.

What usually ends up being the real bug

In Phaser level streaming systems the top 4 crash causes are:

1️⃣ Animations referencing unloaded textures
2️⃣ Tilemaps referencing removed tilesets
3️⃣ Sprites still alive when texture removed
4️⃣ Double destroy from manual scene cleanup

Your earlier code already showed two of these risks. ------ Key line:

Uncaught TypeError: Cannot read properties of null (reading 'removeKey')
at CanvasTexture.destroy

And the chain:

CanvasTexture.destroy
Text.preDestroy
Text.destroy
DisplayList.shutdown
SceneManager.stop

So the sequence is:

Scene is shutting down

Phaser destroys Text objects

Text.preDestroy() tries to destroy its CanvasTexture

That CanvasTexture’s TextureManager reference is already null

Phaser tries to call removeKey on null

💥 crash

The real cause

You are removing textures from the TextureManager before Phaser finishes destroying objects that depend on them.

Specifically:

Text object
  → owns CanvasTexture
  → stored in TextureManager

When you do something like:

scene.textures.remove(key)

before the scene shutdown completes, you create this situation:

TextureManager entry removed
↓
Scene shutdown destroys Text
↓
Text tries to destroy its CanvasTexture
↓
CanvasTexture tries to deregister from TextureManager
↓
TextureManager reference already null
↓
CRASH

That matches your stack perfectly.

Why Text objects are special

Phaser Text is not just a display object.

Internally it creates a CanvasTexture:

Text
  → Canvas
  → CanvasTexture
  → TextureManager

Destroying Text later requires the TextureManager to still exist.

The problematic timing in your code

Your transition does this roughly:

LoadingScene.init
   stop game
   stop hud
create
   load assets
   unload previous level textures  ← BAD TIME
   start game scene

But game scene shutdown hasn't finished yet.

Phaser shutdown order:

SceneManager.stop()
   ↓
Systems.shutdown()
   ↓
DisplayList.shutdown()
   ↓
destroy objects (Text etc)

Your unload happens before DisplayList.shutdown finishes.

The correct fix (very important)

Unload textures after the previous scene shutdown event fires.

Example fix:

private async loadLevel(): Promise<void> {

  const gameScene = this.scene.get('game');

  if (gameScene) {
    await new Promise<void>((resolve) => {
      gameScene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        resolve();
      });
    });
  }

  // NOW it is safe
  this.unloadPreviousLevelAssets(levelData);

}

This guarantees:

GameScene objects destroyed
↓
Text destroyed
↓
CanvasTexture destroyed
↓
TextureManager still valid
↓
NOW you remove textures
Even safer pattern (recommended)

Use next frame unload.

this.scene.stop('game');

this.time.delayedCall(0, () => {
  this.unloadPreviousLevelAssets(levelData);
});

The delay ensures Phaser completes the shutdown cycle.

Another improvement (important)

Never unload dynamic textures created by Phaser objects.

Filter them:

const textureKeys = this.textures.getTextureKeys().filter(key =>
  key !== '__DEFAULT' &&
  key !== '__MISSING' &&
  !key.startsWith('text-') &&
  !key.startsWith('canvas')
);

Text objects generate dynamic canvas textures.

Also remove this from your code

Earlier you had:

gameScene.children.removeAll(true)

This can trigger early Text destruction, causing the same crash.

Let Phaser handle destruction.

The minimal fix for your project

Do these 3 changes:

1️⃣ Remove manual child destruction

Delete:

gameScene.children.removeAll(true)
hudScene.children.removeAll(true)
2️⃣ Wait for shutdown before unloading
this.scene.get('game').events.once('shutdown', () => {
   this.unloadPreviousLevelAssets(levelData);
});
3️⃣ Ignore dynamic textures
if (key.startsWith('Text')) return;

(or similar)

Why this bug is common in Phaser

Phaser’s lifecycle is:

Scene.stop()
   ↓ async
shutdown events
   ↓
object destroy

If you unload assets synchronously after stop(), you are racing the destroy cycle.

-----

recommendatino:

What you’re building (level streaming with partial asset unloads) is exactly where Phaser’s default scene lifecycle becomes fragile. The clean solution used in larger Phaser projects is a Transition Controller + Level Scene model that guarantees deterministic order of:

scene shutdown

object destruction

asset unload

asset load

scene start

This completely eliminates the CanvasTexture/Text destruction race you just hit.

Below is a robust architecture specifically suited for your setup (tile-based 2D game with themed levels and streamed tilesets).

The Core Idea

Never let gameplay scenes manage their own transition.

Instead:

GameScene
   ↓ request
TransitionController
   ↓
LoadingScene
   ↓
AssetManager
   ↓
GameScene (new level)

The controller owns the lifecycle, not the scenes.

Scene Architecture
BootScene        (load core assets)
   ↓
TransitionScene  (handles transitions)
   ↓
LoadingScene     (loads level assets)
   ↓
GameScene        (gameplay)
   ↓
HudScene         (persistent UI)

Important rule:

Only TransitionScene stops scenes and unloads assets.

Step 1 — GameScene requests transition

GameScene never stops itself.

Instead:

this.scene.get('TransitionScene').startLevelTransition({
  targetLevel: 'swamp01',
  col: 10,
  row: 5
});

GameScene stays alive until TransitionScene handles everything.

Step 2 — TransitionScene orchestrates shutdown

Example controller:

type LevelTransition = {
  targetLevel: string
  col: number
  row: number
}

export class TransitionScene extends Phaser.Scene {

  async startLevelTransition(data: LevelTransition) {

    const gameScene = this.scene.get('game');

    await new Promise<void>((resolve) => {
      gameScene.events.once(Phaser.Scenes.Events.SHUTDOWN, resolve);
      this.scene.stop('game');
    });

    this.scene.start('LoadingScene', data);
  }

}

This guarantees:

stop()
↓
shutdown
↓
objects destroyed
↓
promise resolves

No races.

Step 3 — LoadingScene unloads safely

Now that the old scene is fully dead:

async create(data) {

  AssetManager.getInstance().unloadUnused(this);

  const levelData = await LevelLoader.load(data.targetLevel);

  await AssetLoadCoordinator.loadLevelAssets(this, levelData);

  this.scene.start('game', {
    level: data.targetLevel,
    playerCol: data.col,
    playerRow: data.row
  });

}

No objects from the previous scene exist anymore.

This means:

Text destroyed
Sprites destroyed
Tilemaps destroyed

So texture removal is safe.

Step 4 — GameScene registers assets

GameScene tells the AssetManager what it uses.

Example:

create(data) {

  const assets = AssetManifest.fromLevelData(data.levelData);

  const manager = AssetManager.getInstance();

  for (const key of assets) {
    manager.retain(key);
  }

}
Step 5 — Release assets on shutdown

GameScene cleanup:

this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {

  const manager = AssetManager.getInstance();

  for (const key of this.levelAssets) {
    manager.release(key);
  }

});
Step 6 — AssetManager unloads only safe textures

Example:

unloadUnused(scene: Phaser.Scene) {

  const textures = scene.textures.getTextureKeys();

  for (const key of textures) {

    if (CORE_ASSETS.has(key)) continue;

    if (!this.refCounts.has(key)) {

      console.log('Unloading texture', key);

      scene.textures.remove(key);

    }
  }

}

Now you cannot unload something still referenced.

Step 7 — HUD stays persistent

HudScene should never be stopped.

Launch it once:

BootScene → this.scene.launch('HudScene')

Then it stays forever.

That avoids repeated UI creation/destruction.

Step 8 — Runtime tilesets cleanup

Your renderer system likely creates runtime textures.

Register them:

RuntimeTextureRegistry.register(textureKey);

Destroy them during unload:

RuntimeTextureRegistry.destroy(scene);

Never mix these with level textures.

Resulting lifecycle

Your transitions become deterministic:

GameScene
   ↓ request
TransitionScene
   ↓
GameScene shutdown
   ↓
objects destroyed
   ↓
LoadingScene
   ↓
unload unused assets
   ↓
load new assets
   ↓
start GameScene

No overlapping scenes, no texture races.

Why this architecture is powerful

It fixes all common Phaser streaming crashes:

Problem Solution
Text CanvasTexture crash  unload after shutdown
Animations referencing unloaded textures  AssetManager refcounts
Objects destroyed twice controller manages lifecycle
Race conditions async shutdown wait
One more tip for your game specifically

Your game uses:

64x64 tiles
runtime tilesets
multiple biome themes

That means your largest memory usage is tilesets.

A powerful optimization is:

global tileset atlas
per-level tile index mapping

This reduces level load time dramatically and avoids many unloads.

✅ If you want, I can also show you a Phaser memory profiler snippet that prints:

texture memory
canvas textures
animation counts
display objects

every time you change levels.

It makes asset leaks immediately visible, which is extremely useful for games with lots of streamed levels like yours.