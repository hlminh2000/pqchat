export interface RSAKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

interface CryptoUtils {
  generateRSAKeyPair(): Promise<RSAKeyPair>;
  importRSAKey(jwk: JsonWebKey, isPrivate?: boolean): Promise<CryptoKey>;
  encrypt(data: string, publicKey: CryptoKey): Promise<string>;
  decrypt(encryptedData: string, privateKey: CryptoKey): Promise<string>;
}

export class AsymetricCryptoUtilsImpl implements CryptoUtils {
  private readonly algorithm: RsaHashedKeyGenParams = {
    name: "RSA-OAEP",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256"
  };

  private readonly encryptionParams: RsaOaepParams = {
    name: "RSA-OAEP"
  };

  /**
   * Generates a new RSA key pair for encryption/decryption
   * @returns Promise containing the generated key pair and their JWK representations
   */
  public async generateRSAKeyPair(): Promise<RSAKeyPair> {
    const keyPair = await window.crypto.subtle.generateKey(
      this.algorithm,
      true,
      ["encrypt", "decrypt"]
    ) as CryptoKeyPair;

    const publicKeyJwk = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.publicKey
    );

    const privateKeyJwk = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      publicKeyJwk,
      privateKeyJwk
    };
  }

  /**
   * Imports an RSA key from JWK format
   * @param jwk - The JWK representation of the key
   * @param isPrivate - Whether this is a private key
   * @returns Promise containing the imported CryptoKey
   */
  public async importRSAKey(jwk: JsonWebKey, isPrivate: boolean = false): Promise<CryptoKey> {
    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      true,
      [isPrivate ? "decrypt" : "encrypt"]
    );
  }

  /**
   * Encrypts a string using RSA-OAEP
   * @param data - The string to encrypt
   * @param publicKey - The public key to use for encryption
   * @returns Promise containing the encrypted data as a base64 string
   */
  public async encrypt(data: string, publicKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const encryptedData = await window.crypto.subtle.encrypt(
      this.encryptionParams,
      publicKey,
      dataBuffer
    );

    return this.bufferToBase64(encryptedData);
  }

  /**
   * Decrypts an encrypted string using RSA-OAEP
   * @param encryptedData - The encrypted data as a base64 string
   * @param privateKey - The private key to use for decryption
   * @returns Promise containing the decrypted string
   */
  public async decrypt(encryptedData: string, privateKey: CryptoKey): Promise<string> {
    const encryptedBuffer = this.base64ToBuffer(encryptedData);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      this.encryptionParams,
      privateKey,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Converts an ArrayBuffer to a base64 string
   */
  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
  }

  /**
   * Converts a base64 string to an ArrayBuffer
   */
  private base64ToBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Error types for better error handling
export class CryptoError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'CryptoError';
  }
}

export class KeyGenerationError extends CryptoError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.name = 'KeyGenerationError';
  }
}

export class EncryptionError extends CryptoError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.name = 'EncryptionError';
  }
}

export class DecryptionError extends CryptoError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.name = 'DecryptionError';
  }
}