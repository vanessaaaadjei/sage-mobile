import VanPosPrinterModule from './VanPosPrinterModule';

export async function printOverBluetooth(address: string, payload: string): Promise<void> {
  if (!VanPosPrinterModule) {
    throw new Error('VanPosPrinter native module is unavailable. Use a development build on Android.');
  }
  await VanPosPrinterModule.print(address, payload);
}

export function isPrinterModuleAvailable(): boolean {
  return VanPosPrinterModule != null;
}
