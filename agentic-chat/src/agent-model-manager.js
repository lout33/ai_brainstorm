// Agent Model Manager
// Manages which model is used as the agent orchestrator

const AGENT_MODEL_STORAGE_KEY = 'agentic_chat_agent_model';
const DEFAULT_AGENT_MODEL = 'x-ai/grok-4-fast';

let currentAgentModel = null;

// Load agent model from localStorage
export function loadAgentModel() {
  if (currentAgentModel) {
    return currentAgentModel;
  }
  
  try {
    const stored = localStorage.getItem(AGENT_MODEL_STORAGE_KEY);
    currentAgentModel = stored || DEFAULT_AGENT_MODEL;
    return currentAgentModel;
  } catch (error) {
    console.error('Failed to load agent model:', error);
    return DEFAULT_AGENT_MODEL;
  }
}

// Save agent model to localStorage
export function saveAgentModel(modelId) {
  try {
    localStorage.setItem(AGENT_MODEL_STORAGE_KEY, modelId);
    currentAgentModel = modelId;
    return true;
  } catch (error) {
    console.error('Failed to save agent model:', error);
    return false;
  }
}

// Get current agent model
export function getAgentModel() {
  return currentAgentModel || loadAgentModel();
}
