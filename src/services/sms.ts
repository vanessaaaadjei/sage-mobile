import { Platform } from 'react-native';

import { isSmsModuleAvailable, sendSms } from '../../modules/van-pos-sms/src';

export type SmsChannel = 'direct-sim' | 'ios-composer' | 'simulated';

export type SmsReceipt = {
  to: string;
  body: string;
  sentAt: string;
  channel: SmsChannel;
};

async function ensureAndroidSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const { PermissionsAndroid } = await import('react-native');
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS, {
    title: 'SMS permission',
    message: 'Van POS needs SMS to send the delivery confirmation code to the customer.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Sends the OTP to the customer.
 * - Android development build: silent SmsManager (GSM, no data).
 * - iOS development build: opens the Messages composer (Apple requires user confirm).
 * - Expo Go / web / unavailable native module: simulated (code shown in UI).
 */
export async function sendOtpSms(phone: string, code: string): Promise<SmsReceipt> {
  const body = `Your delivery confirmation code is ${code}. Read it to the sales rep to confirm receipt.`;

  if (isSmsModuleAvailable() && (Platform.OS === 'android' || Platform.OS === 'ios')) {
    if (Platform.OS === 'android') {
      const allowed = await ensureAndroidSmsPermission();
      if (!allowed) {
        throw new Error('SMS permission was denied. Allow SMS to confirm deliveries.');
      }
    }
    await sendSms(phone, body);
    return {
      to: phone,
      body,
      sentAt: new Date().toISOString(),
      channel: Platform.OS === 'ios' ? 'ios-composer' : 'direct-sim',
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  return { to: phone, body, sentAt: new Date().toISOString(), channel: 'simulated' };
}
