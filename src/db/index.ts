import { Platform } from 'react-native';

import { MemoryStore } from './memoryStore';
import type { PosStore } from './store';

let instance: PosStore | null = null;

export async function getStore(): Promise<PosStore> {
  if (instance) return instance;
  if (Platform.OS === 'web') {
    instance = new MemoryStore();
  } else {
    const { SqliteStore } = await import('./sqliteStore');
    instance = new SqliteStore();
  }
  await instance.init();
  return instance;
}
