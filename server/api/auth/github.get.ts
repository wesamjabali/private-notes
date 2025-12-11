export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { githubClientId } = config

  if (!githubClientId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing GitHub Client ID configuration'
    })
  }
  
  console.log('[Auth] Starting OAuth flow with Client ID:', githubClientId)

  // Determine the base URL dynamically or fallback to localhost
  const requestUrl = getRequestURL(event)
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
  const redirectUri = `${baseUrl}/api/auth/callback`

  console.log('[Auth] Redirect URI:', redirectUri)

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&scope=repo&redirect_uri=${encodeURIComponent(redirectUri)}&prompt=consent`
  
  return sendRedirect(event, githubAuthUrl)
})
