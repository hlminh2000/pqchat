"use client";

import dynamic from 'next/dynamic'
import { ReactNode, useEffect, useState } from "react";
import { AppBar, Box, Button, CircularProgress, Container, Stack, styled, Toolbar, Typography } from "@mui/material";
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
import { b64ToUintArray, sharedSecretToCryptoKey, uintArrayToB64 } from '@/common/utils/pqcCryptoUtils';
import { Session, withPageAuthRequired } from '@auth0/nextjs-auth0';
import { UserProvider, useUser } from '@auth0/nextjs-auth0/client';
import { resolve } from 'path';

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

const ChatApp = ({ session, peerId }: { session: Session, peerId?: string }) => {
  const isHost = !peerId

  // const { user,  } = useAuth0();
  const { user, isLoading: isLoadingUser } = useUser();

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const { messages, addMessage } = useSortedMessages();

  /********************************************/
  /**** Key exchange state transformations ****/
  /********************************************/
  const [mlKem] = useState(new MlKem1024());
  const [kemKeypair] = useState<Promise<[Uint8Array<ArrayBufferLike>, Uint8Array<ArrayBufferLike>]>>(mlKem.generateKeyPair())
  const [kemCt, setKemCt] = useState<Uint8Array<ArrayBufferLike> | null>(null)
  const [peerPk, setPeerPk] = useState<Uint8Array<ArrayBufferLike> | null>(null)
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null)

  useEffect(() => {
    (async () => {
      if (!peerPk) return
      if (isHost) {
        const [ct, ss] = await mlKem.encap(peerPk);
        console.log("ss: ", ss)
        setKemCt(ct)
        setAesKey(await sharedSecretToCryptoKey(ss))
        await sendRtcMessage({ type: "sharedSecret", data: { kemCt: uintArrayToB64(ct) } })
      }
    })()
  }, [peerPk])

  useEffect(() => {
    (async () => {
      if (!peerPk || !kemCt) return
      if (!isHost) {
        const [pk, sk] = await kemKeypair
        const ss = await mlKem.decap(kemCt, sk);
        console.log("ss: ", ss)
        setAesKey(await sharedSecretToCryptoKey(ss))
      }
    })()
  }, [peerPk, kemCt])
  /**********************************************/
  /**********************************************/

  type SerializedRtcMessage = { type: "pk", data: { pk: string } }
    | { type: "sharedSecret", data: { kemCt: string } }  // encrypted cipher
    | { type: "chat", data: EncryptedData }
  type RtcMessage = { type: "pk", data: { pk: string } }
    | { type: "sharedSecret", data: { kemCt: string } }
    | { type: "chat", data: ChatMessage }
  const sendRtcMessage = async (data: RtcMessage) => {
    if (!dataChannel) return
    let message = ''
    if (data.type === "pk") {
      message = JSON.stringify(data)
    } else if (data.type === "chat" && aesKey) {
      const encryptedChatMessage = await symCryptoUtil.encrypt(JSON.stringify(data.data), aesKey)
      message = JSON.stringify({ ...data, data: encryptedChatMessage })
    } else if (data.type === "sharedSecret") {
      message = JSON.stringify(data)
    }
    console.log("sending RTC message: ", message)
    message && dataChannel.send(message)
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
      setPeerPk(() => b64ToUintArray(pk))
    } else if (rtcMessage.type === "chat" && aesKey) {
      const decryptedChatMessage = JSON.parse(await symCryptoUtil.decrypt(rtcMessage.data, aesKey)) as ChatMessage
      console.log("decryptedChatMessage: ", decryptedChatMessage)
      addMessage({ ...decryptedChatMessage, isUser: false });
    } else if (rtcMessage.type === "sharedSecret") {
      const { kemCt } = rtcMessage.data
      setKemCt(() => b64ToUintArray(kemCt))
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
  }, [dataChannel, addMessage, handleChannelOpen]);

  const [selfId] = useState(crypto.randomUUID())
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

      const waitForIceCandidates = async (peerId: string) => {
        // setRemoteDescription has to be called before addIceCandidate
        const pendingOffer = pendingOffers[peerId];
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            console.log("pendingOffer: ", pendingOffer)
            if (pendingOffer.iceCandidates.at(-1) === null) {
              resolve()
              clearInterval(check)
            }
          }, 1000)
        })
        pendingOffer.offer && await rtc.setRemoteDescription(pendingOffer.offer as RTCSessionDescriptionInit)
        for (const candidate of pendingOffer.iceCandidates) {
          console.log("candidate: ", candidate)
          if (candidate) await rtc.addIceCandidate(candidate)
        }
      }

      switch (name as "rtc:offer" | "rtc:answer" | "rtc:ice" | "rtc:deny") {
        case "rtc:offer": {
          const { offer, idToken } = payload;
          const { valid, payload: userData } = await verifyIdToken(idToken)
          // const issuedAt = dayjs((userData?.iat || 0) * 1000)
          // if (issuedAt.isBefore(dayjs().subtract(1, "hour"))) {
          //   console.log("identity too old")
          //   return
          // }
          if (!valid) return

          const { nickname, email } = userData

          toast(
            ({ closeToast }) => {
              const [loading, setLoading] = useState(false);
              return (
                <Stack flex={1}>
                  <Box>{email || nickname || ""} would like to connect</Box>
                  <Box mt={1} display={"flex"} justifyContent={"flex-end"}>
                    <Button
                      size='small' variant='outlined'
                      disabled={loading}
                      // @ts-ignore
                      color='primary.contrastText'
                      onClick={async () => {
                        setLoading(true)
                        pendingOffers[from].offer = offer
                        await waitForIceCandidates(from);
                        const answer = await rtc.createAnswer();
                        const idToken = session?.idToken
                        await rtc.setLocalDescription(answer);
                        targetAblyChannel.publish("rtc:answer", { from, payload: { answer, idToken } })
                        setOtherUser(userData)
                        closeToast();
                      }}>Accept</Button>
                    <Box mr={1}></Box>
                    <Button
                      size='small' variant='text'
                      disabled={loading}
                      // @ts-ignore
                      color='primary.contrastText'
                      onClick={async () => {
                        targetAblyChannel.publish("rtc:deny", { from })
                        closeToast();
                      }}>Deny</Button>
                    {loading && <CircularProgress color="inherit" />}
                  </Box>
                </Stack>
              )
            },
            { autoClose: false, closeButton: () => null }
          )
          break;
        }
        case "rtc:answer":
          console.log(`received answer from ${from}: `, payload)
          const { answer, idToken } = payload;
          const { valid, payload: userData } = await verifyIdToken(idToken)
          if (!valid) return
          setOtherUser(userData)
          await rtc.setRemoteDescription(answer);
          break;

        case "rtc:ice":
          console.log(`received candidate from ${from}: `, payload)
          if(isHost){
            pendingOffers[from].iceCandidates.push(payload)
            await waitForIceCandidates(from)
          } else {
            payload && await rtc.addIceCandidate(payload)
          }
          break;

        case "rtc:deny":
          toast.error("Your connection request was denied.")
          break;
      }
    }

    const init = async () => {
      const peerSignalingChannel = ablyClient.channels.get(`signaling:${peerId}`)
      rtc.onicecandidate = async event => {
        await peerSignalingChannel.publish("rtc:ice", { from: selfId, payload: event.candidate });
      }
      if (!isHost) {

        setDataChannel(rtc.createDataChannel("chatChannel"))

        const offer = await rtc.createOffer();
        await rtc.setLocalDescription(offer);
        const idToken = session?.idToken
        await peerSignalingChannel.publish("rtc:offer", { from: selfId, payload: { offer, idToken } });
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

  const sessionUrl = typeof window === "undefined" ? "/chat" : `${window.location.origin}/chat?peerId=${selfId}`;

  const isChatReady = isDataChannelOpen && !!aesKey
  return (
    <main>
      <Box p={0} display={"flex"} flexDirection={"column"} height={"100vh"}>
        <StyledAppBar position="sticky">
          <Toolbar variant="dense">
            <Box flex={1} display="flex" flexDirection={{ xs: "row" }} alignItems="center">
              {isSocketConnected && isHost && (
                <Box mr={{ xs: 0, sm: 2 }} display={"inline"}>
                  <InfoButton sessionUrl={sessionUrl} />
                </Box>
              )}
              <a href='/chat' target='_blank'>
                <Button variant='contained' startIcon={<AddCircleOutline />}>
                  New Chat
                </Button>
              </a>
            </Box>
            <Box flex={1} display={{ xs: "none", sm: "block" }}></Box>
            {!isLoadingUser && (
              <a href='/api/auth/logout'>
                <Button variant="outlined" color='primary'>Logout</Button>
              </a>
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

export function ChatPage({ session, peerId }: { session: Session, peerId?: string }) {
  return (
    <UserProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastContainer theme='dark' />
          <ChatApp session={session} peerId={peerId} />
        </AuthProvider>
      </ThemeProvider>
    </UserProvider>
  );
}

export default dynamic(() => Promise.resolve(ChatPage), {
  ssr: false
})
