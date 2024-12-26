"use client";

import { io, Socket } from "Socket.IO-client";
import { useEffect, useState } from "react";
import { Box, Button, TextField } from "@mui/material";
import ChatUI, { ChatMessage } from "@/components/chatui";
import dayjs from "dayjs";

const useSortedMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const addMessage = (message: ChatMessage) => {
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, message];
      const lastTenMessages = newMessages.slice(-10).sort((a, b) => dayjs(a.timestamp).diff(dayjs(b.timestamp)));
      return [...newMessages.slice(0, -10), ...lastTenMessages];
    });
  };
  return { messages, addMessage };
}

const ChatApp = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const { messages, addMessage } = useSortedMessages();

  useEffect(() => {
    if (!dataChannel) return;
    dataChannel.onclose = event => {
      console.log("Channel closed", event);
    }
    dataChannel.onmessage = event => {
      const chatMessage: ChatMessage = JSON.parse(event.data);
      addMessage({ ...chatMessage, isUser: false });
    };
    dataChannel.onopen = () => {
      console.log("Now it's open");
    }
  }, [dataChannel, addMessage, messages]);

  const [socket] = useState<Socket>(io());
  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      setIsConnected(true);

      socket.on("rtc:offer", async ({ from, payload: offer }) => {
        console.log(`received offer from ${from}: `, offer)
        await rtc.setRemoteDescription(offer);
        const answer = await rtc.createAnswer();
        await rtc.setLocalDescription(answer);
        socket.emit("rtc:answer", { to: from, payload: answer });
      })
      socket.on("rtc:answer", async ({ from, payload: answer }) => {
        console.log(`received answer from ${from}: `, answer)
        await rtc.setRemoteDescription(answer);
      })
      socket.on("rtc:ice", async ({ from, payload: candidate }) => {
        console.log(`received candidate from ${from}: `, candidate)
        candidate && await rtc.addIceCandidate(candidate);
      })
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  const [targetAddress, setTargetAddress] = useState("");
  const [rtc] = useState(new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stunserver2024.stunprotocol.org:3478" },
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun.l.google.com:5349" },
      { urls: "stun:stun1.l.google.com:3478" },
      { urls: "stun:stun1.l.google.com:5349" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:5349" },
      { urls: "stun:stun3.l.google.com:3478" },
      { urls: "stun:stun3.l.google.com:5349" },
      { urls: "stun:stun4.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:5349" }
    ],
    iceCandidatePoolSize: 10
  }));
  useEffect(() => {
    rtc.ondatachannel = event => {
      console.log("ondatachannel: ", event)
      const chatChannel = event.channel;
      setDataChannel(chatChannel);
    }
    rtc.oniceconnectionstatechange = e => {
      console.log("rtc.oniceconnectionstatechange:", e)
    };
  }, [rtc]);

  const onOfferClick = async () => {

    const chatChannel = rtc.createDataChannel("chatChannel")
    setDataChannel(chatChannel);

    rtc.onicecandidate = event => {
      event.candidate && socket.emit("rtc:ice", { to: targetAddress, payload: event.candidate });
    }

    const offer = await rtc.createOffer();
    await rtc.setLocalDescription(offer);
    socket.emit("rtc:offer", { to: targetAddress, payload: offer });
  }

  const sendMessage = async (message: string) => {
    const chatMessage = {
      avatar: "https://avatars.dicebear.com/api/avataaars/1.svg",
      text: message,
      id: messages.length,
      isUser: true,
      timestamp: dayjs().toISOString()
    }
    addMessage(chatMessage);
    dataChannel?.send(JSON.stringify(chatMessage));
  }

  return (
    <main>
      {isConnected && (
        <Box>
          <Box>
            <h1>Connected</h1>
            <div>My address: {socket?.id}</div>
            <TextField size="small" label="Target" value={targetAddress} onChange={e => setTargetAddress(e.target.value)} />
            <Button disabled={!targetAddress} onClick={onOfferClick}>Offer</Button>
          </Box>
          <ChatUI messages={messages} sendMessage={sendMessage} />
        </Box>
      )}
      {!isConnected && <h1>Connecting...</h1>}
    </main>
  )
}

export default function Home() {
  return (
    <div>
      <ChatApp />
    </div>
  );
}
