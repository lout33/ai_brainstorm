# 🧠 AI Brainstorm

Orchestrate multiple AI models to brainstorm and solve complex problems together. AI Brainstorm features a tree-based conversation structure, intelligent agent orchestration, and support for 200+ AI models through OpenRouter.

## ✨ Features

- **Multi-Model Orchestration**: Coordinate multiple AI models to solve complex problems
- **Tree-Based Conversations**: Branch and explore different conversation paths
- **Council Mode**: Have models rank each other's responses and synthesize the best answer
- **Agent System**: Specialized agents (Planner, Researcher, Coder, Critic) work together
- **Model Flexibility**: Access 200+ models through OpenRouter's unified API
- **Two Deployment Modes**: Client-side (bring your own key) or Proxy (managed instance)
- **Modern UI**: Clean, responsive interface with real-time streaming

## 🚀 Quick Deploy

Deploy your own instance to Vercel in minutes:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lout33/ai_brainstorm&env=VITE_USE_PROXY&envDescription=Set%20to%20true%20for%20proxy%20mode%20or%20false%20for%20client-side%20mode&envLink=https://github.com/lout33/ai_brainstorm%23environment-variables)

**Live Demo**: [https://ai-brainstorm-blue.vercel.app/](https://ai-brainstorm-blue.vercel.app/)

### Deployment Modes

| Mode | Best For | Setup Complexity | API Key Management |
|------|----------|------------------|-------------------|
| **Client-side** (default) | Open source, personal use | ⭐ Simple | Users provide their own |
| **Proxy** (optional) | Demos, shared instances | ⭐⭐ Moderate | Managed server-side |

## 📋 Prerequisites

- Node.js 18+ and npm
- OpenRouter API key ([get one here](https://openrouter.ai/keys))
- Vercel account (for deployment)

## 🛠️ Local Development

### Client-side Mode (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/lout33/ai_brainstorm.git
cd ai_brainstorm

# Install dependencies
cd agentic-chat
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` and enter your OpenRouter API key when prompted.

### Proxy Mode (Testing Serverless Functions)

```bash
# Install Vercel CLI
npm install -g vercel

# Set environment variables
cp .env.example .env
# Edit .env and set:
# VITE_USE_PROXY=true
# OPENROUTER_API_KEY=your-key-here

# Run Vercel dev server
vercel dev
```

## 🔑 Getting an OpenRouter API Key

1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up or log in
3. Go to [Keys](https://openrouter.ai/keys)
4. Click "Create Key"
5. Copy your key (starts with `sk-or-v1-`)

**In Client-side Mode**: Enter the key in the app's UI (stored in your browser)  
**In Proxy Mode**: Add to environment variables on Vercel

## 🌐 Deployment to Vercel

### Option 1: Deploy via GitHub (Recommended)

1. Fork this repository
2. Go to [Vercel](https://vercel.com/new)
3. Import your forked repository
4. Configure environment variables (see below)
5. Click "Deploy"

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables (if using proxy mode)
vercel env add VITE_USE_PROXY
vercel env add OPENROUTER_API_KEY

# Deploy to production
vercel --prod
```

## ⚙️ Environment Variables

### Client-side Mode (Default)

No environment variables required! Users provide their own API keys through the UI.

### Proxy Mode

Set these in your Vercel project settings:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_USE_PROXY` | Yes | `false` | Set to `true` to enable proxy mode |
| `OPENROUTER_API_KEY` | Yes | - | Your OpenRouter API key |
| `VITE_RATE_LIMIT_REQUESTS` | No | `20` | Requests per IP per hour |
| `VITE_RATE_LIMIT_WINDOW_MS` | No | `3600000` | Rate limit window (1 hour) |

### Example Configuration

**Client-side mode** (simplest):
```bash
# No environment variables needed
# Users enter their own API keys
```

**Proxy mode** (for managed instances):
```bash
VITE_USE_PROXY=true
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
VITE_RATE_LIMIT_REQUESTS=20
VITE_RATE_LIMIT_WINDOW_MS=3600000
```

## 🏗️ Project Structure

```
ai-brainstorm/
├── agentic-chat/          # Frontend application
│   ├── src/
│   │   ├── main.js        # Application entry point
│   │   ├── config.js      # Environment configuration
│   │   ├── openrouter-client.js  # API client
│   │   ├── agent-orchestrator.js # Agent coordination
│   │   ├── conversation-manager.js # Conversation state
│   │   ├── council.js     # Council mode logic (rankings & synthesis)
│   │   ├── council-message.js # Council results renderer
│   │   └── ...
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── api/                   # Serverless functions (proxy mode)
│   └── chat.js           # OpenRouter proxy endpoint
├── .env.example          # Environment variables template
├── vercel.json           # Vercel configuration
└── README.md
```

## 🔒 Security

### Client-side Mode
- API keys stored in browser localStorage
- Keys never sent to our servers
- Users responsible for their own key security
- Direct HTTPS connection to OpenRouter

### Proxy Mode
- Server-side API key in environment variables
- Rate limiting per IP address (20 requests/hour default)
- Request validation and sanitization
- Error messages sanitized to prevent information leakage

## 🤝 Contributing

Contributions are welcome! This is an open-source project.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai/) for unified AI model access
- [Vite](https://vitejs.dev/) for blazing fast development
- [Vercel](https://vercel.com/) for seamless deployment

## 📚 Documentation

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)

## 💬 Support

- Open an [issue](https://github.com/lout33/ai_brainstorm/issues) for bug reports
- Start a [discussion](https://github.com/lout33/ai_brainstorm/discussions) for questions
- Check existing issues before creating new ones

## 🗺️ Roadmap

- [x] Council Mode - Models rank and synthesize best answers
- [ ] Add more AI providers
- [ ] Implement conversation export/import
- [ ] Add collaborative features
- [ ] Mobile app version
- [ ] Plugin system for custom agents

---

Made with ❤️ by the open source community
