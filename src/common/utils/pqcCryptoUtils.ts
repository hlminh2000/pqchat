
export const uintArrayToB64 = (key: Uint8Array<ArrayBufferLike>) => btoa(String.fromCharCode.apply(null, [...key]))

export const b64ToUintArray = (b64encoded: string) => new Uint8Array(atob(b64encoded).split("").map(c => c.charCodeAt(0)))

export const sharedSecretToCryptoKey = async (ss: Uint8Array<ArrayBufferLike>): Promise<CryptoKey> => {

  let kdk = await crypto.subtle.importKey(
    'raw',
    ss,
    'HKDF',
    false, // KDF keys cannot be exported
    ['deriveKey', 'deriveBits']);

  return crypto.subtle.deriveKey(
    { 
      name: 'HKDF', 
      salt: new Uint8Array(), 
      info: new TextEncoder().encode("symetric key"), 
      hash: 'SHA-256' 
    },
    kdk,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  )
}
