export interface AESKeyData {
  key: CryptoKey;
  exportedKey: JsonWebKey;
}

export interface EncryptedData {
  ciphertext: string;  // Base64 encoded encrypted data
  iv: string;         // Base64 encoded initialization vector
}

export class SymmetricCryptoUtils {
  /**
   * Generates a new AES-GCM key
   * @param exportable Whether the key should be exportable
   */
  public async generateKey(): Promise<AESKeyData> {
    const key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256
      },
      true,
      ["encrypt", "decrypt"]
    );

    const exportedKey = await window.crypto.subtle.exportKey("jwk", key);

    return { key, exportedKey };
  }

  /**
   * Imports an AES key from JWK format
   */
  public async importKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "AES-GCM",
        length: 256
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypts data using AES-GCM
   * @param data The string to encrypt
   * @param key The AES-GCM key
   */
  public async encrypt(data: string, key: CryptoKey): Promise<EncryptedData> {
    // Generate a random IV (Initialization Vector)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      encodedData
    );

    return {
      ciphertext: this.bufferToBase64(encryptedData),
      iv: this.bufferToBase64(iv.buffer)
    };
  }

  /**
   * Decrypts data using AES-GCM
   * @param encryptedData The encrypted data and IV
   * @param key The AES-GCM key
   */
  public async decrypt(encryptedData: EncryptedData, key: CryptoKey): Promise<string> {
    const iv = this.base64ToBuffer(encryptedData.iv);
    const ciphertext = this.base64ToBuffer(encryptedData.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}