import {
  generateUserKeyPair,
  exportKeyJwk,
  importPrivateKey,
  importPublicKey,
  generateJournalKey,
  encryptJournalKey,
  decryptJournalKey,
  encryptText,
  decryptText,
} from "@/lib/crypto";

const PRIVATE_KEY_STORAGE = "cocoon_private_key";
const keyCache = new Map<string, { key: CryptoKey | null; ts: number }>();
const keyPromises = new Map<string, Promise<CryptoKey | null>>();
const KEY_TTL_MS = 30000;

export async function ensureUserKeyPair() {
  const existing = localStorage.getItem(PRIVATE_KEY_STORAGE);
  if (existing) {
    const jwk = JSON.parse(existing);
    return importPrivateKey(jwk);
  }

  const { publicKey, privateKey } = await generateUserKeyPair();
  const publicJwk = await exportKeyJwk(publicKey);
  const privateJwk = await exportKeyJwk(privateKey);
  localStorage.setItem(PRIVATE_KEY_STORAGE, JSON.stringify(privateJwk));

  await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_key: JSON.stringify(publicJwk) }),
  });

  return privateKey;
}

export async function getJournalKey(journalId: string): Promise<CryptoKey | null> {
  const cached = keyCache.get(journalId);
  if (cached && Date.now() - cached.ts < KEY_TTL_MS) {
    return cached.key;
  }
  if (keyPromises.has(journalId)) {
    return keyPromises.get(journalId) || null;
  }

  const promise: Promise<CryptoKey | null> = (async () => {
    const privateKey = await ensureUserKeyPair();
    const res = await fetch(`/api/journals/${journalId}/keys`);
    const data = await res.json();
    if (data.encrypted_key) {
      const key = await decryptJournalKey(data.encrypted_key, privateKey);
      keyCache.set(journalId, { key, ts: Date.now() });
      return key;
    }
    if (data.need_public_key) {
      await ensureUserKeyPair();
      return getJournalKey(journalId);
    }
    if (data.generate) {
      const newKey = await generateJournalKey();
      const ownerPublicKey = await importPublicKey(JSON.parse(data.owner_public_key));
      const encryptedKey = await encryptJournalKey(newKey, ownerPublicKey);
      await fetch(`/api/journals/${journalId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypted_key: encryptedKey }),
      });
      keyCache.set(journalId, { key: newKey, ts: Date.now() });
      return newKey;
    }
    keyCache.set(journalId, { key: null, ts: Date.now() });
    return null;
  })();

  keyPromises.set(journalId, promise);
  const result: CryptoKey | null = await promise;
  keyPromises.delete(journalId);
  return result;
}

export async function encryptEntry(journalId: string, text: string) {
  const key = await getJournalKey(journalId);
  if (!key) return null;
  return encryptText(key, text);
}

export async function decryptEntry(journalId: string, cipher: string, iv: string) {
  const key = await getJournalKey(journalId);
  if (!key) return null;
  return decryptText(key, cipher, iv);
}
