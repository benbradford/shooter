# SoundManager — Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Game Code                         │
│  SoundManager.getInstance().play('punch1')          │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│                  SoundManager                        │
│  - Singleton                                        │
│  - Platform detection on initialize()               │
│  - Routes play() to active backend                  │
└──────────┬───────────────────────┬──────────────────┘
           ↓                       ↓
┌──────────────────┐    ┌──────────────────────────┐
│  PhaserBackend   │    │  NativeBackend           │
│  (web/desktop)   │    │  (Android/Capacitor)     │
│                  │    │                          │
│  scene.sound     │    │  NativeSoundPlugin       │
│  .play(key,opts) │    │  .play({key, volume})    │
└──────────────────┘    └──────────────────────────┘
                                   ↓
                        ┌──────────────────────────┐
                        │  Android SoundPool       │
                        │  maxStreams: 10           │
                        │  ~20-50ms latency        │
                        └──────────────────────────┘
```

---

## SoundManager Implementation

### Singleton + Backend Interface

```typescript
interface SoundBackend {
  initialize(scene: Phaser.Scene): Promise<void>;
  play(key: string, options?: { volume?: number }): void;
}

class SoundManager {
  private static instance: SoundManager;
  private backend: SoundBackend | null = null;
  private fallbackScene: Phaser.Scene | null = null;

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  async initialize(scene: Phaser.Scene): Promise<void> {
    this.fallbackScene = scene;

    if (this.isNativePlatform()) {
      try {
        const native = new NativeSoundBackend();
        await native.initialize(scene);
        this.backend = native;
        console.log('[SoundManager] Using native SoundPool backend');
        return;
      } catch (e) {
        console.warn('[SoundManager] Native backend failed, falling back to Phaser:', e);
      }
    }

    this.backend = new PhaserSoundBackend(scene);
    console.log('[SoundManager] Using Phaser audio backend');
  }

  play(key: string, options?: { volume?: number }): void {
    if (this.backend) {
      try {
        this.backend.play(key, options);
      } catch (e) {
        console.warn(`[SoundManager] play('${key}') failed:`, e);
        // Attempt Phaser fallback if native failed
        this.fallbackScene?.sound.play(key, options);
      }
    } else {
      // Not initialized yet — use Phaser directly
      this.fallbackScene?.sound.play(key, options);
    }
  }

  private isNativePlatform(): boolean {
    try {
      // @capacitor/core is already a dependency
      const { Capacitor } = require('@capacitor/core');
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }
}
```

**Key design decisions:**

1. **Backend interface** — `SoundBackend` is a simple 2-method interface. No abstract class, no inheritance hierarchy. Just `initialize()` and `play()`.

2. **Fallback chain** — If native backend fails during `initialize()`, switch to Phaser. If native `play()` throws at runtime, attempt Phaser for that single call. If nothing is initialized, use `fallbackScene` directly.

3. **Fire-and-forget `play()`** — Never async, never throws. Sound playback should never block game logic.

4. **`isNativePlatform()` uses dynamic require** — `@capacitor/core` is already in `package.json`. On web, `Capacitor.isNativePlatform()` returns `false`. On Android, returns `true`. The dynamic require avoids import issues in web-only contexts.

---

## PhaserSoundBackend

Trivial wrapper — delegates directly to Phaser's sound manager.

```typescript
class PhaserSoundBackend implements SoundBackend {
  constructor(private readonly scene: Phaser.Scene) {}

  async initialize(_scene: Phaser.Scene): Promise<void> {
    // Nothing to do — Phaser already loaded audio assets
  }

  play(key: string, options?: { volume?: number }): void {
    this.scene.sound.play(key, options);
  }
}
```

---

## NativeSoundBackend

Calls the Capacitor plugin to play sounds via Android SoundPool.

```typescript
class NativeSoundBackend implements SoundBackend {
  private plugin: NativeSoundPluginInterface | null = null;

  async initialize(_scene: Phaser.Scene): Promise<void> {
    const { registerPlugin } = require('@capacitor/core');
    this.plugin = registerPlugin<NativeSoundPluginInterface>('NativeSound');

    // Build sound list from AssetRegistry
    const sounds = this.getSoundAssets();
    await this.plugin.preload({ sounds });
  }

  play(key: string, options?: { volume?: number }): void {
    // Fire-and-forget — don't await
    this.plugin?.play({ key, volume: options?.volume ?? 1.0 });
  }

  private getSoundAssets(): Array<{ key: string; path: string }> {
    // Extract all audio assets from ASSET_REGISTRY
    // Returns: [{ key: 'punch1', path: 'public/assets/sounds/punch1.mp3' }, ...]
    const assets: Array<{ key: string; path: string }> = [];
    for (const [, asset] of Object.entries(ASSET_REGISTRY)) {
      if (asset.type === 'audio') {
        // Capacitor serves from public/ — prefix path accordingly
        assets.push({ key: asset.key, path: `public/${asset.path}` });
      }
    }
    return assets;
  }
}

// TypeScript interface for the Capacitor plugin
interface NativeSoundPluginInterface {
  preload(options: { sounds: Array<{ key: string; path: string }> }): Promise<void>;
  play(options: { key: string; volume: number }): Promise<void>;
}
```

**Key decisions:**

1. **Sound list derived from `ASSET_REGISTRY`** — No hardcoded list. Filters entries where `type === 'audio'`. Adding a new sound to AssetRegistry automatically includes it in SoundPool preloading.

2. **`play()` is fire-and-forget** — The Capacitor bridge call returns a Promise, but we don't await it. SoundPool.play() is synchronous on the native side; the Promise is just the bridge overhead.

3. **Path mapping** — Capacitor's Android WebView serves files from `android/app/src/main/assets/public/`. The `build_for_android.sh` script copies `dist/*` there. So `public/assets/sounds/punch1.mp3` maps to the file at `assets/public/assets/sounds/punch1.mp3` in the Android asset manager.

---

## NativeSoundPlugin (Android/Java)

### Capacitor Plugin Structure

```java
package com.dodgingbullets.game;

import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.SoundPool;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "NativeSound")
public class NativeSoundPlugin extends Plugin {
    private SoundPool soundPool;
    private final Map<String, Integer> soundIds = new HashMap<>();

    @Override
    public void load() {
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        soundPool = new SoundPool.Builder()
            .setMaxStreams(10)
            .setAudioAttributes(attrs)
            .build();
    }

    @PluginMethod
    public void preload(PluginCall call) {
        JSArray sounds = call.getArray("sounds");
        if (sounds == null) {
            call.reject("No sounds array provided");
            return;
        }
        try {
            for (int i = 0; i < sounds.length(); i++) {
                JSObject sound = JSObject.fromJSONObject(sounds.getJSONObject(i));
                String key = sound.getString("key");
                String path = sound.getString("path");
                AssetFileDescriptor afd = getContext()
                    .getAssets()
                    .openFd(path);
                int id = soundPool.load(afd, 1);
                soundIds.put(key, id);
                afd.close();
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to preload sounds: " + e.getMessage());
        }
    }

    @PluginMethod
    public void play(PluginCall call) {
        String key = call.getString("key");
        float volume = call.getFloat("volume", 1.0f);
        Integer id = soundIds.get(key);
        if (id == null) {
            call.reject("Sound not loaded: " + key);
            return;
        }
        soundPool.play(id, volume, volume, 1, 0, 1.0f);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (soundPool != null) {
            soundPool.release();
            soundPool = null;
        }
    }
}
```

**Key design decisions:**

1. **`SoundPool` with `USAGE_GAME`** — Optimized for short, low-latency sound effects. `CONTENT_TYPE_SONIFICATION` tells Android these are UI/game feedback sounds.

2. **`maxStreams: 10`** — Allows 10 simultaneous sounds. The game rarely plays more than 3-4 at once (punch + coin + splash). 10 gives headroom.

3. **`load()` creates SoundPool** — Capacitor calls `load()` when the plugin is registered. SoundPool is ready before any JS calls arrive.

4. **`preload()` loads all sounds at once** — SoundPool.load() is async internally but fast for small MP3s (~5-50KB each). 21 sounds load in <100ms.

5. **`play()` is synchronous on the native side** — `soundPool.play()` returns immediately. The sound starts playing within 20-50ms (SoundPool's native latency).

6. **`handleOnDestroy()` releases SoundPool** — Prevents resource leak when the app is destroyed.

### Plugin Registration

In `MainActivity.java`, register the plugin:

```java
public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSoundPlugin.class);  // ← Add this line
        super.onCreate(savedInstanceState);
        hideSystemUI();
    }
}
```

`registerPlugin()` must be called BEFORE `super.onCreate()` — this is the standard Capacitor pattern.

---

## Initialization Flow

```
1. BootScene.preload()
   - Loads btr_music (unchanged)

2. BootScene.create()
   - Plays btr_music via scene.sound.play() (unchanged — music stays on Phaser)
   - Calls SoundManager.getInstance().initialize(this)
     ↓
   - isNativePlatform()?
     ├─ YES (Android): NativeSoundBackend.initialize()
     │    → registerPlugin('NativeSound')
     │    → plugin.preload({ sounds: [...21 audio assets...] })
     │    → SoundPool loads all MP3s from assets/
     │    → Backend ready
     └─ NO (Web): PhaserSoundBackend created
          → Backend ready (Phaser already loaded audio)

3. Game runs
   - SoundManager.getInstance().play('punch1') → routes to active backend
```

**Why initialize in BootScene?** It's the first scene. By the time the player reaches gameplay, all sounds are preloaded. The `initialize()` call is async but fast (<100ms for 21 small MP3s). We don't need to await it blocking the boot — sounds will be ready before the player can trigger any.

However, we DO await it to ensure the backend is set before any gameplay starts. BootScene already has a 1-second minimum display time, so the preload fits within that window.

---

## Call Site Migration Pattern

Every migration follows the same pattern:

```typescript
// Before (14 files, 20 call sites)
this.scene.sound.play('punch1');
scene.sound.play('bones_spawn');
sprite.sprite.scene.sound.play('coin1_sfx');

// After
SoundManager.getInstance().play('punch1');
SoundManager.getInstance().play('bones_spawn');
SoundManager.getInstance().play('coin1_sfx');
```

The `SoundManager.getInstance()` call is static — no scene reference needed at the call site. This is simpler than the current pattern which requires access to a Phaser scene.

**Music stays on Phaser:**
```typescript
// BootScene.ts — NOT migrated
this.sound.play('btr_music', { loop: true, volume: 0.5 });
```

Music doesn't need low latency and `SoundPool` is designed for short clips, not streaming audio.

---

## Error Handling

| Failure | Behavior |
|---------|----------|
| Native plugin not registered | `initialize()` catches, falls back to Phaser backend |
| `preload()` fails (file not found) | `initialize()` catches, falls back to Phaser backend |
| `play()` with unknown key (native) | Plugin rejects, SoundManager catches, attempts Phaser fallback |
| `play()` with unknown key (Phaser) | Phaser logs warning internally |
| `play()` before `initialize()` | Uses `fallbackScene.sound.play()` directly |
| SoundPool exhausted (>10 streams) | SoundPool silently drops oldest sound — no error |

All errors logged with `[SoundManager]` prefix. No errors thrown to callers.

---

## Performance

- **SoundPool preload**: ~50-100ms for 21 small MP3s (loaded from local assets, no network)
- **SoundPool play latency**: ~20-50ms (vs ~300ms for Web Audio)
- **Memory**: SoundPool decompresses audio into memory. 21 short SFX clips ≈ 2-5MB RAM — negligible
- **Concurrent streams**: 10 max. Game typically uses 2-3 simultaneously. No contention expected.
- **Web overhead**: Zero — PhaserSoundBackend is a direct passthrough

---

## File Organization

```
src/systems/SoundManager.ts          ← Singleton + backends (all in one file)
android/app/src/main/java/
  com/dodgingbullets/game/
    NativeSoundPlugin.java           ← Capacitor plugin
    MainActivity.java                ← Register plugin (modify)
```

Everything TypeScript-side lives in a single file. The backend interface, both implementations, and the singleton are all in `SoundManager.ts`. There's no need for separate files — the total code is ~80 lines.
