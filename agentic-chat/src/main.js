import './style.css';
import { loadApiKey, saveApiKey, hasApiKey } from './api-key-manager.js';
import { getActiveModels, addActiveModel, removeActiveModel, loadPreset, getCurrentPreset } from './active-models.js';
import { loadAgentModel, saveAgentModel } from './agent-model-manager.js';
import { parseMarkdown } from './markdown.js';
import {
  addAgentMessage,
  getAgentHistory,
  createConversations,
  branchConversation,
  sendUserMessage,
  getCurrentConversation,
  switchToNextConversation,
  switchToPreviousConversation,
  getCurrentIndex,
  getTotalConversations,
  getState,
  setState,
  onStateChange as onConversationStateChange,
  getExpandedConversations,
  setExpandedConversations,
  getRootConversations,
  getAllAgentChats,
  getCurrentAgentChat,
  createNewAgentChat,
  switchAgentChat,
  deleteAgentChat
} from './conversation-manager.js';
import { interpretCommand, findTargetConversation } from './agent-orchestrator.js';
import { getAllConversations } from './conversation-manager.js';
import { runCouncil } from './council.js';
import { renderCouncilMessage, renderCouncilLoading, renderCouncilError } from './council-message.js';
import {
  buildConversationTree,
  renderConversationTree,
  toggleConversationExpand,
  getVisibleConversations,
  expandPathToConversation,
  getExpandState,
  setExpandState
} from './conversation-tree-ui.js';
import {
  createNewSession,
  saveCurrentSession,
  loadSession,
  deleteSession,
  getAllSessions,
  getCurrentSessionId,
  autoSave,
  restoreMostRecentSession,
  onStateChange as onSessionStateChange
} from './session-manager.js';
import { renderSessionList, showDeleteConfirmation } from './session-history-ui.js';
import {
  initBranchIndicator,
  updateBranchIndicator,
  setupScrollSync,
  updateActiveDot
} from './branch-indicator.js';
import { initPanelResize } from './panel-resize.js';

// DOM Elements
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const toggleAgentPanelBtn = document.getElementById('toggle-agent-panel-btn');
const sessionHistory = document.getElementById('session-history');
const agentPanel = document.getElementById('agent-panel');
const newSessionBtn = document.getElementById('new-session-btn');

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const conversationIndicator = document.getElementById('conversation-indicator');
const conversationTreeContainer = document.getElementById('conversation-tree');
const treeIndicator = document.getElementById('tree-indicator');
const treeContainer = document.getElementById('conversation-tree-container');
const treeHeaderCenter = document.getElementById('tree-header-center');
const treeResizeHandle = document.getElementById('tree-resize-handle');

// Settings Modal Elements
const settingsBtn = document.getElementById('settings-btn');
const modalBackdrop = document.getElementById('settings-modal-backdrop');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalApiKeyInput = document.getElementById('modal-api-key-input');
const modalSaveApiKeyBtn = document.getElementById('modal-save-api-key-btn');
const modalAgentModelSelect = document.getElementById('modal-agent-model-select');
const modalPresetSelect = document.getElementById('modal-preset-select');
const modalActiveModelsList = document.getElementById('modal-active-models-list');
const modalModelIdInput = document.getElementById('modal-model-id-input');
const modalModelNameInput = document.getElementById('modal-model-name-input');
const modalAddModelBtn = document.getElementById('modal-add-model-btn');
const modalAgentModelInput = document.getElementById('modal-agent-model-input');
const modalSetAgentModelBtn = document.getElementById('modal-set-agent-model-btn');
const modalCurrentAgentModel = document.getElementById('modal-current-agent-model');

const agentMessages = document.getElementById('agent-messages');
const agentInput = document.getElementById('agent-input');
const agentSendBtn = document.getElementById('agent-send-btn');
const agentSuggestions = document.getElementById('agent-suggestions');
const agentChatSelect = document.getElementById('agent-chat-select');
const newAgentChatBtn = document.getElementById('new-agent-chat-btn');
const deleteAgentChatBtn = document.getElementById('delete-agent-chat-btn');
const agentModelDisplay = document.getElementById('agent-model-display');

// Settings Modal Functions
function openSettingsModal() {
  modalBackdrop.style.display = 'flex';
  document.body.classList.add('modal-open');

  // Load current values
  const apiKey = loadApiKey();
  if (apiKey) {
    modalApiKeyInput.value = apiKey;
  }

  // Update agent model display
  updateAgentModelDisplay();

  // Update preset dropdown to reflect current state
  updatePresetDropdown();

  renderModalActiveModels();
}

// Update the agent model display in settings and header
function updateAgentModelDisplay() {
  const agentModel = loadAgentModel();

  // Update the current model badge in settings modal
  modalCurrentAgentModel.textContent = agentModel;

  // Update the agent panel header display
  // Show a friendly name if it's a known model, otherwise show the ID
  const friendlyName = getAgentModelFriendlyName(agentModel);
  agentModelDisplay.textContent = friendlyName;
  agentModelDisplay.title = `Model: ${agentModel}\nClick Settings to change`;

  // Check if current model is in the preset list
  const option = modalAgentModelSelect.querySelector(`option[value="${agentModel}"]`);
  if (option) {
    modalAgentModelSelect.value = agentModel;
  } else {
    modalAgentModelSelect.value = '';
  }

  // Clear the custom input
  modalAgentModelInput.value = '';
}

// Get a friendly display name for a model ID
function getAgentModelFriendlyName(modelId) {
  const knownModels = {
    'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
    'x-ai/grok-4-fast': 'Grok 4 Fast',
    'openai/gpt-5-mini': 'GPT-5 Mini',
    'anthropic/claude-haiku-4.5': 'Claude Haiku 4.5',
    'anthropic/claude-opus-4.5': 'Claude Opus 4.5',
    'google/gemini-3-pro-preview': 'Gemini 3 Pro',
    'openai/gpt-5.1': 'GPT-5.1'
  };

  if (knownModels[modelId]) {
    return knownModels[modelId];
  }

  // For unknown models, try to make the ID more readable
  // e.g., "anthropic/claude-sonnet-4" -> "claude-sonnet-4"
  const parts = modelId.split('/');
  return parts.length > 1 ? parts[1] : modelId;
}

function closeSettingsModal() {
  modalBackdrop.classList.add('closing');
  setTimeout(() => {
    modalBackdrop.style.display = 'none';
    modalBackdrop.classList.remove('closing');
    document.body.classList.remove('modal-open');
  }, 200); // Match animation duration
}

function handleEscapeKey(e) {
  if (e.key === 'Escape' && modalBackdrop.style.display === 'flex') {
    closeSettingsModal();
  }
}

// Add escape key listener
document.addEventListener('keydown', handleEscapeKey);

// Modal API Key Management
function handleModalSaveApiKey() {
  const apiKey = modalApiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter an API key');
    return;
  }

  if (saveApiKey(apiKey)) {
    alert('API key saved!');
  } else {
    alert('Failed to save API key');
  }
}

// Modal Agent Model Management
function handleModalAgentModelChange() {
  const selectedModel = modalAgentModelSelect.value;
  if (!selectedModel) return; // Ignore empty selection

  if (saveAgentModel(selectedModel)) {
    console.log('Agent model changed to:', selectedModel);
    updateAgentModelDisplay();
  } else {
    alert('Failed to save agent model');
  }
}

// Handle custom agent model input
function handleSetCustomAgentModel() {
  const customModel = modalAgentModelInput.value.trim();
  if (!customModel) {
    alert('Please enter a model ID');
    return;
  }

  if (saveAgentModel(customModel)) {
    console.log('Agent model changed to:', customModel);
    updateAgentModelDisplay();
  } else {
    alert('Failed to save agent model');
  }
}

// Update preset dropdown to reflect current state
function updatePresetDropdown() {
  const currentPreset = getCurrentPreset();
  modalPresetSelect.value = currentPreset;
  
  // Add visual indicator when a preset is active
  if (currentPreset) {
    modalPresetSelect.classList.add('preset-active');
  } else {
    modalPresetSelect.classList.remove('preset-active');
  }
}

// Modal Active Models Management
function handleModalPresetChange() {
  const presetName = modalPresetSelect.value;
  if (!presetName) return;
  
  const result = loadPreset(presetName);
  if (result.success) {
    renderModalActiveModels();
    updatePresetDropdown(); // Update dropdown to show selected preset
  } else {
    alert(result.message);
  }
}

function renderModalActiveModels() {
  const models = getActiveModels();
  modalActiveModelsList.innerHTML = '';

  if (models.length === 0) {
    modalActiveModelsList.innerHTML = '<div style="font-size: 14px; color: var(--text-tertiary); padding: var(--space-4); text-align: center;">No active models</div>';
    return;
  }

  models.forEach(model => {
    const modelItem = document.createElement('div');
    modelItem.className = 'modal-model-item';
    modelItem.innerHTML = `
      <div class="modal-model-info">
        <div class="modal-model-name">${model.name}</div>
        <div class="modal-model-id">${model.id}</div>
      </div>
      <button class="modal-remove-btn" data-model-id="${model.id}">Remove</button>
    `;

    const removeBtn = modelItem.querySelector('.modal-remove-btn');
    removeBtn.addEventListener('click', () => handleModalRemoveModel(model.id));

    modalActiveModelsList.appendChild(modelItem);
  });
}

function handleModalAddModel() {
  const modelId = modalModelIdInput.value.trim();
  const modelName = modalModelNameInput.value.trim();

  if (!modelId || !modelName) {
    alert('Please enter both model ID and name');
    return;
  }

  const result = addActiveModel(modelId, modelName);
  if (result.success) {
    modalModelIdInput.value = '';
    modalModelNameInput.value = '';
    renderModalActiveModels();
    updatePresetDropdown(); // Update dropdown (will be empty since custom)
  } else {
    alert(result.message);
  }
}

function handleModalRemoveModel(modelId) {
  if (confirm('Remove this model?')) {
    removeActiveModel(modelId);
    renderModalActiveModels();
    updatePresetDropdown(); // Update dropdown (might match a preset or be empty)
  }
}

// Initialize
function init() {
  // Setup session manager callbacks
  onSessionStateChange(() => getState());
  onConversationStateChange(() => {
    autoSave();
    renderCurrentConversation();
    renderTree();
  });
  
  // Restore most recent session
  const session = restoreMostRecentSession();
  if (session) {
    setState(session);
  }
  
  // Load API key into modal
  const apiKey = loadApiKey();
  if (apiKey) {
    modalApiKeyInput.value = apiKey;
  }

  // Load agent model and update display
  updateAgentModelDisplay();

  // Load current preset into modal (auto-detected or saved)
  updatePresetDropdown();

  // Initialize branch indicator
  const mainChat = document.querySelector('.main-chat');
  initBranchIndicator(mainChat);
  setupScrollSync(chatMessages);

  // Initialize panel resize functionality
  initPanelResize();

  // Initialize tree resize and collapse
  initTreeResize();
  treeHeaderCenter.addEventListener('click', handleToggleTreeCollapse);

  // Render UI
  renderModalActiveModels();
  renderSessionHistory();
  renderAgentChatSelector();
  renderAgentMessages();
  renderAgentSuggestions();
  renderCurrentConversation();
  renderTree();
  updateConversationIndicator();
  updateBranchIndicatorFromConversation();
  
  // Set initial toggle button states
  toggleSidebarBtn.textContent = '◀';
  toggleSidebarBtn.title = 'Hide Sessions';
  toggleAgentPanelBtn.textContent = '▶';
  toggleAgentPanelBtn.title = 'Hide Agent Chat';

  // Setup event listeners
  toggleSidebarBtn.addEventListener('click', handleToggleSidebar);
  toggleAgentPanelBtn.addEventListener('click', handleToggleAgentPanel);
  newSessionBtn.addEventListener('click', handleNewSession);
  
  // Settings modal listeners
  settingsBtn.addEventListener('click', openSettingsModal);
  modalCloseBtn.addEventListener('click', closeSettingsModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeSettingsModal();
  });
  modalSaveApiKeyBtn.addEventListener('click', handleModalSaveApiKey);
  modalAgentModelSelect.addEventListener('change', handleModalAgentModelChange);
  modalSetAgentModelBtn.addEventListener('click', handleSetCustomAgentModel);
  modalAgentModelInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSetCustomAgentModel();
    }
  });
  modalPresetSelect.addEventListener('change', handleModalPresetChange);
  modalAddModelBtn.addEventListener('click', handleModalAddModel);
  
  // Agent chat management
  newAgentChatBtn.addEventListener('click', handleNewAgentChat);
  agentChatSelect.addEventListener('change', handleAgentChatChange);
  deleteAgentChatBtn.addEventListener('click', handleDeleteAgentChat);

  agentSendBtn.addEventListener('click', handleAgentSend);
  agentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAgentSend();
    }
  });

  // Auto-grow agent textarea
  agentInput.addEventListener('input', () => {
    agentInput.style.height = 'auto';
    agentInput.style.height = Math.min(agentInput.scrollHeight, 200) + 'px';
  });

  sendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  
  // Auto-grow textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
    
    // Enable/disable send button based on content
    sendBtn.disabled = !chatInput.value.trim();
  });

  prevBtn.addEventListener('click', handlePrevConversation);
  nextBtn.addEventListener('click', handleNextConversation);
}

// Sidebar Toggle
function handleToggleSidebar() {
  sessionHistory.classList.toggle('collapsed');
  updateToggleButton();
}

function updateToggleButton() {
  if (sessionHistory.classList.contains('collapsed')) {
    toggleSidebarBtn.textContent = '▶';
    toggleSidebarBtn.title = 'Show Sessions';
  } else {
    toggleSidebarBtn.textContent = '◀';
    toggleSidebarBtn.title = 'Hide Sessions';
  }
}

// Agent Panel Toggle
function handleToggleAgentPanel() {
  agentPanel.classList.toggle('collapsed');
  updateAgentPanelToggleButton();
}

function updateAgentPanelToggleButton() {
  if (agentPanel.classList.contains('collapsed')) {
    toggleAgentPanelBtn.textContent = '◀';
    toggleAgentPanelBtn.title = 'Show Agent Chat';
  } else {
    toggleAgentPanelBtn.textContent = '▶';
    toggleAgentPanelBtn.title = 'Hide Agent Chat';
  }
}

// Conversation Tree Collapse/Expand
function handleToggleTreeCollapse() {
  treeContainer.classList.toggle('collapsed');
  saveTreeCollapseState();
}

function saveTreeCollapseState() {
  const isCollapsed = treeContainer.classList.contains('collapsed');
  localStorage.setItem('tree-collapsed', isCollapsed ? 'true' : 'false');
}

function loadTreeCollapseState() {
  const saved = localStorage.getItem('tree-collapsed');
  if (saved === 'true') {
    treeContainer.classList.add('collapsed');
  }
}

// Tree Resize
let isResizingTree = false;
let treeStartY = 0;
let treeStartHeight = 0;

function initTreeResize() {
  // Load saved height
  const savedHeight = localStorage.getItem('tree-height');
  if (savedHeight) {
    treeContainer.style.maxHeight = savedHeight;
  }

  // Load collapse state
  loadTreeCollapseState();

  treeResizeHandle.addEventListener('mousedown', startTreeResize);
  treeResizeHandle.addEventListener('touchstart', startTreeResizeTouch, { passive: false });
  document.addEventListener('mousemove', doTreeResize);
  document.addEventListener('mouseup', stopTreeResize);
  document.addEventListener('touchmove', doTreeResizeTouch, { passive: false });
  document.addEventListener('touchend', stopTreeResize);
}

function startTreeResize(e) {
  if (treeContainer.classList.contains('collapsed')) return;
  e.preventDefault();
  isResizingTree = true;
  treeStartY = e.clientY;
  treeStartHeight = treeContainer.offsetHeight;
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
}

function startTreeResizeTouch(e) {
  if (treeContainer.classList.contains('collapsed')) return;
  e.preventDefault();
  isResizingTree = true;
  treeStartY = e.touches[0].clientY;
  treeStartHeight = treeContainer.offsetHeight;
}

function doTreeResize(e) {
  if (!isResizingTree) return;
  e.preventDefault();
  const deltaY = e.clientY - treeStartY;
  const newHeight = Math.max(100, Math.min(window.innerHeight * 0.7, treeStartHeight + deltaY));
  treeContainer.style.maxHeight = `${newHeight}px`;
}

function doTreeResizeTouch(e) {
  if (!isResizingTree) return;
  e.preventDefault();
  const deltaY = e.touches[0].clientY - treeStartY;
  const newHeight = Math.max(100, Math.min(window.innerHeight * 0.7, treeStartHeight + deltaY));
  treeContainer.style.maxHeight = `${newHeight}px`;
}

function stopTreeResize() {
  if (!isResizingTree) return;
  isResizingTree = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  // Save the new height
  localStorage.setItem('tree-height', treeContainer.style.maxHeight);
}

// Session Management
function renderSessionHistory() {
  const sessions = getAllSessions();
  const currentSessionId = getCurrentSessionId();
  renderSessionList(sessions, currentSessionId, handleSessionSelect, handleDeleteSession);
}

function handleNewSession() {
  try {
    const newSession = createNewSession();
    setState(newSession);
    renderSessionHistory();
    renderAgentChatSelector();
    renderAgentMessages();
    renderAgentSuggestions();
    renderCurrentConversation();
    renderTree();
    updateConversationIndicator();
  } catch (error) {
    console.error('Error creating new session:', error);
    alert(`Error creating new session: ${error.message}`);
  }
}

function handleSessionSelect(sessionId) {
  try {
    const session = loadSession(sessionId);
    setState(session);
    renderSessionHistory();
    renderAgentChatSelector();
    renderAgentMessages();
    renderAgentSuggestions();
    renderCurrentConversation();
    renderTree();
    updateConversationIndicator();
  } catch (error) {
    console.error('Error loading session:', error);
    alert(`Error loading session: ${error.message}`);
  }
}

function handleDeleteSession(sessionId) {
  try {
    const sessions = getAllSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (!session) return;

    if (!showDeleteConfirmation(session.name)) {
      return;
    }

    const nextSession = deleteSession(sessionId);

    if (nextSession) {
      setState(nextSession);
    } else {
      // No sessions left, create new one
      const newSession = createNewSession();
      setState(newSession);
    }

    renderSessionHistory();
    renderAgentChatSelector();
    renderAgentMessages();
    renderAgentSuggestions();
    renderCurrentConversation();
    renderTree();
    updateConversationIndicator();
  } catch (error) {
    console.error('Error deleting session:', error);
    alert(`Error deleting session: ${error.message}`);
  }
}



// Agent Chat Selector
function renderAgentChatSelector() {
  const chats = getAllAgentChats();
  const currentChat = getCurrentAgentChat();

  agentChatSelect.innerHTML = '';

  chats.forEach(chat => {
    const option = document.createElement('option');
    option.value = chat.id;
    option.textContent = chat.name + (chat.messageCount > 0 ? ` (${chat.messageCount})` : '');
    if (currentChat && chat.id === currentChat.id) {
      option.selected = true;
    }
    agentChatSelect.appendChild(option);
  });
}

function handleNewAgentChat() {
  createNewAgentChat();
  renderAgentChatSelector();
  renderAgentMessages();
  renderAgentSuggestions();
}

function handleAgentChatChange() {
  const selectedId = agentChatSelect.value;
  if (selectedId) {
    switchAgentChat(selectedId);
    renderAgentMessages();
    renderAgentSuggestions();
  }
}

function handleDeleteAgentChat() {
  const currentChat = getCurrentAgentChat();
  if (!currentChat) return;

  const chats = getAllAgentChats();

  if (chats.length <= 1) {
    // Only one chat, confirm clearing it
    if (confirm('Clear the current agent chat?')) {
      deleteAgentChat(currentChat.id);
      renderAgentChatSelector();
      renderAgentMessages();
      renderAgentSuggestions();
    }
  } else {
    // Multiple chats, confirm deletion
    if (confirm(`Delete "${currentChat.name}"?`)) {
      deleteAgentChat(currentChat.id);
      renderAgentChatSelector();
      renderAgentMessages();
      renderAgentSuggestions();
    }
  }
}

// Agent Chat
function renderAgentMessages() {
  const history = getAgentHistory();
  agentMessages.innerHTML = '';

  // Show welcome screen when empty
  if (history.length === 0) {
    const welcome = document.createElement('div');
    welcome.className = 'agent-welcome';
    welcome.innerHTML = `
      <div class="agent-welcome-icon">🤖</div>
      <div class="agent-welcome-title">AI Brainstorm Agent</div>
      <div class="agent-welcome-text">
        I orchestrate multiple AI models to brainstorm, compare perspectives, and find the best answers through consensus.
      </div>
      <div class="agent-welcome-section">
        <div class="agent-welcome-section-title">🚀 Quick Start - Full Council Workflow</div>
        <button class="agent-welcome-suggestion featured" data-prompt="Ask all models: What are the pros and cons of remote work vs office work? Then let me use the Council to find the best answer.">
          <span class="suggestion-title">Try the AI Council</span>
          <span class="suggestion-desc">Ask multiple models, then use Council to synthesize the best answer</span>
        </button>
      </div>
      <div class="agent-welcome-section">
        <div class="agent-welcome-section-title">💬 Example Prompts</div>
        <button class="agent-welcome-suggestion" data-prompt="Ask all models: What's the best programming language for beginners in 2024?">
          <span class="suggestion-title">Compare AI opinions</span>
          <span class="suggestion-desc">Get different perspectives on a topic</span>
        </button>
        <button class="agent-welcome-suggestion" data-prompt="Brainstorm 5 creative startup ideas in the AI space">
          <span class="suggestion-title">Brainstorm ideas</span>
          <span class="suggestion-desc">Generate creative suggestions with multiple AIs</span>
        </button>
        <button class="agent-welcome-suggestion" data-prompt="Explain quantum computing in simple terms">
          <span class="suggestion-title">Learn a concept</span>
          <span class="suggestion-desc">Get explanations from different models</span>
        </button>
      </div>
      <div class="agent-welcome-section">
        <div class="agent-welcome-section-title">📖 How It Works</div>
        <button class="agent-welcome-suggestion" data-prompt="What can you do? Explain all your features.">
          <span class="suggestion-title">Show all features</span>
          <span class="suggestion-desc">Learn what I can help you with</span>
        </button>
        <button class="agent-welcome-suggestion" data-prompt="How do I use the Council feature to get consensus from multiple AIs?">
          <span class="suggestion-title">Council explained</span>
          <span class="suggestion-desc">Understand the AI consensus feature</span>
        </button>
      </div>
    `;

    // Add click handlers for suggestions
    welcome.querySelectorAll('.agent-welcome-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        agentInput.value = btn.dataset.prompt;
        agentInput.focus();
        agentInput.style.height = 'auto';
        agentInput.style.height = Math.min(agentInput.scrollHeight, 200) + 'px';
      });
    });

    agentMessages.appendChild(welcome);
    return;
  }

  history.forEach((msg, index) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `agent-message ${msg.role}`;
    msgDiv.dataset.messageIndex = index;

    // Check if this is a council result message
    if (msg.councilResult) {
      msgDiv.classList.add('council-message');
      try {
        msgDiv.innerHTML = renderCouncilMessage(msg.councilResult);
      } catch (e) {
        console.error('Error rendering council message:', e);
        msgDiv.textContent = 'Error displaying council results';
      }
    } else if (msg.councilLoading) {
      msgDiv.innerHTML = renderCouncilLoading(msg.councilLoading);
    } else if (msg.councilError) {
      msgDiv.innerHTML = renderCouncilError(msg.councilError);
    } else {
      // Render markdown for assistant messages, plain text for user
      if (msg.role === 'assistant') {
        msgDiv.innerHTML = `<div class="md-content">${parseMarkdown(msg.content || '')}</div>`;
      } else {
        msgDiv.textContent = msg.content || '';
      }
    }

    agentMessages.appendChild(msgDiv);
  });

  agentMessages.scrollTop = agentMessages.scrollHeight;
}

// Agent Suggestions (Council button, etc.)
function renderAgentSuggestions() {
  if (!agentSuggestions) {
    console.error('agentSuggestions element not found');
    return;
  }

  const roots = getRootConversations();

  // Count responses that have completed (have assistant response)
  const completedResponses = roots.filter(c =>
    c.history.some(m => m.role === 'assistant' && !m.content.startsWith('Error:'))
  );

  // Show council button only when 2+ completed responses exist
  if (completedResponses.length >= 2) {
    agentSuggestions.innerHTML = `
      <div class="suggestions-label">Suggestions:</div>
      <button id="council-btn" class="suggestion-btn">
        <span class="suggestion-icon">🏛️</span>
        <span class="suggestion-text">Consult Council</span>
      </button>
    `;
    const councilBtn = document.getElementById('council-btn');
    if (councilBtn) {
      councilBtn.addEventListener('click', handleConsultCouncil);
    }
  } else {
    agentSuggestions.innerHTML = '';
  }
}

// Council Handler
async function handleConsultCouncil() {
  if (!hasApiKey()) {
    alert('Please configure your API key first');
    return;
  }

  const apiKey = loadApiKey();
  const roots = getRootConversations();

  // Get the original user query from the first conversation
  const userQuery = roots[0]?.history.find(m => m.role === 'user')?.content || '';

  // Gather responses from root conversations
  const responses = roots.map(c => ({
    modelId: c.modelId,
    modelName: c.modelName,
    content: c.history.find(m => m.role === 'assistant')?.content
  })).filter(r => r.content && !r.content.startsWith('Error:'));

  if (responses.length < 2) {
    alert('Need at least 2 completed responses to consult the council');
    return;
  }

  // Hide suggestions while processing
  agentSuggestions.innerHTML = '';

  // Show initial status
  addAgentMessage('assistant', `🏛️ Consulting the Council with ${responses.length} responses...`);
  renderAgentMessages();

  try {
    // Import council functions dynamically to show progress
    const { collectRankings, synthesizeFinal, calculateAggregateRankings } = await import('./council.js');

    // Stage 2: Collect rankings
    updateLastAgentMessage('🏛️ Stage 1/2: Collecting peer rankings...');
    renderAgentMessages();

    const { rankings, labelToModel } = await collectRankings(userQuery, responses, apiKey);
    const aggregateRankings = calculateAggregateRankings(rankings, labelToModel);

    // Stage 3: Synthesis
    updateLastAgentMessage('🏛️ Stage 2/2: Chairman synthesizing final answer...');
    renderAgentMessages();

    const synthesis = await synthesizeFinal(userQuery, responses, rankings, responses[0].modelId, apiKey);

    // Build result object
    const result = { rankings, labelToModel, aggregateRankings, synthesis };

    // Add council result as a new agent message
    const councilResultMsg = addAgentMessage('assistant', '');
    councilResultMsg.councilResult = result;

    renderAgentMessages();
    renderAgentSuggestions();

  } catch (error) {
    console.error('Council error:', error);

    // Remove status message and add error
    const history = getAgentHistory();
    history.pop();

    addAgentMessage('assistant', `❌ Council Error: ${error.message}`);
    renderAgentMessages();
    renderAgentSuggestions();
  }
}

// Helper to update the last agent message
function updateLastAgentMessage(content) {
  const history = getAgentHistory();
  if (history.length > 0) {
    history[history.length - 1].content = content;
  }
}

async function handleAgentSend() {
  const message = agentInput.value.trim();
  if (!message) return;

  if (!hasApiKey()) {
    alert('Please configure your API key first');
    return;
  }

  // Add user message
  addAgentMessage('user', message);
  renderAgentMessages();
  agentInput.value = '';
  agentInput.style.height = 'auto'; // Reset textarea height

  // Show loading
  const loadingMsg = addAgentMessage('assistant', 'Thinking...');
  renderAgentMessages();

  try {
    const agentHistory = getAgentHistory();
    const currentConv = getCurrentConversation(); // Get current conversation for context
    const command = await interpretCommand(message, agentHistory.slice(0, -1), currentConv); // Exclude loading message

    // Remove loading message
    getAgentHistory().pop();

    // Add agent response
    addAgentMessage('assistant', command.response);
    renderAgentMessages();

    // Execute command
    if (command.action === 'create_conversations') {
      await handleCreateConversations(command);
    } else if (command.action === 'continue_conversations') {
      await handleContinueConversations(command);
    }
  } catch (error) {
    getAgentHistory().pop(); // Remove loading
    addAgentMessage('assistant', `Error: ${error.message}`);
    renderAgentMessages();
  }
}

async function handleCreateConversations(command) {
  try {
    // Show conversations immediately as they're created
    await createConversations(command.modelIds, command.initialPrompt, (conversations) => {
      renderCurrentConversation();
      renderTree();
      updateConversationIndicator();
      renderAgentSuggestions(); // Update suggestions when responses come in
    });
  } catch (error) {
    console.error('Error creating conversations:', error);
    addAgentMessage('assistant', `Error creating conversations: ${error.message}`);
    renderAgentMessages();
  }
}

async function handleContinueConversations(command) {
  try {
    const allConversations = getAllConversations();
    const currentConv = getCurrentConversation();
    const sourceConv = findTargetConversation(command.sourceConversationId, allConversations, currentConv);
    
    if (!sourceConv) {
      addAgentMessage('assistant', 'Could not find the source conversation');
      renderAgentMessages();
      return;
    }

    await branchConversation(sourceConv.id, command.branchCount, command.prompts, {
      source: 'agent' // Agent-initiated branches
    });
    
    // Auto-expand the parent to show new branches
    expandPathToConversation(sourceConv.id, getAllConversations());
    toggleConversationExpand(sourceConv.id); // Ensure parent is expanded
    
    // Sync expand state
    const expandedIds = getExpandState();
    setExpandedConversations(expandedIds);
    
    renderCurrentConversation();
    renderTree();
    updateConversationIndicator();
  } catch (error) {
    console.error('Error branching conversations:', error);
    addAgentMessage('assistant', `Error branching: ${error.message}`);
    renderAgentMessages();
  }
}

// Helper function to update branch indicator
function updateBranchIndicatorFromConversation() {
  const conversation = getCurrentConversation();
  
  if (!conversation || !conversation.history) {
    updateBranchIndicator([], null);
    return;
  }
  
  // Map conversation history to message objects with IDs
  const messages = conversation.history.map((msg, index) => ({
    id: `msg-${index}`,
    content: msg.content,
    role: msg.role,
    isBranchPoint: false // TODO: Detect actual branch points
  }));
  
  // Set the last message as active
  const activeMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  
  updateBranchIndicator(messages, activeMessageId);
}

// Main Chat
function renderCurrentConversation() {
  const conversation = getCurrentConversation();
  chatMessages.innerHTML = '';

  if (!conversation) {
    chatMessages.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-tertiary);">No active conversation. Ask the agent to create some!</div>';
    updateBranchIndicator([], null);
    return;
  }

  conversation.history.forEach((msg, index) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${msg.role}`;
    msgDiv.dataset.messageId = `msg-${index}`;
    msgDiv.dataset.messageIndex = index;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = msg.role === 'user' 
      ? (msg.source === 'agent' ? 'Agent' : 'You')
      : conversation.modelName;

    const content = document.createElement('div');
    content.className = 'message-content';
    // Render markdown for assistant messages
    if (msg.role === 'assistant') {
      content.innerHTML = parseMarkdown(msg.content);
      content.classList.add('md-content');
    } else {
      content.textContent = msg.content;
    }

    bubble.appendChild(header);
    bubble.appendChild(content);
    msgDiv.appendChild(bubble);
    chatMessages.appendChild(msgDiv);
  });

  // If last message is from user (waiting for response), show loading
  const lastMsg = conversation.history[conversation.history.length - 1];
  if (lastMsg && lastMsg.role === 'user') {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant loading';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = `
      <div class="message-header">${conversation.modelName}</div>
      <div class="message-content">Thinking...</div>
    `;
    loadingDiv.appendChild(bubble);
    chatMessages.appendChild(loadingDiv);
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Update branch indicator
  updateBranchIndicatorFromConversation();
}

async function handleSendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  const conversation = getCurrentConversation();
  if (!conversation) {
    alert('No active conversation. Ask the agent to create one first!');
    return;
  }

  chatInput.value = '';
  sendBtn.disabled = true;

  // Show user message immediately in current conversation
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message user';
  msgDiv.innerHTML = `
    <div class="message-header">You</div>
    <div class="message-content">${message}</div>
  `;
  chatMessages.appendChild(msgDiv);

  // Add streaming message container
  const streamingDiv = document.createElement('div');
  streamingDiv.className = 'message assistant';
  streamingDiv.innerHTML = `
    <div class="message-header">${conversation.modelName}</div>
    <div class="message-content"></div>
  `;
  chatMessages.appendChild(streamingDiv);
  const contentDiv = streamingDiv.querySelector('.message-content');
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    // Create a branch from the current conversation with streaming
    const newBranches = await branchConversation(conversation.id, 1, [message], {
      source: 'user',
      onBranchCreated: (branches) => {
        // Branch created, now waiting for response
      },
      onStreamChunk: (chunk, fullContent, branch) => {
        // Update streaming content
        contentDiv.textContent = fullContent;
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    });
    
    // Auto-expand the parent to show new branch
    expandPathToConversation(conversation.id, getAllConversations());
    toggleConversationExpand(conversation.id); // Ensure parent is expanded
    
    // Sync expand state
    const expandedIds = getExpandState();
    setExpandedConversations(expandedIds);
    
    // Switch to the new branch (it's the last conversation added)
    const allConversations = getAllConversations();
    const newBranchIndex = allConversations.length - 1;
    
    // Navigate to the new branch
    while (getCurrentIndex() !== newBranchIndex) {
      switchToNextConversation();
    }
    
    // Render everything
    renderCurrentConversation();
    renderTree();
    updateConversationIndicator();
  } catch (error) {
    console.error('Error sending message:', error);
    streamingDiv.classList.add('error');
    contentDiv.textContent = `Error: ${error.message}`;
  } finally {
    sendBtn.disabled = false;
  }
}

function handlePrevConversation() {
  switchToPreviousConversation();
  renderCurrentConversation();
  renderTree();
  updateConversationIndicator();
  updateBranchIndicatorFromConversation();
}

function handleNextConversation() {
  switchToNextConversation();
  renderCurrentConversation();
  renderTree();
  updateConversationIndicator();
  updateBranchIndicatorFromConversation();
}

function updateConversationIndicator() {
  const total = getTotalConversations();
  if (total === 0) {
    conversationIndicator.textContent = 'No conversations';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  } else {
    const current = getCurrentIndex() + 1;
    conversationIndicator.textContent = `Response ${current} of ${total}`;
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  }
}

// Render conversation tree
function renderTree() {
  const allConversations = getAllConversations();
  const currentConv = getCurrentConversation();
  const currentId = currentConv ? currentConv.id : null;
  
  // Sync expand state from conversation manager to tree UI
  const expandedIds = getExpandedConversations();
  setExpandState(expandedIds);
  
  if (allConversations.length === 0) {
    conversationTreeContainer.innerHTML = '<div class="tree-empty">No conversations yet. Ask the agent to create some!</div>';
    treeIndicator.textContent = '0 conversations';
    return;
  }
  
  // Build tree structure
  const treeRoots = buildConversationTree(allConversations);
  const visibleConversations = getVisibleConversations(treeRoots);
  
  // Update indicator with current conversation info
  const hiddenCount = allConversations.length - visibleConversations.length;
  let indicatorText = '';
  if (hiddenCount > 0) {
    indicatorText = `${visibleConversations.length} visible (${hiddenCount} hidden)`;
  } else {
    indicatorText = `${allConversations.length} conversation${allConversations.length === 1 ? '' : 's'}`;
  }
  
  // Add current conversation model name
  if (currentConv) {
    indicatorText += ` • ${currentConv.modelName}`;
  }
  
  treeIndicator.textContent = indicatorText;
  
  // Render tree
  const treeElement = renderConversationTree(
    treeRoots,
    currentId,
    handleTreeSelect,
    handleTreeToggle
  );
  
  conversationTreeContainer.innerHTML = '';
  conversationTreeContainer.appendChild(treeElement);
}

// Handle tree node selection
function handleTreeSelect(conversationId) {
  const allConversations = getAllConversations();
  const targetIndex = allConversations.findIndex(c => c.id === conversationId);
  
  if (targetIndex !== -1) {
    // Expand path to this conversation if it's hidden
    expandPathToConversation(conversationId, allConversations);
    
    // Switch to this conversation
    while (getCurrentIndex() !== targetIndex) {
      if (getCurrentIndex() < targetIndex) {
        switchToNextConversation();
      } else {
        switchToPreviousConversation();
      }
    }
    
    renderCurrentConversation();
    renderTree();
    updateConversationIndicator();
    updateBranchIndicatorFromConversation();
  }
}

// Handle tree expand/collapse toggle
function handleTreeToggle(conversationId) {
  toggleConversationExpand(conversationId);
  
  // Sync expand state back to conversation manager for persistence
  const expandedIds = getExpandState();
  setExpandedConversations(expandedIds);
  
  renderTree();
}

// Start the app
init();
