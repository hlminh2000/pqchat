
export const uintArrayToB64 = (key: Uint8Array<ArrayBufferLike>) => btoa(String.fromCharCode.apply(null, [...key]))

export const b64ToUintArray = (b64encoded: string) => new Uint8Array(atob(b64encoded).split("").map(c => c.charCodeAt(0)))

export const rawKeyToCryptoKey = (rawKey: Uint8Array<ArrayBufferLike>): Promise<CryptoKey> => {
  try {
    return crypto.subtle.importKey(
      "raw",
      rawKey.buffer.slice(0, 32) as ArrayBuffer, // AES can only take 
      {
        name: "AES-GCM",
        length: 256
      },
      false,
      ["encrypt", "decrypt"]
    )
  } catch (err) {
    console.error(err)
    throw err
  }
}
