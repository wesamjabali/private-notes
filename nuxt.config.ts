// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  modules: ["@pinia/nuxt", "@vueuse/nuxt"],
  css: ["~/assets/css/main.scss"],
  runtimeConfig: {
    githubClientId: "",
    githubClientSecret: "",
    gitlabClientId: "",
    gitlabClientSecret: "",
    baseUrl: process.env.BASE_URL || "http://localhost:3000",
    public: {
      gitPat: process.env.GITHUB_PAT || "",
      geminiApiKey: process.env.GEMINI_API_KEY || "",
      gitlabBaseUrl: process.env.GITLAB_BASE_URL || "https://gitlab.com",
    }
  },
  app: {
    head: {
      title: "GitNotes",
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
        },
        {
          name: "description",
          content: "Secure, private, and beautiful notes application.",
        },
        { name: "mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "theme-color", content: "#1e1e1e" },
        { property: "og:title", content: "GitNotes" },
        {
          property: "og:description",
          content:
            "Secure, private, and beautiful notes application by Wesam Jabali",
        },
        { property: "og:image", content: "/social-card.png" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "apple-touch-icon", href: "/favicon.png" },
        { rel: "manifest", href: "/manifest.json" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700;900&family=Montserrat:wght@400;500;600;700&family=Raleway:wght@400;500;600;700&family=Source+Sans+3:wght@400;600;700&family=Nunito:wght@400;600;700;800&family=Merriweather:wght@400;700;900&family=Playfair+Display:wght@400;700;900&family=Lora:wght@400;600;700&family=PT+Serif:wght@400;700&family=Crimson+Text:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Fira+Code:wght@400;500;600&family=Roboto+Mono:wght@400;500;600&family=Source+Code+Pro:wght@400;600;700&family=Space+Mono:wght@400;700&family=Ubuntu+Mono:wght@400;700&family=Orbitron:wght@400;600;900&family=Righteous&family=Bebas+Neue&family=Pacifico&family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&display=swap",
        },
      ],
    },
  },
});
