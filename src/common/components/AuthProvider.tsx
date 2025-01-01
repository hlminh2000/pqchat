import { Auth0Provider } from "@auth0/auth0-react";

export const AuthProvider = ({ children, origin }: { children: React.ReactNode, origin: string }) => (
  <Auth0Provider
    domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN as string}
    clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID as string}
    authorizationParams={{
      redirect_uri: `${origin}/chat`
    }}
  >
    {children}
  </Auth0Provider>
)
