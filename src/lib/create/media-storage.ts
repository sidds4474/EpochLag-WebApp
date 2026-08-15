// Minimal IndexedDB wrapper for the story composer's media persistence.
// Files can't survive a page refresh via localStorage (too small, and Blobs
// aren't JSON-serializable). IDB natively persists Blobs across reloads,
// with quotas measured in tens of MB rather than 5 MB.
//
// Schema — a single object store `media`, keyed by the block id. Each entry
// stores { id, mimeType, fileName, blob }. Callers pair this with a
// localStorage draft that lists the ordered block ids so hydration can
// look up each blob and rebuild the corresponding EditorBlock.

const DB_NAME = "epoch-composer";
const DB_VERSION = 1;
const STORE = "media";

type MediaEntry = {
  id: string;
  mimeType: string;
  fileName: string;
  blob: Blob;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putMedia(id: string, file: File): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const entry: MediaEntry = {
        id,
        mimeType: file.type,
        fileName: file.name,
        blob: file,
      };
      store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* IDB unavailable or quota exceeded — persistence is best-effort */
  }
}

export async function getMedia(id: string): Promise<File | null> {
  try {
    const db = await openDb();
    const entry = await new Promise<MediaEntry | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as MediaEntry | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!entry) return null;
    // Reconstruct a File so the publish upload path (which does
    // `file.name`, `file.type`, `file.size`) works unchanged.
    return new File([entry.blob], entry.fileName, { type: entry.mimeType });
  } catch {
    return null;
  }
}

export async function deleteMedia(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function clearAllMedia(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}
