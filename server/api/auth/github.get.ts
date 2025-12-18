export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { githubClientId } = config

  if (!githubClientId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing GitHub Client ID configuration'
    })
  }
  
  console.log('[Auth] Starting GitHub OAuth flow with Client ID:', githubClientId)

  
  const baseUrl = config.baseUrl
  const redirectUri = `${baseUrl}/api/auth/callback`

  
  const state = Buffer.from(JSON.stringify({ provider: 'github' })).toString('base64')

  console.log('[Auth] Redirect URI:', redirectUri)

  const githubAuthUrl = `https://github.com/login/oauth/authorize?` + new URLSearchParams({
    client_id: githubClientId,
    scope: 'repo',
    redirect_uri: redirectUri,
    prompt: 'consent',
    state
  }).toString()
  
  return sendRedirect(event, githubAuthUrl)
})
