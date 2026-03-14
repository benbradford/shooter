/**
 * Debug utilities to trace Phaser lifecycle issues
 * Based on ChatGPT's recommendations for debugging texture/scene crashes
 */

export function installTextureDebug(scene: Phaser.Scene): void {
  const textures = scene.textures;
  const originalRemove = textures.remove.bind(textures);

  textures.remove = function (key: string) {
    console.warn('[TextureDebug] Removing texture:', key);

    const texture = textures.get(key);
    const frames = texture?.getFrameNames?.() ?? [];
    if (frames.length > 0) {
      console.warn('[TextureDebug] Frames:', frames);
    }

    // Check if any objects still use this texture
    detectTextureUsers(scene, key);

    return originalRemove(key);
  };
}

function detectTextureUsers(scene: Phaser.Scene, textureKey: string): void {
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

export function installAnimationDebug(scene: Phaser.Scene): void {
  const anims = scene.anims;
  const originalCreate = anims.create.bind(anims);

  anims.create = function (config: Phaser.Types.Animations.Animation) {
    console.log('[AnimDebug] Creating animation:', config.key);
    return originalCreate(config);
  };
}

export function checkAnimationFrames(scene: Phaser.Scene, textureKey: string): void {
  const anims = (scene.anims as any).anims as Map<string, Phaser.Animations.Animation>;
  anims.forEach((anim: Phaser.Animations.Animation) => {
    anim.frames.forEach((frame: Phaser.Animations.AnimationFrame) => {
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

export function installDestroyDebug(): void {
  const originalDestroy = Phaser.GameObjects.Sprite.prototype.destroy;

  Phaser.GameObjects.Sprite.prototype.destroy = function (...args) {
    if ((this as any).__destroyed) {
      console.error('[DestroyDebug] Double destroy:', this);
    }

    (this as any).__destroyed = true;

    return originalDestroy.apply(this, args);
  };
}

export function debugScene(scene: Phaser.Scene): void {
  scene.events.on('shutdown', () => {
    console.log('[SceneDebug] shutdown', scene.scene.key);
  });

  scene.events.on('destroy', () => {
    console.log('[SceneDebug] destroy', scene.scene.key);
  });

  scene.events.on('sleep', () => {
    console.log('[SceneDebug] sleep', scene.scene.key);
  });

  scene.events.on('wake', () => {
    console.log('[SceneDebug] wake', scene.scene.key);
  });

  scene.events.on('pause', () => {
    console.log('[SceneDebug] pause', scene.scene.key);
  });

  scene.events.on('resume', () => {
    console.log('[SceneDebug] resume', scene.scene.key);
  });
}

export function logSceneState(scene: Phaser.Scene, label: string): void {
  const anims = (scene.anims as any).anims as Map<string, Phaser.Animations.Animation>;
  console.log(`[SceneState] ${label}:`, {
    key: scene.scene.key,
    active: scene.scene.isActive(),
    visible: scene.scene.isVisible(),
    sleeping: scene.scene.isSleeping(),
    objects: scene.children.list.length,
    textures: scene.textures.getTextureKeys().length,
    animations: anims.size
  });
}
