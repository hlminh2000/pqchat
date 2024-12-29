import { handleAuth, NextAppRouterHandler } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

export const GET = async (req: Request, { params }: { params: Promise<{ auth0: "me" | "login" | "logout" | "callback" }>}) => {
  const hander = handleAuth()
  const { auth0 } = await params
  if (auth0 === "me") {
    const result: Response = await hander(req, { params })
    const data = JSON.parse(new TextDecoder().decode((await result.body?.getReader().read())?.value))
    return Response.json(data)
  } else if ( auth0 === "login") {
    const result: Response = await hander(req, { params })
    
    console.log("result:", result)
    return result
  }
  return hander(req, { params })
};


// export const GET = handleAuth({
//   "me": (async (req, { params }) => {
//     const handler = handleAuth();
//     const result: NextResponse = await handler(req, { params })
//     console.log("result:", result)
//     const data = await result.json()
//     console.log("data:", data)
//     // const data = JSON.parse(new TextDecoder().decode((await result.body?.getReader().read())?.value))
//     return Response.json(data)
//   }) as NextAppRouterHandler
// });
