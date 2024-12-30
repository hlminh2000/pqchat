
export const uintArrayToB64 = (key: Uint8Array<ArrayBufferLike>) => btoa(String.fromCharCode.apply(null, [...key]))

export const b64ToUintArray = (b64encoded: string) => new Uint8Array(atob(b64encoded).split("").map(c => c.charCodeAt(0)))

function getKeyMaterial(password: string) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );
}

export const sharedSecretToCryptoKey = async (ss: Uint8Array<ArrayBufferLike>): Promise<CryptoKey> => {
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: ss,
      iterations: 100000,
      hash: "SHA-256",
    },
    await getKeyMaterial(atob(uintArrayToB64(ss))),
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  )
}
