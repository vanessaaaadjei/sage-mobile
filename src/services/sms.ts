import { Platform } from 'react-native';

export type SmsReceipt = {
  to: string;
  body: string;
  sentAt: string;
  channel: 'direct-sim' | 'simulated';
};

/**
 * Direct-SIM GSM delivery of the OTP. On a device build this is backed by a
 * native module wrapping `android.telephony.SmsManager`, which needs no data
 * connection; anywhere the native module is missing the send is simulated so
 * the rest of the flow stays testable.
 */
export async function sendOtpSms(phone: string, code: string): Promise<SmsReceipt> {
  const body = `Your delivery confirmation code is ${code}. Read it to the sales rep to confirm receipt.`;
  const nativeSmsManager = (globalThis as { SmsManager?: { send(to: string, body: string): Promise<void> } }).SmsManager;
  if (Platform.OS === 'android' && nativeSmsManager) {
    await nativeSmsManager.send(phone, body);
    return { to: phone, body, sentAt: new Date().toISOString(), channel: 'direct-sim' };
  }
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { to: phone, body, sentAt: new Date().toISOString(), channel: 'simulated' };
}
