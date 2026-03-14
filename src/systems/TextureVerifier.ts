import type Phaser from 'phaser';

const POLL_INTERVAL_MS = 50;

type VerifyBatchResult = {
  readonly valid: string[];
  readonly invalid: string[];
}

export class TextureVerifier {
  static verifyTexture(scene: Phaser.Scene, key: string, silent = false): boolean {
    if (!scene.textures.exists(key)) {
      if (!silent) console.error(`[TextureVerifier] Texture '${key}' does not exist`);
      return false;
    }

    const texture = scene.textures.get(key);
    if (!texture) {
      if (!silent) console.error(`[TextureVerifier] Texture '${key}' get() returned null`);
      return false;
    }

    const frameKeys = texture.getFrameNames();
    const firstFrame = texture.get(frameKeys[0] || '__BASE');
    if (!firstFrame?.source) {
      if (!silent) console.error(`[TextureVerifier] Texture '${key}' first frame has no source`);
      return false;
    }

    if (firstFrame.source.width === 0 || firstFrame.source.height === 0) {
      if (!silent) console.error(`[TextureVerifier] Texture '${key}' source has zero dimensions`);
      return false;
    }

    return true;
  }

  static verifyBatch(scene: Phaser.Scene, keys: string[]): VerifyBatchResult {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const key of keys) {
      if (this.verifyTexture(scene, key)) {
        valid.push(key);
      } else {
        invalid.push(key);
      }
    }

    return { valid, invalid };
  }

  static async waitForTextureReady(scene: Phaser.Scene, key: string, timeoutMs: number): Promise<boolean> {
    const startTimeMs = Date.now();

    while (Date.now() - startTimeMs < timeoutMs) {
      if (this.verifyTexture(scene, key)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    return false;
  }
}
