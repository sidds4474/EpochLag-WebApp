import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "epochlag_secure";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const VALUE_STORE = "values";
const WRAPPING_KEY_ID = "wrap_v1";

type EncryptedRecord = {
  iv: Uint8Array;
  ciphertext: Uint8Array;
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("secureTokenStore unavailable on server"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(KEY_STORE)) {
          db.createObjectStore(KEY_STORE);
        }
        if (!db.objectStoreNames.contains(VALUE_STORE)) {
          db.createObjectStore(VALUE_STORE);
        }
      },
    });
  }
  return dbPromise;
}

async function getOrCreateWrappingKey(): Promise<CryptoKey> {
  const db = await getDb();
  const existing = (await db.get(KEY_STORE, WRAPPING_KEY_ID)) as
    | CryptoKey
    | undefined;
  if (existing) return existing;

  // Non-extractable AES-GCM 256. The handle is store-able in IDB via
  // structured clone; the underlying key material never touches JS memory.
  const fresh = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  await db.put(KEY_STORE, fresh, WRAPPING_KEY_ID);
  return fresh;
}

async function encrypt(plaintext: string): Promise<EncryptedRecord> {
  const key = await getOrCreateWrappingKey();
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encoded as BufferSource
  );
  return { iv, ciphertext: new Uint8Array(ciphertextBuf) };
}

async function decrypt(record: EncryptedRecord): Promise<string> {
  const key = await getOrCreateWrappingKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: record.iv as BufferSource },
    key,
    record.ciphertext as BufferSource
  );
  return new TextDecoder().decode(plaintext);
}

export async function setSecureValue(id: string, value: string): Promise<void> {
  const db = await getDb();
  const record = await encrypt(value);
  await db.put(VALUE_STORE, record, id);
}

export async function getSecureValue(id: string): Promise<string | null> {
  try {
    const db = await getDb();
    const record = (await db.get(VALUE_STORE, id)) as
      | EncryptedRecord
      | undefined;
    if (!record) return null;
    return await decrypt(record);
  } catch {
    // Wrapping key lost, ciphertext corrupt, etc — treat as absent.
    return null;
  }
}

export async function deleteSecureValue(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(VALUE_STORE, id);
}

export async function clearAllSecureValues(): Promise<void> {
  const db = await getDb();
  await db.clear(VALUE_STORE);
}

// ---- draftToken convenience API (matches mobile SecureStore pattern) ----

const DRAFT_TOKEN_ID = "onboarding.draftToken";

export function setDraftToken(token: string): Promise<void> {
  return setSecureValue(DRAFT_TOKEN_ID, token);
}

export function getDraftToken(): Promise<string | null> {
  return getSecureValue(DRAFT_TOKEN_ID);
}

export function clearDraftToken(): Promise<void> {
  return deleteSecureValue(DRAFT_TOKEN_ID);
}
