"use client";

import { io, Socket } from "Socket.IO-client";
import { ReactNode, useEffect, useState } from "react";
import { AppBar, Box, Button, styled, Toolbar } from "@mui/material";
import ChatUI, { ChatMessage } from "@/components/chatui";
import dayjs from "dayjs";
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { InfoButton } from "@/components/InfoButton";

const dummyMessages = [
  {
    avatar: "",
    id: crypto.randomUUID(),
    isUser: true,
    timestamp: dayjs().toISOString(),
    text: `
some code:
\`\`\`javascript
console.log("asdf")
console.log("asdf")
\`\`\`
    `
  },
  {
    avatar: "",
    id: crypto.randomUUID(),
    isUser: false,
    timestamp: dayjs().toISOString(),
    text: `
some code:
\`\`\`javascript
console.log("asdf")
console.log("asdf")
\`\`\`
    `
  },
]

const useSortedMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    ...dummyMessages
  ]);
  const addMessage = (message: ChatMessage) => {
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, message];
      const lastTenMessages = newMessages.slice(-10).sort((a, b) => dayjs(a.timestamp).diff(dayjs(b.timestamp)));
      return [...newMessages.slice(0, -10), ...lastTenMessages];
    });
  };
  return { messages, addMessage };
}

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "#ffffff",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
}));


const ChatApp = () => {

  const { logout, user, isLoading: isLoadingUser } = useAuth0();
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const { messages, addMessage } = useSortedMessages();

  useEffect(() => {
    console.log("dataChannel: ", dataChannel)
    if (!dataChannel) return;
    if (dataChannel.readyState === "open") setIsDataChannelOpen(true);

    dataChannel.onclose = event => {
      setIsDataChannelOpen(false);
      console.log("Channel closed", event);
    }
    dataChannel.onmessage = event => {
      const chatMessage: ChatMessage = JSON.parse(event.data);
      addMessage({ ...chatMessage, isUser: false });
    };
    dataChannel.onopen = () => {
      setIsDataChannelOpen(true);
      console.log("Now it's open");
    }
  }, [dataChannel, addMessage, messages, setIsDataChannelOpen]);

  const urlParams = new URLSearchParams(window.location.search);
  const peerId = urlParams.get("peerId");
  const [socket] = useState<Socket>(io());
  useEffect(() => {
    const onConnect = () => {
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

      
      !!peerId && initiateOffer(peerId)
      setIsSocketConnected(true);
    }

    const initiateOffer = async (peerId: string) => {
      setDataChannel(rtc.createDataChannel("chatChannel"))

      rtc.onicecandidate = event => {
        event.candidate && socket.emit("rtc:ice", { to: peerId, payload: event.candidate });
      }

      const offer = await rtc.createOffer();
      await rtc.setLocalDescription(offer);
      socket.emit("rtc:offer", { to: peerId, payload: offer });
    }

    function onDisconnect() {
      setIsSocketConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  const [rtc] = useState(new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stunserver2024.stunprotocol.org:3478" },
      { urls: "stun:stun.l.google.com:19302" },
      // { urls: "stun:stun.l.google.com:5349" },
      // { urls: "stun:stun1.l.google.com:3478" },
      // { urls: "stun:stun1.l.google.com:5349" },
      // { urls: "stun:stun2.l.google.com:19302" },
      // { urls: "stun:stun2.l.google.com:5349" },
      // { urls: "stun:stun3.l.google.com:3478" },
      // { urls: "stun:stun3.l.google.com:5349" },
      // { urls: "stun:stun4.l.google.com:19302" },
      // { urls: "stun:stun4.l.google.com:5349" }
    ],
    iceCandidatePoolSize: 1
  }));
  useEffect(() => {
    rtc.ondatachannel = event => {
      console.log("rtc.ondatachannel: ", event)
      setDataChannel(event.channel);
    }
    rtc.oniceconnectionstatechange = event => {
      console.log("rtc.oniceconnectionstatechange:", event)
    };
  }, [rtc, setDataChannel]);

  const sendMessage = async (message: string) => {
    const chatMessage = {
      id: crypto.randomUUID(),
      avatar: user?.picture || "",
      text: message,
      isUser: true,
      timestamp: dayjs().toISOString()
    }
    addMessage(chatMessage);
    dataChannel?.send(JSON.stringify(chatMessage));
  }

  const sessionUrl = `${window.location.origin}/?peerId=${socket?.id}`;

  return (
    <main>
      {isSocketConnected && (
        <Box p={0} display={"flex"} flexDirection={"column"} height={"100vh"}>
          <StyledAppBar position="sticky">
            <Toolbar variant="dense">
              <Box flex={1}>
                {!peerId && <InfoButton sessionUrl={sessionUrl} />}
              </Box>
              <Box flex={1}></Box>
              {!isLoadingUser && !!user && <Button size="small" onClick={async () => {
                await logout()
              }}>Logout</Button>}
            </Toolbar>
          </StyledAppBar>
          <ChatUI messages={messages} sendMessage={sendMessage} enabled={isDataChannelOpen} />
        </Box>
      )}
      {!isSocketConnected && <h1>Connecting...</h1>}
    </main>
  )
}

const Login = ({ children }: { children: ReactNode }) => {
  const { loginWithRedirect, logout, user, isLoading } = useAuth0();

  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect()
  }, [user, isLoading]);

  if (isLoading) return <h1>Loading...</h1>
  return (
    <Box>
      {!isLoading && !!user && children}
    </Box>
  )
}

export default function Home() {

  const [win, setWindow] = useState<Window>();
  useEffect(() => {
    if (!win) setWindow(window)
  }, [win]);
  const peerId = win && new URLSearchParams(win.location.search).get("peerId");

  return (
    win && <Auth0Provider
      domain="dev-48o35gs7coyf2b7q.us.auth0.com"
      clientId="9oVYYrTOPB4nkUcCFv1AkD99UacrXKqH"
      onRedirectCallback={() => {
        console.log("onRedirectCallback")
      }}
      authorizationParams={{
        redirect_uri: peerId
          ? `${win?.location.origin}/?peerId=${peerId}`
          : `${win?.location.origin}/`
      }}
    >
      <Login>
        <ChatApp />
      </Login>
    </Auth0Provider>
  );
}
