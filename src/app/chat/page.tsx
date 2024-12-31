
// import { ChatPage } from "./components";
import ChatPage from "./components";
import { withPageAuthRequired, getSession } from '@auth0/nextjs-auth0';

export default withPageAuthRequired(async ({ searchParams }) => {
  const session = await getSession()
  return (
    <ChatPage
      // @ts-ignore
      session={{ ...session }}
      peerId={searchParams?.peerId as string}
    />
  )
}, { 
  returnTo: ({ searchParams }) => {
    const peerId = searchParams?.peerId
    return peerId ? `/chat?peerId=${peerId}` : '/chat' 
  }
})
