/**
 * IndexedDB 薄型ラッパー。
 * ゼロコスト・アーキテクチャ要件「ストレージの分散化」に対応し、
 * 解析データ・履歴・チャットログをユーザーのローカル環境に保存する。
 */

const DB_NAME = "musou-ec";
const DB_VERSION = 1;

export type StoreName = "history" | "chat" | "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("history")) {
        const s = db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
        s.createIndex("byTool", "tool");
        s.createIndex("byTime", "createdAt");
      }
      if (!db.objectStoreNames.contains("chat")) {
        const s = db.createObjectStore("chat", { keyPath: "id", autoIncrement: true });
        s.createIndex("byOwner", "owner");
        s.createIndex("byTime", "createdAt");
      }
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store: StoreName, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then((db) => db.transaction(store, mode).objectStore(store));
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbAdd<T>(store: StoreName, value: T): Promise<number> {
  const s = await tx(store, "readwrite");
  return reqToPromise(s.add(value as unknown as Record<string, unknown>)) as Promise<number>;
}

export async function idbPut<T>(store: StoreName, value: T): Promise<IDBValidKey> {
  const s = await tx(store, "readwrite");
  return reqToPromise(s.put(value as unknown as Record<string, unknown>));
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const s = await tx(store, "readonly");
  return reqToPromise(s.getAll()) as Promise<T[]>;
}

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const s = await tx(store, "readonly");
  return reqToPromise(s.get(key)) as Promise<T | undefined>;
}

export async function idbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  const s = await tx(store, "readwrite");
  await reqToPromise(s.delete(key));
}

export async function idbClear(store: StoreName): Promise<void> {
  const s = await tx(store, "readwrite");
  await reqToPromise(s.clear());
}

/** owner フィールドを一括書き換え（ゲスト仮ID → 会員IDの引継ぎで使用） */
export async function idbReassignOwner(
  store: StoreName,
  from: string,
  to: string,
): Promise<number> {
  const s = await tx(store, "readwrite");
  const all = (await reqToPromise(s.getAll())) as Array<Record<string, unknown>>;
  let n = 0;
  for (const row of all) {
    if (row.owner === from) {
      row.owner = to;
      await reqToPromise(s.put(row));
      n++;
    }
  }
  return n;
}
