import { api, type RecoveryKeyBackup, type User } from "@/lib/api";

const PRIVATE_KEY_PREFIX = "cocoon-private-key:";
const PUBLIC_KEY_PREFIX = "cocoon-public-key:";
const RECOVERY_KEY_BACKUP_ALGORITHM = "pbkdf2-sha256+a256gcm";
const RECOVERY_KEY_BACKUP_VERSION = 1;
const RECOVERY_KEY_ITERATIONS = 250_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function privateStorageKey(userId: string) {
  return `${PRIVATE_KEY_PREFIX}${userId}`;
}

function publicStorageKey(userId: string) {
  return `${PUBLIC_KEY_PREFIX}${userId}`;
}

function assertBrowserCrypto() {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto is not available in this browser.");
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function getStoredKeyPair(userId: string) {
  if (typeof window === "undefined") return null;
  const privateKey = window.localStorage.getItem(privateStorageKey(userId));
  const publicKey = window.localStorage.getItem(publicStorageKey(userId));
  if (!privateKey || !publicKey) return null;
  return { privateKey, publicKey };
}

function storeKeyPair(userId: string, pair: { privateKey: string; publicKey: string }) {
  window.localStorage.setItem(privateStorageKey(userId), pair.privateKey);
  window.localStorage.setItem(publicStorageKey(userId), pair.publicKey);
}

export function hasLocalPrivateKey(userId: string): boolean {
  return Boolean(getStoredKeyPair(userId)?.privateKey);
}

async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  assertBrowserCrypto();
  return window.crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(publicKeyBase64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["wrapKey"],
  );
}

async function importPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
  assertBrowserCrypto();
  return window.crypto.subtle.importKey(
    "pkcs8",
    base64ToArrayBuffer(privateKeyBase64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["unwrapKey"],
  );
}

async function deriveRecoveryKey(
  passphrase: string,
  saltBuffer: ArrayBuffer,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  assertBrowserCrypto();
  const passphraseKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(saltBuffer),
      iterations: RECOVERY_KEY_ITERATIONS,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

async function generateStoredKeyPair(userId: string) {
  assertBrowserCrypto();
  const pair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["wrapKey", "unwrapKey"],
  );

  const [publicKeyBuffer, privateKeyBuffer] = await Promise.all([
    window.crypto.subtle.exportKey("spki", pair.publicKey),
    window.crypto.subtle.exportKey("pkcs8", pair.privateKey),
  ]);

  const stored = {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    privateKey: arrayBufferToBase64(privateKeyBuffer),
  };
  storeKeyPair(userId, stored);
  return stored;
}

export async function getKeyFingerprint(publicKeyBase64: string | null | undefined): Promise<string | null> {
  if (!publicKeyBase64) return null;
  assertBrowserCrypto();
  const digest = await window.crypto.subtle.digest("SHA-256", base64ToArrayBuffer(publicKeyBase64));
  return Array.from(new Uint8Array(digest))
    .slice(0, 6)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join(":");
}

export async function ensureUserEncryption(user: User): Promise<{
  publicKey: string | null;
  fingerprint: string | null;
  needsRecovery: boolean;
  created: boolean;
}> {
  assertBrowserCrypto();
  const local = getStoredKeyPair(user.id);

  if (local) {
    if (user.public_key && user.public_key !== local.publicKey) {
      return {
        publicKey: user.public_key,
        fingerprint: await getKeyFingerprint(user.public_key),
        needsRecovery: true,
        created: false,
      };
    }

    if (!user.public_key) {
      await api.profile.update({ public_key: local.publicKey });
    }

    return {
      publicKey: local.publicKey,
      fingerprint: await getKeyFingerprint(local.publicKey),
      needsRecovery: false,
      created: false,
    };
  }

  if (user.public_key) {
    return {
      publicKey: user.public_key,
      fingerprint: await getKeyFingerprint(user.public_key),
      needsRecovery: true,
      created: false,
    };
  }

  const createdPair = await generateStoredKeyPair(user.id);
  await api.profile.update({ public_key: createdPair.publicKey });
  return {
    publicKey: createdPair.publicKey,
    fingerprint: await getKeyFingerprint(createdPair.publicKey),
    needsRecovery: false,
    created: true,
  };
}

export async function createRecoveryKeyBackup(userId: string, passphrase: string): Promise<RecoveryKeyBackup> {
  const stored = getStoredKeyPair(userId);
  if (!stored?.privateKey) {
    throw new Error("This browser does not have your private journal key yet.");
  }

  if (!passphrase) {
    throw new Error("Enter a recovery passphrase first.");
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptionKey = await deriveRecoveryKey(passphrase, salt.buffer, ["encrypt"]);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    encryptionKey,
    encoder.encode(stored.privateKey),
  );

  return {
    version: RECOVERY_KEY_BACKUP_VERSION,
    algorithm: RECOVERY_KEY_BACKUP_ALGORITHM,
    encrypted_private_key: arrayBufferToBase64(ciphertext),
    salt: arrayBufferToBase64(salt.buffer),
    nonce: arrayBufferToBase64(iv.buffer),
  };
}

export async function restoreKeyPairFromBackup(
  user: User,
  backup: RecoveryKeyBackup,
  passphrase: string,
): Promise<void> {
  if (!user.public_key) {
    throw new Error("This account is missing its public journal key.");
  }

  if (!passphrase) {
    throw new Error("Enter your recovery passphrase first.");
  }

  try {
    const recoveryKey = await deriveRecoveryKey(passphrase, base64ToArrayBuffer(backup.salt), ["decrypt"]);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(backup.nonce)) },
      recoveryKey,
      base64ToArrayBuffer(backup.encrypted_private_key),
    );
    const privateKey = decoder.decode(decrypted);

    await importPrivateKey(privateKey);
    storeKeyPair(user.id, {
      privateKey,
      publicKey: user.public_key,
    });
  } catch {
    throw new Error("That recovery passphrase did not unlock your journal key.");
  }
}

export async function generateJournalKey(): Promise<CryptoKey> {
  assertBrowserCrypto();
  return window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"],
  );
}

export async function wrapJournalKeyForUser(journalKey: CryptoKey, publicKeyBase64: string): Promise<string> {
  const publicKey = await importPublicKey(publicKeyBase64);
  const wrappedKey = await window.crypto.subtle.wrapKey("raw", journalKey, publicKey, {
    name: "RSA-OAEP",
  });
  return arrayBufferToBase64(wrappedKey);
}

export async function unwrapJournalKeyForUser(userId: string, encryptedKey: string): Promise<CryptoKey> {
  const stored = getStoredKeyPair(userId);
  if (!stored?.privateKey) {
    throw new Error("This browser does not have your private journal key.");
  }

  const privateKey = await importPrivateKey(stored.privateKey);
  return window.crypto.subtle.unwrapKey(
    "raw",
    base64ToArrayBuffer(encryptedKey),
    privateKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJournalBody(journalKey: CryptoKey, body: string): Promise<{
  encryptedBody: string;
  nonce: string;
}> {
  assertBrowserCrypto();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    journalKey,
    encoder.encode(body),
  );
  return {
    encryptedBody: arrayBufferToBase64(ciphertext),
    nonce: arrayBufferToBase64(iv.buffer),
  };
}

export async function decryptJournalBody(
  journalKey: CryptoKey,
  encryptedBody: string,
  nonce: string,
): Promise<string> {
  const iv = new Uint8Array(base64ToArrayBuffer(nonce));
  const plaintext = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    journalKey,
    base64ToArrayBuffer(encryptedBody),
  );
  return decoder.decode(plaintext);
}
