// Environment configuration for deployment modes
// Supports both client-side and proxy modes

export const config = {
  // Proxy mode: route requests through serverless function
  // Client-side mode: direct requests to OpenRouter from browser
  useProxy: import.meta.env.VITE_USE_PROXY === 'true',
  
  // API endpoint based on deployment mode
  apiEndpoint: import.meta.env.VITE_USE_PROXY === 'true' 
    ? '/api/chat' 
    : 'https://openrouter.ai/api/v1/chat/completions',
  
  // Rate limiting configuration (for proxy mode)
  rateLimit: {
    requests: parseInt(import.meta.env.VITE_RATE_LIMIT_REQUESTS || '20', 10),
    windowMs: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW_MS || '3600000', 10)
  }
};

// Helper to check if running in proxy mode
export function isProxyMode() {
  return config.useProxy;
}

// Helper to get the appropriate endpoint
export function getApiEndpoint() {
  return config.apiEndpoint;
}
