// OpenRouter API Client
// Handles all communication with OpenRouter's unified API

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Send chat completion request to OpenRouter
export async function sendChatCompletion(modelId, messages, apiKey, options = {}) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  const requestBody = {
    model: modelId,
    messages: messages,
    ...options
  };

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Agentic Multi-Model Chat',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
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
  if (!apiKey) {
    throw new Error('API key is required');
  }

  const requestBody = {
    model: modelId,
    messages: messages,
    stream: true,
    ...options
  };

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Agentic Multi-Model Chat',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
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
