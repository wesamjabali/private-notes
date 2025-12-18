export default defineEventHandler(async (event) => {
  console.log('[Auth] Callback route hit:', event.node.req.url)
  const config = useRuntimeConfig(event)
  const query = getQuery(event)
  const code = query.code as string
  const stateParam = query.state as string
  const error = query.error as string
  const errorDescription = query.error_description as string

  
  if (error) {
    const params = new URLSearchParams()
    params.set('error', error)
    if (errorDescription) params.set('error_description', errorDescription)
    return sendRedirect(event, `/?${params}`)
  }

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing code parameter'
    })
  }

  
  let provider = 'github'
  let gitlabBaseUrl = config.public.gitlabBaseUrl || 'https://gitlab.com'

  if (stateParam) {
    try {
      const state = JSON.parse(Buffer.from(stateParam, 'base64').toString())
      provider = state.provider || 'github'
      if (state.baseUrl) gitlabBaseUrl = state.baseUrl
    } catch (e) {
      console.warn('[Auth] Failed to parse state param:', e)
    }
  }

  console.log('[Auth] Callback for provider:', provider)

  try {
    let access_token: string

    if (provider === 'gitlab') {
      
      const { gitlabClientId, gitlabClientSecret } = config

      if (!gitlabClientId || !gitlabClientSecret) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Missing GitLab OAuth configuration'
        })
      }

      const response: any = await $fetch(`${gitlabBaseUrl}/oauth/token`, {
        method: 'POST',
        body: {
          client_id: gitlabClientId,
          client_secret: gitlabClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${config.baseUrl}/api/auth/callback`
        },
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      })

      if (response.error) {
        throw createError({
          statusCode: 401,
          statusMessage: response.error_description || 'Failed to authenticate with GitLab'
        })
      }

      access_token = response.access_token
      console.log('[Auth] GitLab token obtained successfully')

      
      const params = new URLSearchParams()
      params.set('token', access_token)
      params.set('provider', 'gitlab')
      if (gitlabBaseUrl !== 'https://gitlab.com') {
        params.set('base_url', gitlabBaseUrl)
      }
      return sendRedirect(event, `/?${params}`)

    } else {
      
      const { githubClientId, githubClientSecret } = config

      if (!githubClientId || !githubClientSecret) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Missing GitHub OAuth configuration'
        })
      }

      const response: any = await $fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        body: {
          client_id: githubClientId,
          client_secret: githubClientSecret,
          code,
          redirect_uri: `${config.baseUrl}/api/auth/callback`
        },
        headers: {
          Accept: 'application/json'
        }
      })

      if (response.error) {
        throw createError({
          statusCode: 401,
          statusMessage: response.error_description || 'Failed to authenticate with GitHub'
        })
      }

      access_token = response.access_token
      console.log('[Auth] GitHub token obtained successfully')

      
      return sendRedirect(event, `/?token=${access_token}&provider=github`)
    }

  } catch (error: any) {
    console.error('[Auth] OAuth Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})
