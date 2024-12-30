"use client";
import dynamic from 'next/dynamic'
import { ReactNode, useEffect, useState } from "react";
import { AppBar, Box, Button, Container, Stack, styled, Toolbar, Typography } from "@mui/material";
import ChatUI, { ChatMessage } from "@/app/chat/components/chatui";
import dayjs from "dayjs";
import { IdToken, useAuth0 } from '@auth0/auth0-react';
import { InfoButton } from "@/app/chat/components/InfoButton";
import { EncryptedData, SymmetricCryptoUtils } from "@/common/utils/SymmetricCryptoUtil";
import { ToastContainer, toast } from 'react-toastify';
import { verifyIdToken } from '@/common/utils/verifyIdToken';
import * as Ably from 'ably';
import { LoadingOverlay } from '@/app/chat/components/LoadingOverlay';
import { AddCircleOutline } from '@mui/icons-material';
import { AuthProvider } from '@/common/components/AuthProvider';
import { getPeerId } from '@/common/utils/getPeerId';
import { ThemeProvider } from '@/common/components/ThemeProvider';
import { MlKem1024 } from "mlkem";
import { b64ToUintArray, rawKeyToCryptoKey, uintArrayToB64 } from '@/common/utils/pqcCryptoUtils';

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

const symCryptoUtil = new SymmetricCryptoUtils();

const ChatApp = () => {
  const peerId = getPeerId();
  const isHost = !peerId

  const { user, isLoading: isLoadingUser, getIdTokenClaims, logout } = useAuth0();

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const { messages, addMessage } = useSortedMessages();

  /**** PQC key exchange state transformations ****/
  const [mlKem] = useState(new MlKem1024());
  const [kemKeypair] = useState<Promise<[Uint8Array<ArrayBufferLike>, Uint8Array<ArrayBufferLike>]>>(mlKem.generateKeyPair())
  const [ss, setSS] = useState<CryptoKey | null>(null)
  const [kemCt, setKemCt] = useState<Uint8Array<ArrayBufferLike> | null>(null)
  const [peerPqcPk, setPeerPqcPk] = useState<Uint8Array<ArrayBufferLike> | null>(null)

  useEffect(() => {
    (async () => {
      if (!peerPqcPk) return
      if (isHost) {
        const [ct, ss] = await mlKem.encap(peerPqcPk);
        console.log("ss: ", ss)
        setKemCt(ct)
        setSS(await rawKeyToCryptoKey(ss))
        await sendRtcMessage({ type: "sharedSecret", data: { kemCt: uintArrayToB64(ct) } })
      }
    })()
  }, [peerPqcPk, setKemCt, setSS])

  useEffect(() => {
    (async () => {
      if (!peerPqcPk || !kemCt) return
      if (!isHost) {
        const [pk, sk] = await kemKeypair
        const ss = await mlKem.decap(kemCt, sk);
        console.log("ss: ", ss)
        setSS(await rawKeyToCryptoKey(ss))
      }
    })()
  }, [peerPqcPk, kemCt, setSS])
  /**********************************************/

  type SerializedRtcMessage = { type: "pk", data: { pk: string } }
    | { type: "sharedSecret", data: { kemCt: string } }  // encrypted cipher
    | { type: "chat", data: EncryptedData }
  type RtcMessage = { type: "pk", data: { pk: string } }
    | { type: "sharedSecret", data: { kemCt: string } }
    | { type: "chat", data: ChatMessage }
  const sendRtcMessage = async (data: RtcMessage) => {
    console.log("sending RTC message: ", data)
    if (!dataChannel) return
    if (data.type === "pk") {
      dataChannel.send(JSON.stringify(data))
    } else if (data.type === "chat" && ss) {
      const encryptedChatMessage = await symCryptoUtil.encrypt(JSON.stringify(data.data), ss)
      dataChannel.send(JSON.stringify({ ...data, data: encryptedChatMessage }))
    } else if (data.type === "sharedSecret") {
      dataChannel.send(JSON.stringify(data))
    }
  }

  const handleChannelOpen = (dataChannel: RTCDataChannel) => async () => {
    console.log("channel open!")
    dataChannel.onmessage = handleDataChannelMessage
    await new Promise(resolve => setTimeout(resolve, 1000)) // wait for a second to ensure the other side is ready
    const [pk, sk] = await kemKeypair
    const pkString: string = pk ? uintArrayToB64(pk) : ""
    await sendRtcMessage({ type: "pk", data: { pk: pkString } })
    setIsDataChannelOpen(true);
  }

  const handleDataChannelMessage = async (event: MessageEvent) => {
    console.log("rtc message: ", event.data)
    const rtcMessage: SerializedRtcMessage = JSON.parse(event.data);
    if (rtcMessage.type === "pk") {
      const { pk } = rtcMessage.data
      setPeerPqcPk(b64ToUintArray(pk))
    } else if (rtcMessage.type === "chat" && ss) {
      const decryptedChatMessage = JSON.parse(await symCryptoUtil.decrypt(rtcMessage.data, ss)) as ChatMessage
      console.log("decryptedChatMessage: ", decryptedChatMessage)
      addMessage({ ...decryptedChatMessage, isUser: false });
    } else if (rtcMessage.type === "sharedSecret") {
      const { kemCt } = rtcMessage.data
      setKemCt(b64ToUintArray(kemCt))
    }
  }

  useEffect(() => {
    if (dataChannel?.readyState === "open") {
      handleChannelOpen(dataChannel)()
    }
  }, [dataChannel])

  useEffect(() => {
    if (!dataChannel) return;

    dataChannel.onclose = event => {
      setIsDataChannelOpen(false);
      toast(`${otherUser?.email || otherUser?.nickname} has left`)
    }
    dataChannel.onmessage = handleDataChannelMessage
    dataChannel.onopen = handleChannelOpen(dataChannel)
  }, [dataChannel, addMessage, setPeerPqcPk, setKemCt, setIsDataChannelOpen, handleChannelOpen]);

  const [selfId] = useState(crypto.randomUUID())
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
                  <Button size='small' variant='contained' color='primary' onClick={async () => {
                    pendingOffers[from].offer = offer
                    await attemptCompleteConnection(from);
                    const answer = await rtc.createAnswer();
                    const idToken = await getIdTokenClaims();
                    await rtc.setLocalDescription(answer);
                    targetAblyChannel.publish("rtc:answer", { from, payload: { answer, idToken } })
                    setOtherUser(userData)
                    closeToast();
                  }}>Accept</Button>
                  <Box mr={1}></Box>
                  <Button size='small' variant='outlined' color='primary' onClick={async () => {
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
          if (!valid) return
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
      if (!isHost) {
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

  const isChatReady = isDataChannelOpen && !!ss
  return (
    <main>
      <Box p={0} display={"flex"} flexDirection={"column"} height={"100vh"}>
        <StyledAppBar position="sticky">
          <Toolbar variant="dense">
            <Box flex={1}>
              {isSocketConnected && isHost && (
                <Box mr={2} display={"inline"}>
                  <InfoButton sessionUrl={sessionUrl} />
                </Box>
              )}
              <a href='/chat' target='_blank'>
                <Button variant='contained' startIcon={<AddCircleOutline />}>
                  New Chat
                </Button>
              </a>
            </Box>
            <Box flex={1}></Box>
            {!isLoadingUser && !!user && (
              <Button variant="outlined" color='primary' onClick={async () => {
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
      <LoadingOverlay open={!isSocketConnected} message={"Connecting..."} />
      <LoadingOverlay open={isSocketConnected && !isChatReady && !isHost} message={"Waiting for host to accept your request..."} />
    </main>
  )
}

const Login = ({ children }: { children: ReactNode }) => {
  const { loginWithRedirect, user, isLoading } = useAuth0();
  const peerId = getPeerId()

  const login = () => loginWithRedirect({
    authorizationParams: {
      redirect_uri: `${window.location.origin}/chat`
    },
    appState: {
      returnTo: peerId
        ? `${window.location.origin}/chat?peerId=${peerId}`
        : `${window.location.origin}/chat`
    },
  })

  if (isLoading) return <LoadingOverlay open message='Loading...' />
  if (!isLoading && !user) return (
    <Box display={"flex"} flexDirection={"column"} justifyContent={"center"} height={"100vh"}>
      <Container>
        <Box mb={2}>
          <Typography>Please log in to let your participant know who you are.</Typography>
          <Typography>We do not track your messages or who you talk to.</Typography>
        </Box>
        <Box>
          <Button onClick={login} variant='contained' color="primary">Log in</Button>
        </Box>
      </Container>
    </Box>
  )
  return (!isLoading && !!user && children);
}

function Page() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastContainer />
        <Login>
          <ChatApp />
        </Login>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default dynamic(() => Promise.resolve(Page), { ssr: false })
