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
    baseUrl: process.env.BASE_URL || "http://localhost:3000",
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
      ],
    },
  },
});
