// API Key Manager
// Manages OpenRouter API key storage

const API_KEY_STORAGE_KEY = 'agentic_chat_api_key';

let cachedApiKey = null;

// Load API key from localStorage
export function loadApiKey() {
  if (cachedApiKey) {
    return cachedApiKey;
  }
  
  try {
    cachedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    return cachedApiKey;
  } catch (error) {
    console.error('Failed to load API key:', error);
    return null;
  }
}

// Save API key to localStorage
export function saveApiKey(apiKey) {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    cachedApiKey = apiKey;
    return true;
  } catch (error) {
    console.error('Failed to save API key:', error);
    return false;
  }
}

// Check if API key is configured
export function hasApiKey() {
  return !!loadApiKey();
}

// Clear API key
export function clearApiKey() {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    cachedApiKey = null;
    return true;
  } catch (error) {
    console.error('Failed to clear API key:', error);
    return false;
  }
}
