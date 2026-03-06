declare module 'wasmoon' {
  export class LuaFactory {
    createEngine(): Promise<LuaEngine>;
  }

  export class LuaEngine {
    global: LuaGlobal;
    doString(code: string): Promise<any>;
  }

  export class LuaGlobal {
    set(name: string, value: any): void;
    get(name: string): any;
    close(): void;
  }
}
