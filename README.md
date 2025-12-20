# Biruni

> **Secure, Git-based Markdown Editor.**  
> *Own your data. Edit locally or in the browser. Sync with Git.*

![Biruni Hero](public/hero.jpeg)

## ✨ Features

-   **Git Integration**: Seamlessly sync with **GitHub**, **GitLab**, **Gitea**, and **Forgejo**.
-   **Local First**: Edit files directly on your device using the **File System Access API**.
-   **Rich Editor**: Powered by **CodeMirror 6**, featuring syntax highlighting, vim mode, and standard shortcuts.
-   **Markdown Pro**:
    -   GitHub Flavored Markdown (GFM)
    -   Math support with $\KaTeX$
    -   Diagrams with **Mermaid**
    -   GitHub Alerts (Note, Tip, Important, Warning, Caution)
-   **PWA Ready**: Install as a Progressive Web App on iOS, Android, and Desktop.
-   **Modern UI**: Beautiful glassmorphism, dark/light modes, and responsive design.

## 🐳 Self-Hosting

You can easily self-host Biruni using Docker Compose. The image is available on the basic GitHub Container Registry.

### Docker Compose

Create a `docker-compose.yml` file:

```yaml
services:
  biruni:
    image: ghcr.io/wesamjabali/biruni:latest
    container_name: biruni
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # Required for GitHub/GitLab integration
      - NUXT_GITHUB_CLIENT_ID=your_github_client_id
      - NUXT_GITHUB_CLIENT_SECRET=your_github_client_secret
      # Optional: For GitLab
      - NUXT_GITLAB_CLIENT_ID=your_gitlab_client_id
      - NUXT_GITLAB_CLIENT_SECRET=your_gitlab_client_secret
      # Base URL (default is http://localhost:3000)
      - BASE_URL=https://your-domain.com
```

### Environment Variables

| Variable | Description | Required |
| :--- | :--- | :--- |
| `NUXT_GITHUB_CLIENT_ID` | OAuth Client ID for GitHub | Yes (for GitHub) |
| `NUXT_GITHUB_CLIENT_SECRET` | OAuth Client Secret for GitHub | Yes (for GitHub) |
| `BASE_URL` | The URL where the app is hosted | No (Default: localhost:3000) |
| `NUXT_GITLAB_CLIENT_ID` | OAuth Client ID for GitLab | No |
| `NUXT_GITLAB_CLIENT_SECRET` | OAuth Client Secret for GitLab | No |

## 🛠️ Development

### Prerequisites

-   Node.js 18+
-   pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## 📄 License

[MIT](LICENSE)
