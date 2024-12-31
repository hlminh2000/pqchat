import { handleAuth, handleLogout } from '@auth0/nextjs-auth0';

export const runtime = "edge";

export const GET = handleAuth({
  logout: handleLogout((req) => {
    return { returnTo: '/' };
  })
});
