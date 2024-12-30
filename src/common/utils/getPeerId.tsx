
export const getPeerId = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("peerId");
}
