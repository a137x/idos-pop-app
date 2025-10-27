//#region src/store/interface.d.ts
interface PipeCodecArgs<T> {
  encode: (data: T) => string;
  decode: (data: string) => T;
}
interface Store {
  // biome-ignore lint/suspicious/noExplicitAny: any is fine here.
  get<K = any>(key: string): Promise<K | undefined>;
  // biome-ignore lint/suspicious/noExplicitAny: any is fine here.
  set<K = any>(key: string, value: K): Promise<void>;
  delete(key: string): Promise<void>;
  reset(): Promise<void>;
  setRememberDuration(duration?: number): Promise<void>;
  pipeCodec<T>(codec: PipeCodecArgs<T>): Store;
}
//#endregion
//#region src/store/chrome.d.ts
declare class ChromeExtensionStore implements Store {
  readonly REMEMBER_DURATION_KEY = "storage-expiration";
  readonly keyPrefix: string;
  constructor(keyPrefix?: string);
  // biome-ignore lint/suspicious/noExplicitAny: `any` is fine here.
  get<K = any>(key: string): Promise<K | undefined>;
  // biome-ignore lint/suspicious/noExplicitAny: `any` is fine here.
  set<K = any>(key: string, value: K): Promise<void>;
  delete(key: string): Promise<void>;
  reset(): Promise<void>;
  setRememberDuration(days?: number): Promise<void>;
  checkRememberDurationElapsed(): Promise<void>;
  hasRememberDurationElapsed(): Promise<boolean>;
  pipeCodec<T>({
    encode,
    decode
  }: PipeCodecArgs<T>): ChromeExtensionStore;
}
//#endregion
//#region src/store/local.d.ts
declare class LocalStorageStore implements Store {
  #private;
  readonly keyPrefix: string;
  readonly storage: Storage;
  readonly REMEMBER_DURATION_KEY = "storage-expiration";
  // @ts-expect-error window is defined in the library mode, that's fine
  constructor(storage?: Storage, keyPrefix?: string);
  pipeCodec<T>({
    encode,
    decode
  }: PipeCodecArgs<T>): LocalStorageStore;
  // biome-ignore lint/suspicious/noExplicitAny: `any` is fine here.
  get<K = any>(key: string): Promise<K | undefined>;
  setRememberDuration(days?: number): Promise<void>;
  checkRememberDurationElapsed(): Promise<void>;
  hasRememberDurationElapsed(): Promise<boolean>;
  // biome-ignore lint/suspicious/noExplicitAny: `any` is fine here.
  set<K = any>(key: string, value: K): Promise<void>;
  delete(key: string): Promise<void>;
  reset(): Promise<void>;
}
//#endregion
//#region src/store/memory.d.ts
declare class MemoryStore implements Store {
  readonly REMEMBER_DURATION_KEY = "storage-expiration";
  readonly keyPrefix: string;
  // biome-ignore lint/suspicious/noExplicitAny: `any` is fine here.
  private readonly storage;
  constructor(keyPrefix?: string);
  // biome-ignore lint/suspicious/noExplicitAny: `any` is fine here.
  get<K = any>(key: string): Promise<K | undefined>;
  // biome-ignore lint/suspicious/noExplicitAny: `any` is fine here.
  set<K = any>(key: string, value: K): Promise<void>;
  delete(key: string): Promise<void>;
  reset(): Promise<void>;
  setRememberDuration(days?: number): Promise<void>;
  hasRememberDurationElapsed(): boolean;
  pipeCodec<T>({
    encode,
    decode
  }: PipeCodecArgs<T>): MemoryStore;
}
//#endregion
export { ChromeExtensionStore, LocalStorageStore, MemoryStore, type Store };
//# sourceMappingURL=index-DdBYG9PA.d.ts.map