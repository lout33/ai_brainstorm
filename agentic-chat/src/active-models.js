// Active Models Manager
// Manages user's list of active models for conversations

const STORAGE_KEY = 'agentic_chat_active_models';

// Default models to load on first run
const DEFAULT_MODELS = [
  { id: 'openai/gpt-5.1', name: 'GPT-5.1', addedAt: Date.now() },
  { id: 'x-ai/grok-4-fast', name: 'Grok 4 Fast', addedAt: Date.now() },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', addedAt: Date.now() },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', addedAt: Date.now() }
];

let activeModels = [];

// Load active models from localStorage
export function loadActiveModels() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      activeModels = JSON.parse(stored);
    } else {
      // First run - load defaults
      activeModels = [...DEFAULT_MODELS];
      saveActiveModels();
    }
  } catch (error) {
    console.error('Failed to load active models:', error);
    activeModels = [...DEFAULT_MODELS];
  }
  return activeModels;
}

// Save active models to localStorage
export function saveActiveModels() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeModels));
  } catch (error) {
    console.error('Failed to save active models:', error);
  }
}

// Get all active models
export function getActiveModels() {
  return [...activeModels];
}

// Add a model to active list
export function addActiveModel(modelId, modelName) {
  // Check if model already exists
  const exists = activeModels.some(m => m.id === modelId);
  if (exists) {
    return { success: false, message: 'Model already active' };
  }

  const newModel = {
    id: modelId,
    name: modelName,
    addedAt: Date.now()
  };

  activeModels.push(newModel);
  saveActiveModels();
  
  return { success: true, model: newModel };
}

// Remove a model from active list
export function removeActiveModel(modelId) {
  const index = activeModels.findIndex(m => m.id === modelId);
  if (index === -1) {
    return { success: false, message: 'Model not found' };
  }

  activeModels.splice(index, 1);
  saveActiveModels();
  
  return { success: true };
}

// Initialize on module load
loadActiveModels();
