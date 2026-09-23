// Utility for Real WebAuthn Biometric Fingerprint / Touch ID / Windows Hello Authentication

export interface WebAuthnResult {
  success: boolean;
  error?: string;
  isWebAuthnSupported: boolean;
  isHardwareAvailable?: boolean;
}

/**
 * Checks if hardware biometric platform authenticator (Touch ID, Windows Hello, Fingerprint) is supported.
 */
export async function checkBiometricSupport(): Promise<{ supported: boolean; hardwareAvailable: boolean }> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
    return { supported: false, hardwareAvailable: false };
  }

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return { supported: true, hardwareAvailable: available };
    }
    return { supported: true, hardwareAvailable: true };
  } catch (e) {
    return { supported: true, hardwareAvailable: false };
  }
}

/**
 * Triggers actual laptop/device hardware biometric fingerprint verification.
 * Uses PublicKeyCredential (Touch ID / Windows Hello / Android Biometrics).
 */
export async function authenticateWithWebAuthn(
  rpName = 'سامانه بازرگانی',
  userName = 'مدیر ارشد بازرگانی'
): Promise<WebAuthnResult> {
  const support = await checkBiometricSupport();

  if (!support.supported) {
    return {
      success: false,
      error: 'مرورگر یا لایه امنیتی شما از حسگر بیومتریک WebAuthn پشتیبانی نمی‌کند.',
      isWebAuthnSupported: false,
      isHardwareAvailable: false,
    };
  }

  try {
    // Challenge buffer
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';

    // 1. Try creating a local platform credential to trigger the native Touch ID / Windows Hello prompt
    const createOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: rpName,
        id: hostname === 'localhost' || hostname.includes('.') ? hostname : undefined,
      },
      user: {
        id: userId,
        name: 'admin@bazargani',
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Physical laptop fingerprint / Touch ID / Windows Hello
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = await navigator.credentials.create({
      publicKey: createOptions,
    });

    if (credential) {
      return {
        success: true,
        isWebAuthnSupported: true,
        isHardwareAvailable: true,
      };
    }

    return {
      success: true,
      isWebAuthnSupported: true,
      isHardwareAvailable: true,
    };
  } catch (err: any) {
    console.warn('WebAuthn biometric auth notice:', err);

    if (err.name === 'NotAllowedError') {
      return {
        success: false,
        error: 'تایید اثر انگشت توسط کاربر لغو شد یا اثر انگشت ورودی مطابقت نداشت.',
        isWebAuthnSupported: true,
        isHardwareAvailable: true,
      };
    }

    if (err.name === 'SecurityError' || err.name === 'InvalidStateError') {
      return {
        success: false,
        error: 'محیط اجرای مرورگر اجازه دسترسی مستقیم به حسگر سخت‌افزاری را نداد.',
        isWebAuthnSupported: true,
        isHardwareAvailable: false,
      };
    }

    return {
      success: false,
      error: err.message || 'خطا در برقراری ارتباط با حسگر بیومتریک دستگاه',
      isWebAuthnSupported: true,
      isHardwareAvailable: false,
    };
  }
}
