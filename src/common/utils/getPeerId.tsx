
export const getPeerId = () => {
  if (typeof window === "undefined") return null
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("peerId");
}
