import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class VanPosPrinterModule extends NativeModule {
  print(address: string, payload: string): Promise<void>;
  isAvailable(): boolean;
}

export default requireOptionalNativeModule<VanPosPrinterModule>('VanPosPrinter');
