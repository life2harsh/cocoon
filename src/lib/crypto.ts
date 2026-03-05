export function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateUserKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportKeyJwk(key: CryptoKey) {
  return crypto.subtle.exportKey("jwk", key);
}

export async function importPublicKey(jwk: JsonWebKey) {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

export async function importPrivateKey(jwk: JsonWebKey) {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

export async function generateJournalKey() {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportJournalKeyRaw(key: CryptoKey) {
  return crypto.subtle.exportKey("raw", key);
}

export async function importJournalKey(raw: ArrayBuffer) {
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptJournalKey(aesKey: CryptoKey, publicKey: CryptoKey) {
  const raw = await exportJournalKeyRaw(aesKey);
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, raw);
  return bufToBase64(encrypted);
}

export async function decryptJournalKey(encryptedBase64: string, privateKey: CryptoKey) {
  const encrypted = base64ToBuf(encryptedBase64);
  const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encrypted);
  return importJournalKey(raw);
}

export async function encryptText(aesKey: CryptoKey, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);
  return { cipher: bufToBase64(cipher), iv: bufToBase64(iv.buffer) };
}

export async function decryptText(aesKey: CryptoKey, cipherBase64: string, ivBase64: string) {
  const cipher = base64ToBuf(cipherBase64);
  const iv = new Uint8Array(base64ToBuf(ivBase64));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, cipher);
  return new TextDecoder().decode(plain);
}
