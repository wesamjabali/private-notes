# GitNotes

GitNotes is a secure, private, and beautiful notes application built with Nuxt 3. It leverages GitHub for storage and authentication, providing a seamless experience for managing your markdown notes directly from your repositories. It also features AI integration using Google's Gemini.

## Features

- **GitHub Integration**: Authenticate with GitHub and manage your repositories directly.
- **Markdown Editor**: Powerful markdown editing experience powered by CodeMirror 6.
- **AI Assistant**: Built-in chat interface with Google Gemini for assistance and content generation.
- **Private & Secure**: Your notes are stored in your own GitHub repositories.
- **PWA Support**: Installable as a Progressive Web App for a native-like experience.
- **Dark Mode**: Optimized for comfortable viewing and editing.

## Tech Stack

- **Framework**: [Nuxt 3](https://nuxt.com/)
- **UI Library**: Vue 3
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Editor**: [CodeMirror 6](https://codemirror.net/)
- **Icons**: [Lucide](https://lucide.dev/)
- **AI**: [Google Generative AI (Gemini)](https://ai.google.dev/)
- **GitHub API**: [Octokit](https://github.com/octokit/octokit.js)

## Prerequisites

- Node.js (Latest LTS recommended)
- pnpm (Package manager)

## Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd private-notes
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Environment Configuration:**

   Create a `.env` file in the root directory and add the following variables:

   ```env
   # GitHub OAuth App Credentials
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret

   # Base URL for the application (default: http://localhost:3000)
   BASE_URL=http://localhost:3000

   # Optional: Personal Access Token for GitHub (if not using OAuth flow)
   GITHUB_PAT=your_github_pat

   # Google Gemini API Key for AI features
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server:**

   ```bash
   pnpm dev
   ```

   The application will be available at `http://localhost:3000`.

## Building for Production

To build the application for production:

```bash
pnpm build
```

To preview the production build:

```bash
pnpm preview
```

## License

[MIT](LICENSE)
