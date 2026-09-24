import VanPosSmsModule from './VanPosSmsModule';

export async function sendSms(to: string, body: string): Promise<void> {
  if (!VanPosSmsModule) {
    throw new Error('VanPosSms native module is unavailable. Use a development build on Android.');
  }
  await VanPosSmsModule.send(to, body);
}

export function isSmsModuleAvailable(): boolean {
  return VanPosSmsModule != null;
}
