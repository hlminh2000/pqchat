"use client";
import dynamic from 'next/dynamic'

import { io, Socket } from "Socket.IO-client";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { AppBar, Box, Button, Stack, styled, Toolbar } from "@mui/material";
import ChatUI, { ChatMessage } from "@/components/chatui";
import dayjs from "dayjs";
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { InfoButton } from "@/components/InfoButton";
import { AsymetricCryptoUtilsImpl } from "@/utils/AsymetricCryptoUtil";
import { dummyMessages } from "@/utils/dummy";
import { EncryptedData, SymmetricCryptoUtils } from "@/utils/SymmetricCryptoUtil";
import { ToastContainer, toast } from 'react-toastify';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "#ffffff",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
}));

const useSortedMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    // ...dummyMessages
  ]);
  const addMessage = (message: ChatMessage) => {
    // heuristically, just sort the last 10 mesasges, previous ones are assumed sorted
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, message];
      const lastTenMessages = newMessages.slice(-10).sort((a, b) => dayjs(a.timestamp).diff(dayjs(b.timestamp)));
      return [...newMessages.slice(0, -10), ...lastTenMessages];
    });
  };
  return { messages, addMessage };
}

const asymCryptoUtil = new AsymetricCryptoUtilsImpl();
const symCryptoUtil = new SymmetricCryptoUtils();

const useAsymKeypairs = () => {
  const [keys, setKeys] = useState<Awaited<ReturnType<typeof asymCryptoUtil.generateRSAKeyPair>> | null>(null)
  const regenerate = async () => {
    setKeys(await asymCryptoUtil.generateRSAKeyPair())
  }
  useEffect(() => {
    regenerate()
  }, [])
  return { keys, regenerate }
}

const ChatApp = () => {

  const urlParams = new URLSearchParams(window.location.search);
  const peerId = urlParams.get("peerId");

  const { logout, user, isLoading: isLoadingUser } = useAuth0();
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const { messages, addMessage } = useSortedMessages();

  const keypair = useAsymKeypairs();
  const [peerPk, setPeerPk] = useState<CryptoKey | null>(null);

  const [sharedSecret, setSymKey] = useState<CryptoKey | null>(null)

  type SerializedRtcMessage = { type: "pk", data: JsonWebKey }
    | { type: "sharedSecret", data: string }  // encrypted cipher
    | { type: "chat", data: EncryptedData }
  type RtcMessage = { type: "pk", data: JsonWebKey }
    | { type: "sharedSecret", data: JsonWebKey }
    | { type: "chat", data: ChatMessage }
  const sendRtcMessage = async (data: RtcMessage) => {
    if (!dataChannel) return
    if (data.type === "pk") {
      dataChannel.send(JSON.stringify(data))
    } else if (data.type === "chat" && sharedSecret) {
      const encryptedChatMessage = await symCryptoUtil.encrypt(JSON.stringify(data.data), sharedSecret)
      dataChannel.send(JSON.stringify({ ...data, data: encryptedChatMessage }))
    } else if (data.type === "sharedSecret" && peerPk) {
      const encryptedSymKey = await asymCryptoUtil.encrypt(JSON.stringify(data.data), peerPk)
      dataChannel.send(JSON.stringify({ ...data, data: encryptedSymKey }))
    }
  }

  /** When the peerkPk is available, optionally generate and send shared secret **/
  useEffect(() => {
    (async () => {
      if (!peerId && !!peerPk){  // Elect the host to establish shared symetric key
        const symKey = await symCryptoUtil.generateKey()
        setSymKey(symKey.key)
        sendRtcMessage({ 
          type: "sharedSecret", 
          data: symKey.exportedKey
        })
      }
    })()
  }, [peerPk])
  /********************************************************************************/

  const handleChannelOpen = () => {
    const keys = keypair.keys
    if (!keys) return

    sendRtcMessage({ type: "pk", data: keys.publicKeyJwk })
    setIsDataChannelOpen(true);
    toast.info("The session has started")
  }
 
  useEffect(() => {
    if (dataChannel?.readyState === "open") {
      handleChannelOpen()
    }
  }, [dataChannel])

  useEffect(() => {
    if (!dataChannel) return;

    dataChannel.onclose = event => {
      setIsDataChannelOpen(false);
      toast.info(`${otherUser} has left`)
    }
    dataChannel.onmessage = async event => {
      console.log("rtc message: ", event.data)
      const rtcMessage: SerializedRtcMessage = JSON.parse(event.data);
      const privateKey = keypair.keys?.privateKey
      if (rtcMessage.type === "pk") {
        const cryptoKey = await asymCryptoUtil.importRSAKey(rtcMessage.data)
        setPeerPk(cryptoKey)
      } else if (rtcMessage.type === "chat" && sharedSecret) {
        const decryptedChatMessage = JSON.parse(await symCryptoUtil.decrypt(rtcMessage.data, sharedSecret)) as ChatMessage
        addMessage({ ...decryptedChatMessage, isUser: false });
      } else if (rtcMessage.type === "sharedSecret" && privateKey) {
        const decryptedSharedSecret = JSON.parse(await asymCryptoUtil.decrypt(rtcMessage.data, privateKey)) as JsonWebKey
        const symetricKey = await symCryptoUtil.importKey(decryptedSharedSecret)
        setSymKey(symetricKey)
      }
    };
    dataChannel.onopen = () => {
      handleChannelOpen()
    }
  }, [dataChannel, addMessage, setPeerPk, setSymKey, setIsDataChannelOpen, handleChannelOpen]);

  const [socket] = useState<Socket>(io());
  const [rtc] = useState(new RTCPeerConnection({
    iceServers: [
      // { urls: "stun:stunserver2024.stunprotocol.org:3478" },
      // { urls: "stun:stun.l.google.com:19302" },
      // { urls: "stun:stun.l.google.com:5349" },
      { urls: "stun:stun1.l.google.com:3478" },
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

  const [otherUser, setOtherUser] = useState<string | null>(null);
  useEffect(() => {
    const onConnect = () => {
      socket.on("rtc:offer", async ({ from, payload: { offer, email } }) => {
        await rtc.setRemoteDescription(offer);
        toast(
          ({ closeToast })=> (
            <Stack>
              <Box>{email} would like to connect</Box>
              <Box display={"flex"} justifyContent={"flex-end"}>
                <Button size='small' variant='outlined' color='success' onClick={async () => {
                  console.log("offer: ", offer)
                  const answer = await rtc.createAnswer();
                  await rtc.setLocalDescription(answer);
                  socket.emit("rtc:answer", { to: from, payload: answer });
                  setOtherUser(email)
                  closeToast();
                }}>Accept</Button>
                <Box mr={1}></Box>
                <Button size='small' variant='outlined' color='error' onClick={async () => {
                  socket.emit("rtc:deny", { to: from });
                  closeToast();
                }}>Deny</Button>
              </Box>
            </Stack>
          ),
          { autoClose: false, closeButton: () => null }
        )
      })
      socket.on("rtc:answer", async ({ from, payload: answer }) => {
        console.log(`received answer from ${from}: `, answer)
        await rtc.setRemoteDescription(answer);
      })
      socket.on("rtc:ice", async ({ from, payload: candidate }) => {
        console.log(`received candidate from ${from}: `, candidate)
        candidate && await rtc.addIceCandidate(candidate);
      })
      socket.on("rtc:deny", async () => {
        toast.error("Your connection request was denied.")
      })

      !!peerId && initiateIceOffer(peerId)
      setIsSocketConnected(true);
    }

    const initiateIceOffer = async (peerId: string) => {
      setDataChannel(rtc.createDataChannel("chatChannel"))

      rtc.onicecandidate = event => {
        event.candidate && socket.emit("rtc:ice", { to: peerId, payload: event.candidate });
      }

      const offer = await rtc.createOffer();
      socket.emit("rtc:offer", { to: peerId, payload: { offer, email: user?.email } });
      await rtc.setLocalDescription(offer);
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
  }, [socket, rtc]);
  useEffect(() => {
    rtc.ondatachannel = event => {
      console.log("rtc.ondatachannel: ", event)
      setDataChannel(event.channel)
    }
    rtc.oniceconnectionstatechange = event => {
      console.log("rtc.oniceconnectionstatechange:", event)
    };
  }, [rtc, setDataChannel]);

  const sendChatMessage = async (message: string) => {
    const chatMessage = {
      id: crypto.randomUUID(),
      avatar: user?.picture || "",
      text: message,
      isUser: true,
      timestamp: dayjs().toISOString()
    }
    if (dataChannel?.readyState === "open") {
      sendRtcMessage({ type: "chat", data: chatMessage })
      addMessage(chatMessage);
    }
  }

  const sessionUrl = `${window.location.origin}/?peerId=${socket?.id}`;

  // console.log("====================")
  // console.log("isDataChannelOpen: ", isDataChannelOpen)
  // console.log("peerPk: ", peerPk)
  // console.log("keypair.keys: ", keypair.keys)
  // console.log("sharedSecret: ", sharedSecret)
  // console.log("isDataChannelOpen && !!peerPk && !!keypair.keys && !!sharedSecret: ", isDataChannelOpen && !!peerPk && !!keypair.keys && !!sharedSecret)
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
          <ChatUI 
            messages={messages}
            sendMessage={sendChatMessage}
            enabled={isDataChannelOpen && !!peerPk && !!keypair.keys && !!sharedSecret} 
          />
        </Box>
      )}
      {!isSocketConnected && <h1>Connecting...</h1>}
    </main>
  )
}

const Login = ({ children }: { children: ReactNode }) => {
  const { loginWithRedirect, user, isLoading } = useAuth0();

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

function Home() {

  const peerId = new URLSearchParams(window.location.search).get("peerId");

  return (
    <Auth0Provider
      domain="dev-48o35gs7coyf2b7q.us.auth0.com"
      clientId="9oVYYrTOPB4nkUcCFv1AkD99UacrXKqH"
      onRedirectCallback={() => {
        console.log("onRedirectCallback")
      }}
      authorizationParams={{
        redirect_uri: peerId
          ? `${window.location.origin}/?peerId=${peerId}`
          : `${window.location.origin}/`
      }}
    >
      <ToastContainer  />
      <Login>
        <ChatApp />
      </Login>
    </Auth0Provider>
  );
}

export default dynamic(() => Promise.resolve(Home), {ssr: false})
