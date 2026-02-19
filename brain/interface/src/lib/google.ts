import { OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma";

export function createOAuth2Client(): OAuth2Client {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function fetchGoogleUserProfile(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Google user profile");
  }

  return response.json() as Promise<{
    id: string;
    email: string;
    name: string;
    picture: string;
  }>;
}

export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date() >= expiresAt;
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const tokens = await prisma.gmailTokens.findUnique({
    where: { userId },
  });

  if (!tokens) {
    throw new Error("No Gmail tokens found for user");
  }

  if (!isTokenExpired(tokens.expiresAt)) {
    return tokens.accessToken;
  }

  // Token expired — refresh it
  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: tokens.refreshToken });

  const { token } = await client.getAccessToken();

  if (!token) {
    throw new Error("Failed to refresh Gmail access token");
  }

  // Google access tokens typically expire in 1 hour
  const newExpiresAt = new Date(Date.now() + 3600 * 1000);

  await prisma.gmailTokens.update({
    where: { userId },
    data: {
      accessToken: token,
      expiresAt: newExpiresAt,
    },
  });

  return token;
}
