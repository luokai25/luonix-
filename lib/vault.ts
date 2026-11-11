const DB = "luonix-local-vault";
const STORE = "secrets";
export type SecretMeta = { id: string; provider: string; label: string };
type RecordValue = { id: string; provider?: string; label?: string; salt: ArrayBuffer; iv: ArrayBuffer; cipher: ArrayBuffer };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function put(value: RecordValue) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(value); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close();
}
async function getAll(): Promise<RecordValue[]> {
  const db = await openDb();
  const result = await new Promise<RecordValue[]>((resolve, reject) => { const request = db.transaction(STORE).objectStore(STORE).getAll(); request.onsuccess = () => resolve(request.result || []); request.onerror = () => reject(request.error); });
  db.close(); return result;
}
async function get(id: string): Promise<RecordValue | undefined> {
  const db = await openDb();
  const result = await new Promise<RecordValue | undefined>((resolve, reject) => { const request = db.transaction(STORE).objectStore(STORE).get(id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  db.close(); return result;
}
async function remove(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close();
}
async function derive(passphrase: string, salt: ArrayBuffer) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function saveSecret(provider: string, secret: string, passphrase: string, label = "Key") {
  if (passphrase.length < 10) throw new Error("Use a vault passphrase of at least 10 characters.");
  if (!secret.trim()) throw new Error("Paste an API key first.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(passphrase, salt.buffer as ArrayBuffer);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(secret));
  const id = provider + ":" + crypto.randomUUID();
  await put({ id, provider, label: label.trim() || "Key", salt: salt.buffer, iv: iv.buffer, cipher });
  return id;
}
export async function listSecrets(provider?: string): Promise<SecretMeta[]> {
  const all = await getAll();
  return all.map(item => ({ id: item.id, provider: item.provider || item.id.split(":")[0], label: item.label || "Legacy key" }))
    .filter(item => !provider || item.provider === provider);
}
export async function readSecret(provider: string, passphrase: string, selectedId?: string) {
  const all = await getAll();
  const item = selectedId ? await get(selectedId) : all.find(x => (x.provider || x.id.split(":")[0]) === provider);
  if (!item || (item.provider && item.provider !== provider)) throw new Error("No saved key for this provider. Add one in Settings.");
  try {
    const key = await derive(passphrase, item.salt);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: item.iv }, key, item.cipher);
    return new TextDecoder().decode(plain);
  } catch { throw new Error("Vault could not be unlocked. Check your passphrase."); }
}
export async function deleteSecret(provider: string, selectedId?: string) {
  if (selectedId) return remove(selectedId);
  const all = await getAll();
  for (const item of all) if ((item.provider || item.id.split(":")[0]) === provider) await remove(item.id);
}
export async function hasSecret(provider: string) { return (await listSecrets(provider)).length > 0; }
