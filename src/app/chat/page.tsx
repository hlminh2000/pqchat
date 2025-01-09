
import { ChatPage } from "./components";
import { withPageAuthRequired, getSession } from '@auth0/nextjs-auth0';
import fetch from 'node-fetch';
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic';

export default withPageAuthRequired(async ({ searchParams }) => {
  const session = await getSession()

  const apiKey = process.env.METERED_API_KEY;
  const url = new URL('https://minhified-pqchat.metered.live/api/v1/turn/credentials');
  url.searchParams.append('apiKey', apiKey as string);

  const iceServers = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(res => res.json() as Promise<{
      urls: string,
      username?: string,
      credential?: string,
    }[]>)
    .catch(err => []);

  const headersList = await headers();
  const host = headersList.get('X-Forwarded-Host');
  const proto = headersList.get('X-Forwarded-Proto');
  const origin = `${proto}://${host}`;

  return (
    <ChatPage
      // @ts-ignore
      session={{ ...session }}
      peerId={(await searchParams)?.peerId as string}
      iceServers={iceServers}
      origin={origin}
    />
  )
}, {
  returnTo: async ({ searchParams }) => {
    const peerId = (await searchParams)?.peerId
    return peerId ? `/chat?peerId=${peerId}` : '/chat'
  }
})
