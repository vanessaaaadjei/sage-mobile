import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class VanPosSmsModule extends NativeModule {
  send(to: string, body: string): Promise<void>;
}

export default requireOptionalNativeModule<VanPosSmsModule>('VanPosSms');
