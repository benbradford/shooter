export class TextureReferenceTracker {
  private static instance: TextureReferenceTracker;
  private readonly references: Map<string, number> = new Map();

  static getInstance(): TextureReferenceTracker {
    if (!TextureReferenceTracker.instance) {
      TextureReferenceTracker.instance = new TextureReferenceTracker();
    }
    return TextureReferenceTracker.instance;
  }

  addReference(key: string): void {
    this.references.set(key, (this.references.get(key) ?? 0) + 1);
  }

  removeReference(key: string): void {
    const count = this.references.get(key) ?? 0;
    if (count <= 0) {
      console.warn(`[TextureReferenceTracker] removeReference called for '${key}' with count 0`);
      return;
    }
    this.references.set(key, count - 1);
  }

  getRefCount(key: string): number {
    return this.references.get(key) ?? 0;
  }

  getSafeToUnload(): string[] {
    const safe: string[] = [];
    for (const [key, count] of this.references) {
      if (count === 0) {
        safe.push(key);
      }
    }
    return safe;
  }

  clear(): void {
    this.references.clear();
  }
}
