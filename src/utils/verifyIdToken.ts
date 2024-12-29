import { IdToken } from '@auth0/auth0-react';
import IdTokenVerifier from 'idtoken-verifier';
import { jwtDecode } from 'jwt-decode';

const verifier = new IdTokenVerifier({
  issuer: `https://dev-48o35gs7coyf2b7q.us.auth0.com/`,
  audience: `9oVYYrTOPB4nkUcCFv1AkD99UacrXKqH`,
  jwksURI: `https://dev-48o35gs7coyf2b7q.us.auth0.com/.well-known/jwks.json`
});

export const verifyIdToken = (idToken: string) => new Promise<{
  payload: IdToken, 
  valid: boolean
}>(
  (resolve) => verifier.verify(idToken, (error: Error | null, payload: any) => {
    const data: IdToken = jwtDecode(idToken)
    if (error) {
      console.log("error: ", error)
      return resolve({ payload: data, valid: false});
    }
    return resolve({ payload: data, valid: true });
  })
);
