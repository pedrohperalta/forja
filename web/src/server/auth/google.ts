export type GoogleProfile = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
}

export type GoogleOAuthClient = {
  getProfile(code: string): Promise<GoogleProfile>
}

export type GoogleOAuthClientEnv = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  FORJA_PUBLIC_URL: string
}

export function createGoogleOAuthClient(
  env: GoogleOAuthClientEnv,
): GoogleOAuthClient {
  return {
    async getProfile(code: string): Promise<GoogleProfile> {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${env.FORJA_PUBLIC_URL}/api/auth/google/callback`,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Google OAuth token exchange failed')
      }

      const tokenPayload = (await tokenResponse.json()) as {
        access_token?: string
      }
      if (!tokenPayload.access_token) {
        throw new Error('Google OAuth token exchange failed')
      }

      const profileResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { authorization: `Bearer ${tokenPayload.access_token}` },
        },
      )

      if (!profileResponse.ok) {
        throw new Error('Google profile fetch failed')
      }

      const profile = (await profileResponse.json()) as {
        id?: string
        email?: string
        name?: string
        picture?: string
      }
      if (!profile.id || !profile.email || !profile.name) {
        throw new Error('Google profile fetch failed')
      }

      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture ?? null,
      }
    },
  }
}
