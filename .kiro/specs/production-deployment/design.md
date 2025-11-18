# Production Deployment Design

## Overview

This design outlines the deployment architecture for the Agentic Multi-Model Chat application to Vercel as an open-source project. The solution supports two deployment modes:

1. **Client-side mode** (default): Users provide their own OpenRouter API key, stored in browser localStorage
2. **Proxy mode** (optional): API requests route through Vercel serverless functions with rate limiting

The design prioritizes simplicity for open-source adoption while providing flexibility for deployers who want to offer managed instances.

## Architecture

### Client-side Mode (Default)

```
┌─────────────┐
│   Browser   │
│             │
│  ┌───────┐  │
│  │ Vite  │  │
│  │ App   │  │
│  └───┬───┘  │
└──────┼──────┘
       │ Direct HTTPS
       │ (with user's API key)
       ▼
┌─────────────┐
│ OpenRouter  │
│     API     │
└─────────────┘
```

**Flow:**
1. User enters OpenRouter API key in UI
2. Key stored in localStorage
3. App makes direct fetch() calls to OpenRouter
4. No backend required

### Proxy Mode (Optional)

```
┌─────────────┐
│   Browser   │
│             │
│  ┌───────┐  │
│  │ Vite  │  │
│  │ App   │  │
│  └───┬───┘  │
└──────┼──────┘
       │ HTTPS
       ▼
┌─────────────────────┐
│ Vercel Serverless   │
│                     │
│  ┌──────────────┐   │
│  │ /api/chat    │   │
│  │ Function     │   │
│  │              │   │
│  │ - Rate limit │   │
│  │ - Forward    │   │
│  └──────┬───────┘   │
└─────────┼───────────┘
          │ HTTPS
          │ (with server API key)
          ▼
    ┌─────────────┐
    │ OpenRouter  │
    │     API     │
    └─────────────┘
```

**Flow:**
1. App detects proxy mode via environment variable
2. Requests sent to `/api/chat` endpoint
3. Serverless function validates, rate limits, and forwards to OpenRouter
4. Response streamed back to client

## Components and Interfaces

### 1. Vercel Configuration (`vercel.json`)

```json
{
  "buildCommand": "cd agentic-chat && npm run build",
  "outputDirectory": "agentic-chat/dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

**Purpose:** Configure Vercel build and routing

### 2. Environment Configuration Module (`src/config.js`)

```javascript
export const config = {
  useProxy: import.meta.env.VITE_USE_PROXY === 'true',
  apiEndpoint: import.meta.env.VITE_USE_PROXY === 'true' 
    ? '/api/chat' 
    : 'https://openrouter.ai/api/v1/chat/completions'
};
```

**Purpose:** Toggle between client-side and proxy modes

### 3. Serverless Function (`api/chat.js`)

**Endpoints:**

#### POST `/api/chat`
- **Purpose:** Proxy chat completion requests to OpenRouter
- **Request Body:**
  ```json
  {
    "model": "anthropic/claude-3.5-sonnet",
    "messages": [...],
    "stream": true
  }
  ```
- **Response:** SSE stream or JSON response
- **Rate Limiting:** 20 requests per IP per hour (configurable)

**Implementation:**
```javascript
export default async function handler(req, res) {
  // Validate request
  // Check rate limit
  // Forward to OpenRouter
  // Stream response back
}
```

### 4. Updated OpenRouter Client (`src/openrouter-client.js`)

**Modifications needed:**
- Check `config.useProxy` to determine endpoint
- If proxy mode: send to `/api/chat` without Authorization header
- If client-side: use existing direct OpenRouter logic

```javascript
import { config } from './config.js';

export async function sendChatCompletion(modelId, messages, apiKey, options = {}) {
  const endpoint = config.useProxy 
    ? config.apiEndpoint 
    : 'https://openrouter.ai/api/v1/chat/completions';
  
  const headers = config.useProxy
    ? { 'Content-Type': 'application/json' }
    : {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Agentic Multi-Model Chat',
        'Content-Type': 'application/json'
      };
  
  // ... rest of implementation
}
```

### 5. Deployment Documentation (`README.md` additions)

**Sections to add:**
- Quick Deploy button
- Environment variables reference
- Local development setup
- OpenRouter API key instructions
- Deployment modes comparison

## Data Models

### Rate Limit Store (In-Memory for Proxy Mode)

```javascript
{
  "ip_address": {
    "count": 15,
    "resetAt": 1700000000000,
    "firstRequest": 1699996400000
  }
}
```

**Note:** For production with multiple serverless instances, consider using Vercel KV or Upstash Redis for distributed rate limiting.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_USE_PROXY` | No | `false` | Enable proxy mode |
| `OPENROUTER_API_KEY` | Proxy only | - | Server-side OpenRouter API key |
| `RATE_LIMIT_REQUESTS` | No | `20` | Requests per IP per hour |
| `RATE_LIMIT_WINDOW_MS` | No | `3600000` | Rate limit window (1 hour) |

## Error Handling

### Client-side Mode Errors

1. **Missing API Key**
   - Show modal prompting user to enter key
   - Link to OpenRouter signup

2. **Invalid API Key**
   - Display error message from OpenRouter
   - Offer to update key

3. **Network Errors**
   - Retry with exponential backoff
   - Show user-friendly error message

### Proxy Mode Errors

1. **Rate Limit Exceeded**
   - Return 429 status
   - Include `Retry-After` header
   - Client shows countdown timer

2. **OpenRouter API Errors**
   - Sanitize error messages
   - Log full error server-side
   - Return generic message to client

3. **Missing Server API Key**
   - Return 500 status
   - Log configuration error
   - Show "Service unavailable" to user

### Error Response Format

```javascript
{
  "error": {
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 3600
  }
}
```

## Testing Strategy

### Local Testing

1. **Client-side Mode**
   ```bash
   cd agentic-chat
   npm run dev
   # Test with personal OpenRouter API key
   ```

2. **Proxy Mode**
   ```bash
   # Set environment variables
   export VITE_USE_PROXY=true
   export OPENROUTER_API_KEY=sk-...
   
   # Run Vercel dev server
   vercel dev
   ```

### Deployment Testing

1. **Preview Deployments**
   - Every PR creates preview deployment
   - Test both modes with environment variables
   - Verify rate limiting

2. **Production Deployment**
   - Deploy to production branch
   - Smoke test with real API calls
   - Monitor error rates

### Test Scenarios

- [ ] Client-side mode: Enter API key and send message
- [ ] Client-side mode: Invalid API key shows error
- [ ] Client-side mode: API key persists after refresh
- [ ] Proxy mode: Send message without entering API key
- [ ] Proxy mode: Rate limit triggers after N requests
- [ ] Proxy mode: Streaming responses work correctly
- [ ] Both modes: All model providers work
- [ ] Both modes: Error messages are user-friendly

## Security Considerations

### Client-side Mode

1. **API Key Storage**
   - Stored in localStorage (user's responsibility)
   - Never sent to our servers
   - Clear warning in UI about key security

2. **CORS**
   - OpenRouter allows browser requests
   - No additional CORS configuration needed

### Proxy Mode

1. **Rate Limiting**
   - Per-IP limits prevent abuse
   - Consider Vercel KV for distributed rate limiting
   - Log suspicious activity

2. **Request Validation**
   - Validate request body structure
   - Limit message size (e.g., 100KB)
   - Sanitize model IDs against whitelist

3. **API Key Protection**
   - Server API key in environment variables
   - Never exposed to client
   - Rotate periodically

4. **Error Message Sanitization**
   ```javascript
   function sanitizeError(error) {
     // Don't leak API keys or internal details
     if (error.message.includes('sk-')) {
       return 'Authentication error';
     }
     return error.message;
   }
   ```

## Deployment Process

### Initial Setup

1. **Fork Repository**
   - User forks GitHub repo
   - Customizes as needed

2. **Connect to Vercel**
   - Import project from GitHub
   - Vercel auto-detects Vite framework

3. **Configure Environment**
   - Choose deployment mode
   - Set environment variables if using proxy

4. **Deploy**
   - Vercel builds and deploys automatically
   - Provides production URL

### Continuous Deployment

1. **Push to main branch**
2. Vercel automatically builds and deploys
3. Preview deployments for PRs
4. Rollback available if needed

## Performance Optimization

### Build Optimization

1. **Vite Configuration**
   ```javascript
   // vite.config.js
   export default {
     build: {
       minify: 'terser',
       sourcemap: true,
       rollupOptions: {
         output: {
           manualChunks: {
             'vendor': ['openrouter-client']
           }
         }
       }
     }
   }
   ```

2. **Asset Optimization**
   - Minify CSS and JS
   - Compress images
   - Enable Vercel's automatic compression

### Runtime Optimization

1. **Caching**
   - Static assets cached with long TTL
   - API responses not cached (real-time)

2. **Streaming**
   - Use SSE for streaming responses
   - Reduce time to first token

3. **Code Splitting**
   - Lazy load non-critical components
   - Reduce initial bundle size

## Monitoring and Observability

### Vercel Analytics

- Enable Vercel Analytics for page views
- Track deployment success/failure
- Monitor build times

### Error Tracking (Optional)

- Integrate Sentry for error tracking
- Track API errors and rate limits
- Monitor performance metrics

### Logging

**Client-side:**
- Console errors for development
- Optional error reporting service

**Proxy mode:**
- Log rate limit hits
- Log API errors (sanitized)
- Monitor request patterns

## Documentation Requirements

### README.md Sections

1. **Quick Start**
   - Deploy to Vercel button
   - 3-step setup guide

2. **Deployment Modes**
   - Comparison table
   - When to use each mode

3. **Environment Variables**
   - Complete reference
   - Examples for each mode

4. **Getting OpenRouter API Key**
   - Step-by-step with screenshots
   - Link to OpenRouter docs

5. **Local Development**
   - Prerequisites
   - Setup commands
   - Testing both modes

6. **Contributing**
   - How to fork and customize
   - PR guidelines
   - Code style

### Additional Documentation

- `DEPLOYMENT.md`: Detailed deployment guide
- `CONTRIBUTING.md`: Contribution guidelines
- `LICENSE`: MIT or Apache 2.0 (user's choice)

## Migration Path

For existing deployments using client-side mode:

1. No changes required - continues to work
2. To enable proxy mode:
   - Set `VITE_USE_PROXY=true`
   - Add `OPENROUTER_API_KEY`
   - Redeploy

No breaking changes to existing functionality.
