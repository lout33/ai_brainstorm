// API Key Setup Modal
// Handles first-time API key setup and management

import { saveApiKey, hasApiKey, loadApiKey, clearApiKey } from './api-key-manager.js';
import { config } from './config.js';

let modalElement = null;
let isModalOpen = false;

/**
 * Create and show the API key setup modal
 */
export function showApiKeyModal() {
  if (isModalOpen) return;
  
  // Don't show modal in proxy mode
  if (config.useProxy) {
    return;
  }
  
  isModalOpen = true;
  
  // Create modal HTML
  const modal = document.createElement('div');
  modal.className = 'api-key-modal-overlay';
  modal.innerHTML = `
    <div class="api-key-modal">
      <div class="api-key-modal-header">
        <h2>🔑 OpenRouter API Key Required</h2>
        <p>Enter your OpenRouter API key to start chatting with AI models</p>
      </div>
      
      <div class="api-key-modal-body">
        <div class="api-key-input-group">
          <label for="api-key-input">API Key</label>
          <input 
            type="password" 
            id="api-key-input" 
            placeholder="sk-or-v1-..." 
            autocomplete="off"
          />
          <button type="button" id="toggle-visibility" class="toggle-visibility-btn">
            👁️ Show
          </button>
        </div>
        
        <div class="api-key-info">
          <h3>How to get your API key:</h3>
          <ol>
            <li>Visit <a href="https://openrouter.ai/" target="_blank" rel="noopener">OpenRouter.ai</a></li>
            <li>Sign up or log in to your account</li>
            <li>Go to <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">Keys</a> page</li>
            <li>Click "Create Key" and copy it</li>
          </ol>
          
          <div class="api-key-security">
            <strong>🔒 Security:</strong> Your API key is stored locally in your browser and never sent to our servers. 
            It's only used to communicate directly with OpenRouter.
          </div>
        </div>
        
        <div class="api-key-error" id="api-key-error" style="display: none;"></div>
      </div>
      
      <div class="api-key-modal-footer">
        <button id="save-api-key-btn" class="primary-btn">Save & Continue</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modalElement = modal;
  
  // Focus input
  const input = modal.querySelector('#api-key-input');
  input.focus();
  
  // Setup event listeners
  setupModalEventListeners(modal);
}

/**
 * Setup event listeners for the modal
 */
function setupModalEventListeners(modal) {
  const input = modal.querySelector('#api-key-input');
  const saveBtn = modal.querySelector('#save-api-key-btn');
  const toggleBtn = modal.querySelector('#toggle-visibility');
  const errorDiv = modal.querySelector('#api-key-error');
  
  // Toggle password visibility
  toggleBtn.addEventListener('click', () => {
    if (input.type === 'password') {
      input.type = 'text';
      toggleBtn.textContent = '🙈 Hide';
    } else {
      input.type = 'password';
      toggleBtn.textContent = '👁️ Show';
    }
  });
  
  // Save on Enter key
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });
  
  // Save button click
  saveBtn.addEventListener('click', () => {
    const apiKey = input.value.trim();
    
    // Validate API key format
    if (!apiKey) {
      showError(errorDiv, 'Please enter an API key');
      return;
    }
    
    if (!apiKey.startsWith('sk-or-v1-')) {
      showError(errorDiv, 'Invalid API key format. OpenRouter keys start with "sk-or-v1-"');
      return;
    }
    
    // Save the API key
    const saved = saveApiKey(apiKey);
    
    if (saved) {
      closeModal();
      // Dispatch event to notify app that API key is ready
      window.dispatchEvent(new CustomEvent('apiKeyReady'));
    } else {
      showError(errorDiv, 'Failed to save API key. Please try again.');
    }
  });
}

/**
 * Show error message in modal
 */
function showError(errorDiv, message) {
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  
  // Hide after 5 seconds
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

/**
 * Close the modal
 */
function closeModal() {
  if (modalElement) {
    modalElement.remove();
    modalElement = null;
    isModalOpen = false;
  }
}

/**
 * Check if API key is configured and show modal if needed
 */
export function checkAndShowApiKeyModal() {
  // Don't show in proxy mode
  if (config.useProxy) {
    return true;
  }
  
  if (!hasApiKey()) {
    showApiKeyModal();
    return false;
  }
  
  return true;
}

/**
 * Show API key management in settings
 */
export function showApiKeySettings() {
  // Don't show in proxy mode
  if (config.useProxy) {
    alert('API key management is not available in proxy mode. The API key is managed server-side.');
    return;
  }
  
  const currentKey = loadApiKey();
  const maskedKey = currentKey ? `${currentKey.substring(0, 12)}...${currentKey.substring(currentKey.length - 4)}` : 'Not set';
  
  const action = confirm(
    `Current API Key: ${maskedKey}\n\n` +
    `Choose an action:\n` +
    `OK - Update API key\n` +
    `Cancel - Clear API key`
  );
  
  if (action) {
    // Update API key
    showApiKeyModal();
  } else {
    // Clear API key
    const confirmClear = confirm('Are you sure you want to clear your API key? You will need to enter it again to use the app.');
    if (confirmClear) {
      clearApiKey();
      alert('API key cleared. Please refresh the page to enter a new key.');
      window.location.reload();
    }
  }
}

/**
 * Get proxy mode indicator HTML
 */
export function getProxyModeIndicator() {
  if (config.useProxy) {
    return `
      <div class="proxy-mode-indicator">
        <span class="proxy-badge">🔒 Managed API</span>
        <span class="proxy-info">Using server-managed API key</span>
      </div>
    `;
  }
  return '';
}
