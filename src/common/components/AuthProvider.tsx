import { Auth0Provider } from "@auth0/auth0-react";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => (
  <Auth0Provider
    domain="dev-48o35gs7coyf2b7q.us.auth0.com"
    clientId="9oVYYrTOPB4nkUcCFv1AkD99UacrXKqH"
    authorizationParams={{
      redirect_uri: window ? `${window.location.origin}/chat` : ""
    }}
  >
    {children}
  </Auth0Provider>
)