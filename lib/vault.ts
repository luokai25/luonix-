const DB = "luonix-local-vault";
const STORE = "secrets";
type RecordValue = { id: string; salt: ArrayBuffer; iv: ArrayBuffer; cipher: ArrayBuffer };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function put(value: RecordValue) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
async function get(id: string): Promise<RecordValue | undefined> {
  const db = await openDb();
  const result = await new Promise<RecordValue | undefined>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}
async function remove(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
async function derive(passphrase: string, salt: ArrayBuffer) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function saveSecret(provider: string, secret: string, passphrase: string) {
  if (passphrase.length < 10) throw new Error("Use a vault passphrase of at least 10 characters.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(passphrase, salt.buffer as ArrayBuffer);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(secret));
  await put({ id: provider, salt: salt.buffer, iv: iv.buffer, cipher });
}
export async function readSecret(provider: string, passphrase: string) {
  const item = await get(provider);
  if (!item) throw new Error("No saved key for this provider. Add one in Settings.");
  try {
    const key = await derive(passphrase, item.salt);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: item.iv }, key, item.cipher);
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error("Vault could not be unlocked. Check your passphrase.");
  }
}
export async function deleteSecret(provider: string) { await remove(provider); }
export async function hasSecret(provider: string) { return Boolean(await get(provider)); }
