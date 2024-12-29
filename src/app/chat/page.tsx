"use client";
import dynamic from 'next/dynamic'
import { ReactNode, useEffect, useState } from "react";
import { AppBar, Box, Button, Stack, styled, Toolbar } from "@mui/material";
import ChatUI, { ChatMessage } from "@/app/chat/components/chatui";
import dayjs from "dayjs";
import { Auth0Provider, IdToken, useAuth0 } from '@auth0/auth0-react';
import { InfoButton } from "@/app/chat/components/InfoButton";
import { AsymetricCryptoUtilsImpl } from "@/utils/AsymetricCryptoUtil";
import { EncryptedData, SymmetricCryptoUtils } from "@/utils/SymmetricCryptoUtil";
import { ToastContainer, toast } from 'react-toastify';
import { verifyIdToken } from '@/utils/verifyIdToken';
import * as Ably from 'ably';
import { LoadingOverlay } from '@/app/chat/components/LoadingOverlay';
import { AddCircleOutline } from '@mui/icons-material';

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

const ChatApp = () => {

  const urlParams = new URLSearchParams(window.location.search);
  const peerId = urlParams.get("peerId");

  const { user, isLoading: isLoadingUser, getIdTokenClaims, logout } = useAuth0();

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const { messages, addMessage } = useSortedMessages();

  const [peerPk, setPeerPk] = useState<CryptoKey | null>(null);
  const [sharedSecret, setSharedSecret] = useState<CryptoKey | null>(null)
  const [asymKeyPair, setAsymKeyPair] = useState<Awaited<ReturnType<typeof asymCryptoUtil.generateRSAKeyPair>> | null>(null)


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
      if (!peerId && !!peerPk) {  // Elect the host to establish shared symetric key
        const symKey = await symCryptoUtil.generateKey()
        setSharedSecret(symKey.key)
        sendRtcMessage({
          type: "sharedSecret",
          data: symKey.exportedKey
        })
      }
    })()
  }, [peerPk, dataChannel])
  /********************************************************************************/

  const handleChannelOpen = async () => {
    console.log("channel open!")

    const keyPair = await asymCryptoUtil.generateRSAKeyPair()
    setAsymKeyPair(keyPair)
    await sendRtcMessage({ type: "pk", data: keyPair.publicKeyJwk })
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
      toast.info(`${otherUser?.email || otherUser?.nickname} has left`)
    }
    dataChannel.onmessage = async event => {
      console.log("rtc message: ", event.data)
      const rtcMessage: SerializedRtcMessage = JSON.parse(event.data);
      const privateKey = asymKeyPair?.privateKey
      if (rtcMessage.type === "pk") {
        const cryptoKey = await asymCryptoUtil.importRSAKey(rtcMessage.data)
        setPeerPk(cryptoKey)
      } else if (rtcMessage.type === "chat" && sharedSecret) {
        const decryptedChatMessage = JSON.parse(await symCryptoUtil.decrypt(rtcMessage.data, sharedSecret)) as ChatMessage
        addMessage({ ...decryptedChatMessage, isUser: false });
      } else if (rtcMessage.type === "sharedSecret" && privateKey) {
        const decryptedSharedSecret = JSON.parse(await asymCryptoUtil.decrypt(rtcMessage.data, privateKey)) as JsonWebKey
        const symetricKey = await symCryptoUtil.importKey(decryptedSharedSecret)
        setSharedSecret(symetricKey)
      }
    };
    dataChannel.onopen = () => {
      handleChannelOpen()
    }
  }, [dataChannel, addMessage, setPeerPk, setSharedSecret, setIsDataChannelOpen, handleChannelOpen]);

  const [selfId] = useState(crypto.randomUUID())
  const [rtc] = useState(new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stunserver2024.stunprotocol.org:3478" },
      // { urls: "stun:stun.l.google.com:19302" },
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

  const [otherUser, setOtherUser] = useState<IdToken | null>(null);
  useEffect(() => {
    const ablyClient = new Ably.Realtime({ authUrl: '/api/ably' })
    const signalingChannel = ablyClient.channels.get(`signaling:${selfId}`);

    // Keep track of pending offers
    const pendingOffers: {
      [k: string]: {
        offer: RTCSessionDescriptionInit | null,
        iceCandidates: RTCIceCandidate[]
      }
    } = {}

    const listener: Ably.messageCallback<Ably.InboundMessage> = async ({ data: { from, payload }, name }) => {
      const targetAblyChannel = ablyClient.channels.get(`signaling:${from}`)
      pendingOffers[from] = pendingOffers[from] || {
        offer: null,
        iceCandidates: []
      }

      const attemptCompleteConnection = async (peerId: string) => {
        // setRemoteDescription has to be called before addIceCandidate
        const pendingOffer = pendingOffers[peerId];
        if (!!pendingOffer.iceCandidates.length && !!pendingOffer.offer) {
          await rtc.setRemoteDescription(pendingOffer.offer)
          for (const candidate of pendingOffer.iceCandidates) {
            await rtc.addIceCandidate(candidate)
          }
          delete pendingOffers[peerId]
        }
      }

      switch (name as "rtc:offer" | "rtc:answer" | "rtc:ice" | "rtc:deny") {
        case "rtc:offer": {
          const { offer, idToken } = payload;
          const { valid, payload: userData } = await verifyIdToken(idToken.__raw)
          const issuedAt = dayjs((userData?.iat || 0) * 1000)
          if (issuedAt.isBefore(dayjs().subtract(1, "hour"))) {
            console.log("identity too old")
            return
          }
          if (!valid) return

          const { nickname, email } = userData

          toast(
            ({ closeToast }) => (
              <Stack flex={1}>
                <Box>{email || nickname || ""} would like to connect</Box>
                <Box mt={1} display={"flex"} justifyContent={"flex-end"}>
                  <Button size='small' variant='outlined' color='success' onClick={async () => {
                    pendingOffers[from].offer = offer
                    await attemptCompleteConnection(from);
                    const answer = await rtc.createAnswer();
                    const idtoken = await getIdTokenClaims();
                    await rtc.setLocalDescription(answer);
                    targetAblyChannel.publish("rtc:answer", { from, payload: { answer, idtoken } })
                    setOtherUser(userData)
                    closeToast();
                  }}>Accept</Button>
                  <Box mr={1}></Box>
                  <Button size='small' variant='outlined' color='error' onClick={async () => {
                    targetAblyChannel.publish("rtc:deny", { from })
                    closeToast();
                  }}>Deny</Button>
                </Box>
              </Stack>
            ),
            { autoClose: false, closeButton: () => null }
          )
          break;
        }
        case "rtc:answer":
          console.log(`received answer from ${from}: `, payload)
          const { answer, idToken } = payload;
          const { valid, payload: userData } = await verifyIdToken(idToken.__raw)
          if(!valid) return
          setOtherUser(userData)
          await rtc.setRemoteDescription(answer);
          break;

        case "rtc:ice":
          console.log(`received candidate from ${from}: `, payload)
          pendingOffers[from].iceCandidates.push(payload)
          await attemptCompleteConnection(from)
          break;

        case "rtc:deny":
          toast.error("Your connection request was denied.")
          break;
      }
    }

    const init = async () => {
      if (!!peerId) {
        const peerSignalingChannel = ablyClient.channels.get(`signaling:${peerId}`)

        setDataChannel(rtc.createDataChannel("chatChannel"))

        rtc.onicecandidate = async event => {
          event.candidate && await peerSignalingChannel.publish("rtc:ice", { from: selfId, payload: event.candidate });
        }

        const offer = await rtc.createOffer();
        await rtc.setLocalDescription(offer);
        await peerSignalingChannel.publish("rtc:offer", { from: selfId, payload: { offer, idToken: await getIdTokenClaims() } });
      }
      await signalingChannel.subscribe(listener)
      setIsSocketConnected(true)
    }

    init();

    return () => signalingChannel.unsubscribe(listener)

  }, [rtc]);


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

  const sessionUrl = `${window.location.origin}/chat?peerId=${selfId}`;

  console.log("====================")
  console.log("isDataChannelOpen: ", isDataChannelOpen)
  console.log("peerPk: ", peerPk)
  console.log("asymKeyPair: ", asymKeyPair)
  console.log("sharedSecret: ", sharedSecret)
  console.log("isDataChannelOpen && !!peerPk && !!asymKeyPair && !!sharedSecret: ", isDataChannelOpen && !!peerPk && !!asymKeyPair && !!sharedSecret)
  console.log("====================")
  const isChatReady = isDataChannelOpen && !!peerPk && !!asymKeyPair && !!sharedSecret
  return (
    <main>
      <Box p={0} display={"flex"} flexDirection={"column"} height={"100vh"}>
        <StyledAppBar position="sticky">
          <Toolbar variant="dense">
            <Box flex={1}>
              {isSocketConnected && !peerId && (
                <Box mr={2} display={"inline"}>
                  <InfoButton sessionUrl={sessionUrl} />
                </Box>
              )}

              <a href='/chat' target='_blank'><Button variant='outlined' size="small" startIcon={<AddCircleOutline />}>New Chat</Button></a>
            </Box>
            <Box flex={1}></Box>
            {!isLoadingUser && !!user && (
              <Button size="small" onClick={async () => {
                await logout({ logoutParams: { returnTo: window.location.origin } })
              }}>Logout</Button>
            )}
          </Toolbar>
        </StyledAppBar>
        <ChatUI
          messages={messages}
          sendMessage={sendChatMessage}
          enabled={isChatReady}
        />
      </Box>
      <LoadingOverlay open={!isSocketConnected} message={"Connecting"} />
      <LoadingOverlay open={isSocketConnected && !isChatReady && !!peerId} message={"Waiting for host to accept your request"} />
    </main>
  )
}

const Login = ({ children }: { children: ReactNode }) => {
  const { loginWithRedirect, user, isLoading } = useAuth0();

  useEffect(() => {
    console.log("isLoading: ", isLoading)
    console.log("user: ", user)
    if (!isLoading && !user) loginWithRedirect({
      authorizationParams: { redirect_uri: `${window.location.origin}/chat` }
    })
  }, [user, isLoading]);

  if (isLoading) return <LoadingOverlay open message='Logging in' />
  return (!isLoading && !!user && children)
}

function Page() {

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
          ? `${window.location.origin}/chat?peerId=${peerId}`
          : `${window.location.origin}/chat`
      }}
    >
      <ToastContainer />
      <Login>
        <ChatApp />
      </Login>
    </Auth0Provider>
  );
}

export default dynamic(() => Promise.resolve(Page), { ssr: false })
