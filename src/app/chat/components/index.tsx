"use client";

import { useEffect, useState } from "react";
import { AppBar, Box, Button, CircularProgress, Stack, styled, Toolbar } from "@mui/material";
import ChatUI, { ChatMessage } from "@/app/chat/components/chatui";
import dayjs from "dayjs";
import { IdToken } from '@auth0/auth0-react';
import { InfoButton } from "@/app/chat/components/InfoButton";
import { EncryptedData, SymmetricCryptoUtils } from "@/common/utils/SymmetricCryptoUtil";
import { ToastContainer, toast } from 'react-toastify';
import { verifyIdToken } from '@/common/utils/verifyIdToken';
import * as Ably from 'ably';
import { LoadingOverlay } from '@/app/chat/components/LoadingOverlay';
import { AddCircleOutline } from '@mui/icons-material';
import { AuthProvider } from '@/common/components/AuthProvider';
import { ThemeProvider } from '@/common/components/ThemeProvider';
import { MlKem1024 } from "mlkem";
import { b64ToUintArray, sharedSecretToCryptoKey, uintArrayToB64 } from '@/common/utils/pqcCryptoUtils';
import { Session } from '@auth0/nextjs-auth0';
import { UserProvider, useUser } from '@auth0/nextjs-auth0/client';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "#ffffff",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
}));

const symCryptoUtil = new SymmetricCryptoUtils();

const waitFor = (predicate: () => boolean) => new Promise<void>(resolve => {
  const interval = setInterval(() => {
    if (predicate()) {
      clearInterval(interval);
      resolve();
    }
  }, 500);
})

const ChatApp = ({ session, peerId, iceServers, origin }: {
  session: Session,
  origin: string,
  peerId?: string,
  iceServers: {
    urls: string,
    username?: string,
    credential?: string,
  }[]
}) => {
  const isHost = !peerId

  // const { user,  } = useAuth0();
  const { user, isLoading: isLoadingUser } = useUser();

  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    // ...dummyMessages
  ]);
  const addMessage = (message: ChatMessage) => {
    // heuristically, just sort the last 10 mesasges, previous ones are assumed sorted
    setMessages(prevMessages => {
      console.log("prevMessages: ", prevMessages)
      const newMessages = [...prevMessages, message];
      const lastTenMessages = newMessages.slice(-10).sort((a, b) => dayjs(a.timestamp).diff(dayjs(b.timestamp)));
      return [...newMessages.slice(0, -10), ...lastTenMessages];
    });
  };

  /********************************************/
  /**** Key exchange state transformations ****/
  /********************************************/
  const [mlKem] = useState(
    new MlKem1024()
  );
  const [kemKeypair] = useState<Promise<[Uint8Array<ArrayBufferLike>, Uint8Array<ArrayBufferLike>]>>(
    mlKem.generateKeyPair()
  )
  const [peerKemCt, setPeerKemCt] = useState<Uint8Array<ArrayBufferLike> | null>(null)
  const [peerPk, setPeerPk] = useState<Uint8Array<ArrayBufferLike> | null>(null)
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null)
  const [selfSecret, setSelfSecret] = useState<Uint8Array<ArrayBufferLike> | null>(null)

  useEffect(() => {
    (async () => {
      if (!peerPk) return
      const [ct, ss] = await mlKem.encap(peerPk);
      setSelfSecret(ss)
      await sendRtcMessage({ type: "sharedSecret", data: { kemCt: uintArrayToB64(ct) } })
    })()
  }, [peerPk])

  useEffect(() => {
    (async () => {
      if (!peerPk || !peerKemCt || !selfSecret) return
      const [pk, sk] = await kemKeypair
      const peerSecret = await mlKem.decap(peerKemCt, sk);
      const ss = new Uint8Array(
        isHost ? [...selfSecret, ...peerSecret] : [...peerSecret, ...selfSecret]
      )
      console.log("ss: ", ss)
      setAesKey(await sharedSecretToCryptoKey(ss))
      setIsDataChannelOpen(true);
    })()
  }, [peerPk, peerKemCt, selfSecret])
  /**********************************************/
  /**********************************************/

  const [selfId] = useState(crypto.randomUUID())
  const [otherUser, setOtherUser] = useState<IdToken | null>(null);

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

  const onRtcMessage = async (event: MessageEvent) => {
    console.log("received RTC message: ", event.data)
    const rtcMessage: SerializedRtcMessage = JSON.parse(event.data);
    if (rtcMessage.type === "pk") {
      const { pk } = rtcMessage.data
      setPeerPk(() => b64ToUintArray(pk))
    } else if (rtcMessage.type === "chat") {
      const decryptedChatMessage = JSON.parse(await symCryptoUtil.decrypt(rtcMessage.data, aesKey as CryptoKey)) as ChatMessage
      console.log("decryptedChatMessage: ", decryptedChatMessage)
      addMessage({ ...decryptedChatMessage, isUser: false });
    } else if (rtcMessage.type === "sharedSecret") {
      const { kemCt } = rtcMessage.data
      setPeerKemCt(() => b64ToUintArray(kemCt))
    }
  }
  const onRtcDatachannelClose = () => {
    setIsDataChannelOpen(false);
    toast(`${otherUser?.email || otherUser?.nickname || "The other side"} has left`)
  }
  const onRtcDatachannelOpen = async () => {
    console.log("onRtcDatachannelOpen", dataChannel)
    const [pk] = await kemKeypair
    sendRtcMessage({ type: "pk", data: { pk: uintArrayToB64(pk) } })
  }
  useEffect(() => {
    if (!dataChannel) return
    dataChannel.onmessage = onRtcMessage
    dataChannel.onclose = onRtcDatachannelClose
  }, [dataChannel, aesKey])
  useEffect(() => {
    const run = async () => {
      if (!dataChannel) return
      await waitFor(() => dataChannel?.readyState === "open")
      onRtcDatachannelOpen()
    }
    run();
  }, [dataChannel])

  /************** RTC Signaling **************/
  useEffect(() => {
    const rtc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stunserver2024.stunprotocol.org:3478" },
        { urls: "stun:stun.l.google.com:19302" },
        ...iceServers
      ],
      iceCandidatePoolSize: 1,
      iceTransportPolicy: "all"
    })

    // @ts-ignore
    window.rtc = rtc

    const ablyClient = new Ably.Realtime({ authUrl: '/api/ably' })
    const signalingChannel = ablyClient.channels.get(`signaling:${isHost ? selfId : peerId}`);

    if (isHost) {
      rtc.ondatachannel = async ({ channel: dataChannel }) => {
        setDataChannel(dataChannel)
      }
    } else {
      const dataChannel = rtc.createDataChannel("chat")
      setDataChannel(dataChannel)
    }

    rtc.onicecandidate = async (event) => {
      await signalingChannel?.publish("rtc:icecandidate", { id: selfId, candidate: event.candidate })
    }
    signalingChannel.subscribe("rtc:icecandidate", async ({ name, data }) => {
      const { id, candidate } = data
      if (id === selfId) return
      console.log(name, data)
      await waitFor(() => !!rtc.currentRemoteDescription)
      candidate && await rtc.addIceCandidate(new RTCIceCandidate(candidate))
    })
    isHost && signalingChannel.subscribe("rtc:offer", async ({ name, data }) => {
      console.log(name, data)
      const { offer, idToken } = data
      const { valid, payload: userData } = await verifyIdToken(idToken)
      if (!valid) return


      toast(
        ({ closeToast }) => {
          const [isAnsweringRtcSignal, setIsAnsweringRtcSignal] = useState(false);
          return (
            <Stack flex={1}>
              <Box>{userData.email || userData.nickname || ""} would like to connect</Box>
              <Box mt={1} display={"flex"} justifyContent={"flex-end"}>
                {!isAnsweringRtcSignal && (
                  <>
                    <Button
                      size='small' variant='outlined'
                      disabled={isAnsweringRtcSignal}
                      // @ts-ignore
                      color='primary.contrastText'
                      onClick={async () => {
                        setIsAnsweringRtcSignal(true)

                        !rtc.currentRemoteDescription && await rtc.setRemoteDescription(new RTCSessionDescription(offer))

                        const answer = await rtc.createAnswer()
                        !rtc.currentLocalDescription && await rtc.setLocalDescription(new RTCSessionDescription(answer))
                        await waitFor(() => rtc.iceGatheringState === "complete")
                        signalingChannel.publish("rtc:answer", { answer, idToken: session.idToken })

                        setOtherUser(userData)
                        closeToast();
                      }}>Accept</Button>
                    <Box mr={1}></Box>
                    <Button
                      size='small' variant='text'
                      disabled={isAnsweringRtcSignal}
                      // @ts-ignore
                      color='primary.contrastText'
                      onClick={async () => {
                        signalingChannel.publish("rtc:deny", {})
                        closeToast();
                      }}>Deny</Button>
                  </>
                )}
                {isAnsweringRtcSignal && <CircularProgress color="inherit" />}
              </Box>
            </Stack>
          )
        },
        { autoClose: false, closeButton: () => null }
      )
    })
    !isHost && signalingChannel.subscribe("rtc:answer", async ({ name, data }) => {
      console.log(name, data)
      const { answer, idToken } = data
      const { valid, payload: userData } = await verifyIdToken(idToken)
      if (!valid) return
      toast(`${userData.email || userData.nickname || "The host"} has joined`)
      setOtherUser(userData)
      !rtc.currentRemoteDescription && await rtc.setRemoteDescription(new RTCSessionDescription(answer))
    })
    !isHost && signalingChannel.subscribe("rtc:deny", async ({ name, data }) => {
      console.log(name, data)
      toast("Your request was denied", { type: "error" })
    })

    const init = async () => {
      if (!isHost) {
        const offer = await rtc.createOffer();
        !rtc.currentLocalDescription && await rtc.setLocalDescription(new RTCSessionDescription(offer))
        await signalingChannel?.publish("rtc:offer", { offer, idToken: session.idToken })
      }
    }
    init()
  }, [])
  /********************************************/


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

  const isChatReady = isDataChannelOpen && !!aesKey
  return (
    <main>
      <Box p={0} display={"flex"} flexDirection={"column"} height={"100vh"}>
        <StyledAppBar position="sticky">
          <Toolbar variant="dense">
            <Box flex={1} display="flex" flexDirection={{ xs: "row" }} alignItems="center">
              {isHost && (
                <Box mr={{ xs: 0, sm: 2 }} display={"inline"}>
                  <InfoButton sessionUrl={`${origin}/chat?peerId=${selfId}`} />
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
      <LoadingOverlay open={!isChatReady && !isHost} message={"Waiting for host to accept your request..."} />
    </main>
  )
}

export const ChatPage = ({ session, peerId, iceServers, origin }: {
  session: Session,
  origin: string,
  peerId?: string,
  iceServers: {
    urls: string,
    username?: string,
    credential?: string,
  }[]
}) => (
  <UserProvider>
    <ThemeProvider>
      <AuthProvider origin={origin}>
        <ToastContainer theme='dark' />
        <ChatApp session={session} peerId={peerId} iceServers={iceServers} origin={origin} />
      </AuthProvider>
    </ThemeProvider>
  </UserProvider>
)
