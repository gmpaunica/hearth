import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Supabase sessions can be larger than the historical SecureStore value limit.
 * Keep an atomic manifest plus small encrypted chunks, and only delete the
 * legacy AsyncStorage value after a verified secure read-back.
 */
const SCHEMA_VERSION = 1;
const CHUNK_SIZE = 1800;
const SERVICE = 'com.hearth.app.auth.v1';

interface Manifest {
  version: 1;
  generation: string;
  chunks: number;
  length: number;
  checksum: string;
}

const options: SecureStore.SecureStoreOptions = {
  keychainService: SERVICE,
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function fingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function namespace(key: string): string {
  return `hearth.auth.v${SCHEMA_VERSION}.${fingerprint(key)}`;
}

function manifestKey(key: string): string {
  return `${namespace(key)}.manifest`;
}

function chunkKey(key: string, generation: string, index: number): string {
  return `${namespace(key)}.${generation}.${index}`;
}

async function readManifest(key: string): Promise<Manifest | null> {
  const raw = await SecureStore.getItemAsync(manifestKey(key), options);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Manifest>;
    if (
      parsed.version !== SCHEMA_VERSION ||
      typeof parsed.generation !== 'string' ||
      !Number.isInteger(parsed.chunks) ||
      !Number.isInteger(parsed.length) ||
      typeof parsed.checksum !== 'string'
    ) return null;
    return parsed as Manifest;
  } catch {
    return null;
  }
}

async function readSecureValue(key: string): Promise<string | null> {
  const manifest = await readManifest(key);
  if (!manifest) return null;
  const chunks = await Promise.all(
    Array.from({ length: manifest.chunks }, (_, index) =>
      SecureStore.getItemAsync(chunkKey(key, manifest.generation, index), options)),
  );
  if (chunks.some((chunk) => chunk == null)) return null;
  const value = chunks.join('');
  if (value.length !== manifest.length || fingerprint(value) !== manifest.checksum) return null;
  return value;
}

async function deleteGeneration(key: string, manifest: Manifest | null): Promise<void> {
  if (!manifest) return;
  await Promise.allSettled(
    Array.from({ length: manifest.chunks }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(key, manifest.generation, index), options)),
  );
}

async function writeSecureValue(key: string, value: string): Promise<void> {
  const previous = await readManifest(key);
  const generation = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const chunks = Array.from(
    { length: Math.max(1, Math.ceil(value.length / CHUNK_SIZE)) },
    (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
  );
  const manifest: Manifest = {
    version: SCHEMA_VERSION,
    generation,
    chunks: chunks.length,
    length: value.length,
    checksum: fingerprint(value),
  };
  try {
    await Promise.all(chunks.map((chunk, index) =>
      SecureStore.setItemAsync(chunkKey(key, generation, index), chunk, options)));
    await SecureStore.setItemAsync(manifestKey(key), JSON.stringify(manifest), options);
    if (await readSecureValue(key) !== value) throw new Error('Secure session verification failed');
  } catch (error) {
    if (previous) {
      await SecureStore.setItemAsync(manifestKey(key), JSON.stringify(previous), options);
    } else {
      await SecureStore.deleteItemAsync(manifestKey(key), options);
    }
    await deleteGeneration(key, manifest);
    throw error;
  }
  await deleteGeneration(key, previous);
}

async function deleteSecureValue(key: string): Promise<void> {
  const manifest = await readManifest(key);
  await SecureStore.deleteItemAsync(manifestKey(key), options);
  await deleteGeneration(key, manifest);
}

export interface AuthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Native storage for Supabase Auth. Web keeps its per-tab session adapter. */
export const secureAuthStorage: AuthStorage = {
  async getItem(key) {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    const secure = await readSecureValue(key);
    if (secure != null) return secure;

    const legacy = await AsyncStorage.getItem(key);
    if (legacy == null) return null;
    await writeSecureValue(key, legacy);
    if (await readSecureValue(key) !== legacy) return legacy;
    await AsyncStorage.removeItem(key);
    return legacy;
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    await writeSecureValue(key, value);
  },
  async removeItem(key) {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    await deleteSecureValue(key);
    await AsyncStorage.removeItem(key);
  },
};

export const secureAuthStorageInternals = {
  chunkSize: CHUNK_SIZE,
  fingerprint,
  namespace,
};
