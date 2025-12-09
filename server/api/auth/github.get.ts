export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { githubClientId } = config

  if (!githubClientId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing GitHub Client ID configuration'
    })
  }

  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&scope=repo,user`
  
  return sendRedirect(event, redirectUri)
})
