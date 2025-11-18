// Vercel Serverless Function for OpenRouter Proxy
// Handles chat completion requests with rate limiting

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// In-memory rate limit store (resets on cold start)
// For production with multiple instances, consider Vercel KV or Upstash Redis
const rateLimitStore = new Map();

// Rate limit configuration from environment
const RATE_LIMIT_REQUESTS = parseInt(process.env.VITE_RATE_LIMIT_REQUESTS || '20', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.VITE_RATE_LIMIT_WINDOW_MS || '3600000', 10);

/**
 * Get client IP address from request
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() 
    || req.headers['x-real-ip'] 
    || 'unknown';
}

/**
 * Check and update rate limit for IP address
 * Returns { allowed: boolean, retryAfter?: number }
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record) {
    // First request from this IP
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
      firstRequest: now
    });
    return { allowed: true };
  }

  // Check if window has expired
  if (now >= record.resetAt) {
    // Reset the window
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
      firstRequest: now
    });
    return { allowed: true };
  }

  // Within the window
  if (record.count >= RATE_LIMIT_REQUESTS) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(ip, record);
  return { allowed: true };
}

/**
 * Validate request body
 */
function validateRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  if (!body.model || typeof body.model !== 'string') {
    return { valid: false, error: 'Missing or invalid model' };
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { valid: false, error: 'Missing or invalid messages array' };
  }

  // Check message size (limit to 100KB)
  const messageSize = JSON.stringify(body.messages).length;
  if (messageSize > 100 * 1024) {
    return { valid: false, error: 'Message payload too large' };
  }

  return { valid: true };
}

/**
 * Sanitize error messages to avoid leaking sensitive information
 */
function sanitizeError(error) {
  const message = error.message || 'Unknown error';
  
  // Don't leak API keys
  if (message.includes('sk-') || message.includes('Bearer')) {
    return 'Authentication error';
  }
  
  // Don't leak internal details
  if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
    return 'Service temporarily unavailable';
  }
  
  return message;
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if API key is configured
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not configured');
    return res.status(500).json({ error: 'Service not configured' });
  }

  // Get client IP and check rate limit
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp);
  
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: rateLimit.retryAfter
    });
  }

  // Validate request body
  const validation = validateRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const { model, messages, stream = true, ...options } = req.body;

  try {
    // Forward request to OpenRouter
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'https://ai-brainstorm.vercel.app',
        'X-Title': 'AI Brainstorm',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
        ...options
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = sanitizeError(errorData.error || { message: `API error: ${response.status}` });
      return res.status(response.status).json({ error: errorMessage });
    }

    // Handle streaming response
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Pipe the response stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
        res.end();
      } catch (streamError) {
        console.error('Streaming error:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Streaming error' });
        }
      }
    } else {
      // Handle non-streaming response
      const data = await response.json();
      res.status(200).json(data);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    const sanitized = sanitizeError(error);
    
    if (!res.headersSent) {
      res.status(500).json({ error: sanitized });
    }
  }
}
