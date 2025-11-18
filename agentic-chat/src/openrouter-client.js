// OpenRouter API Client
// Handles all communication with OpenRouter's unified API
// Supports both client-side and proxy modes

import { config } from './config.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Send chat completion request to OpenRouter
export async function sendChatCompletion(modelId, messages, apiKey, options = {}) {
  // In proxy mode, API key is not required (handled server-side)
  if (!config.useProxy && !apiKey) {
    throw new Error('API key is required');
  }

  const requestBody = {
    model: modelId,
    messages: messages,
    ...options
  };

  // Determine endpoint and headers based on mode
  const endpoint = config.useProxy 
    ? '/api/chat' 
    : `${OPENROUTER_BASE_URL}/chat/completions`;
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  // Add authorization and referer headers only in client-side mode
  if (!config.useProxy) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'AI Brainstorm';
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle rate limit errors in proxy mode
      if (response.status === 429 && errorData.retryAfter) {
        throw new Error(`Rate limit exceeded. Please try again in ${errorData.retryAfter} seconds.`);
      }
      
      throw new Error(errorData.error?.message || errorData.error || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('OpenRouter API error:', error);
    throw error;
  }
}

// Extract message content from OpenRouter response
export function extractMessageContent(response) {
  try {
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Failed to extract message content:', error);
    return '';
  }
}

// Send streaming chat completion request to OpenRouter
export async function sendStreamingChatCompletion(modelId, messages, apiKey, onChunk, options = {}) {
  // In proxy mode, API key is not required (handled server-side)
  if (!config.useProxy && !apiKey) {
    throw new Error('API key is required');
  }

  const requestBody = {
    model: modelId,
    messages: messages,
    stream: true,
    ...options
  };

  // Determine endpoint and headers based on mode
  const endpoint = config.useProxy 
    ? '/api/chat' 
    : `${OPENROUTER_BASE_URL}/chat/completions`;
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  // Add authorization and referer headers only in client-side mode
  if (!config.useProxy) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'AI Brainstorm';
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle rate limit errors in proxy mode
      if (response.status === 429 && errorData.retryAfter) {
        throw new Error(`Rate limit exceeded. Please try again in ${errorData.retryAfter} seconds.`);
      }
      
      throw new Error(errorData.error?.message || errorData.error || `API request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
        
        if (trimmedLine.startsWith('data: ')) {
          try {
            const jsonStr = trimmedLine.slice(6);
            const data = JSON.parse(jsonStr);
            const content = data.choices[0]?.delta?.content;
            
            if (content) {
              onChunk(content);
            }
          } catch (error) {
            console.error('Error parsing streaming chunk:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('OpenRouter streaming API error:', error);
    throw error;
  }
}
