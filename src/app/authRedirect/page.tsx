"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default () => {
  const router = useRouter();
  useEffect(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const peerId = new URLSearchParams(window.location.search).get("peerId");
    if (peerId) router.replace("/?peerId=" + peerId);
    else router.replace("/");
  }, []);
  return null;
}