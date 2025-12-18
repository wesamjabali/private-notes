export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { gitlabClientId } = config
  const query = getQuery(event)

  if (!gitlabClientId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing GitLab Client ID configuration'
    })
  }

  
  const baseUrl = (query.base_url as string) || config.public.gitlabBaseUrl || 'https://gitlab.com'
  
  console.log('[Auth] Starting GitLab OAuth flow with base URL:', baseUrl)

  const redirectUri = `${config.baseUrl}/api/auth/callback`
  
  
  const state = Buffer.from(JSON.stringify({ 
    provider: 'gitlab', 
    baseUrl 
  })).toString('base64')

  console.log('[Auth] GitLab Redirect URI:', redirectUri)

  
  
  const gitlabAuthUrl = `${baseUrl}/oauth/authorize?` + new URLSearchParams({
    client_id: gitlabClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read_user api read_repository write_repository',
    state
  }).toString()
  
  return sendRedirect(event, gitlabAuthUrl)
})
