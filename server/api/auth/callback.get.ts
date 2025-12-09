export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { githubClientId, githubClientSecret } = config
  const query = getQuery(event)
  const code = query.code

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing code parameter'
    })
  }

  try {
    const response: any = await $fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      body: {
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code
      },
      headers: {
        Accept: 'application/json'
      }
    })

    if (response.error) {
       throw createError({
        statusCode: 401,
        statusMessage: response.error_description || 'Failed to authenticate'
      })
    }

    const { access_token } = response

    // Redirect to home with token in query param (simple handoff)
    return sendRedirect(event, `/?token=${access_token}`)

  } catch (error: any) {
    console.error('OAuth Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})
