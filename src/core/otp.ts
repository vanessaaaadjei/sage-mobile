import * as Crypto from 'expo-crypto';

const OTP_LENGTH = 4;

/** Cryptographically random 4-digit code, as delivered to the customer by SMS. */
export function generateOtp(): string {
  const bytes = Crypto.getRandomBytes(OTP_LENGTH);
  return Array.from(bytes)
    .map((byte) => (byte % 10).toString())
    .join('');
}

export function hashOtp(code: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${code}`);
}

/** Constant-time-ish comparison of the typed code against the stored SHA-256 digest. */
export async function verifyOtp(code: string, salt: string, expectedHash: string): Promise<boolean> {
  const digest = await hashOtp(code, salt);
  if (digest.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < digest.length; i += 1) {
    diff |= digest.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}
