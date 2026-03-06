declare module 'wasmoon' {
  export class LuaFactory {
    createEngine(): Promise<LuaEngine>;
  }

  export class LuaEngine {
    global: LuaGlobal;
    doString(code: string): Promise<unknown>;
  }

  export class LuaGlobal {
    set(name: string, value: unknown): void;
    get(name: string): unknown;
    close(): void;
  }
}
