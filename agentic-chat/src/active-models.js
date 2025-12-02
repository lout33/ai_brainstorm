// Active Models Manager
// Manages user's list of active models for conversations

const STORAGE_KEY = 'agentic_chat_active_models';
const PRESET_STORAGE_KEY = 'agentic_chat_selected_preset';

// Model presets
export const MODEL_PRESETS = {
  max: [
    { id: 'openai/gpt-5.1', name: 'GPT-5.1' },
    { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5' },
    { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' }
  ],
  'fast-cheap': [
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'x-ai/grok-4-fast', name: 'Grok 4 Fast' },
    { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini' },
    { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5' }
  ],
  exp: [
    { id: 'moonshotai/kimi-k2-thinking', name: 'Kimi K2 Thinking' },
    { id: 'minimax/minimax-m2', name: 'Minimax M2' },
    { id: 'qwen/qwen3-vl-235b-a22b-thinking', name: 'Qwen3 VL Thinking' },
    { id: 'deepseek/deepseek-v3.2-exp', name: 'DeepSeek V3.2 Exp' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B' },
    { id: 'z-ai/glm-4.6', name: 'GLM 4.6' }
  ]
};

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
  clearSelectedPreset(); // Clear preset when manually adding models
  
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
  clearSelectedPreset(); // Clear preset when manually removing models
  
  return { success: true };
}

// Load a preset configuration
export function loadPreset(presetName) {
  const preset = MODEL_PRESETS[presetName];
  if (!preset) {
    return { success: false, message: 'Preset not found' };
  }

  // Replace active models with preset
  activeModels = preset.map(model => ({
    ...model,
    addedAt: Date.now()
  }));
  
  saveActiveModels();
  saveSelectedPreset(presetName);
  return { success: true, models: activeModels };
}

// Save selected preset to localStorage
export function saveSelectedPreset(presetName) {
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, presetName);
  } catch (error) {
    console.error('Failed to save selected preset:', error);
  }
}

// Load selected preset from localStorage
export function loadSelectedPreset() {
  try {
    return localStorage.getItem(PRESET_STORAGE_KEY) || '';
  } catch (error) {
    console.error('Failed to load selected preset:', error);
    return '';
  }
}

// Clear selected preset (when models are manually modified)
export function clearSelectedPreset() {
  try {
    localStorage.removeItem(PRESET_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear selected preset:', error);
  }
}

// Detect which preset matches the current active models
export function detectCurrentPreset() {
  // Get current model IDs (sorted for comparison)
  const currentModelIds = activeModels.map(m => m.id).sort();
  
  // Check each preset
  for (const [presetName, presetModels] of Object.entries(MODEL_PRESETS)) {
    const presetModelIds = presetModels.map(m => m.id).sort();
    
    // Check if arrays match
    if (currentModelIds.length === presetModelIds.length &&
        currentModelIds.every((id, index) => id === presetModelIds[index])) {
      return presetName;
    }
  }
  
  // No matching preset found
  return '';
}

// Get the current preset (either saved or detected)
export function getCurrentPreset() {
  // First check if there's a saved preset
  const savedPreset = loadSelectedPreset();
  
  // Verify the saved preset still matches current models
  if (savedPreset) {
    const detectedPreset = detectCurrentPreset();
    if (detectedPreset === savedPreset) {
      return savedPreset;
    }
    // Saved preset doesn't match anymore, clear it
    clearSelectedPreset();
  }
  
  // Try to detect preset from current models
  return detectCurrentPreset();
}

// Get available presets
export function getPresets() {
  return Object.keys(MODEL_PRESETS);
}

// Initialize on module load
loadActiveModels();
