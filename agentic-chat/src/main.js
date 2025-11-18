import './style.css';
import { loadApiKey, saveApiKey, hasApiKey } from './api-key-manager.js';
import { getActiveModels, addActiveModel, removeActiveModel, loadPreset } from './active-models.js';
import { loadAgentModel, saveAgentModel } from './agent-model-manager.js';
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
  setExpandedConversations
} from './conversation-manager.js';
import { interpretCommand, findTargetConversation } from './agent-orchestrator.js';
import { getAllConversations } from './conversation-manager.js';
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

const agentMessages = document.getElementById('agent-messages');
const agentInput = document.getElementById('agent-input');
const agentSendBtn = document.getElementById('agent-send-btn');

// Settings Modal Functions
function openSettingsModal() {
  modalBackdrop.style.display = 'flex';
  document.body.classList.add('modal-open');
  
  // Load current values
  const apiKey = loadApiKey();
  if (apiKey) {
    modalApiKeyInput.value = apiKey;
  }
  
  const agentModel = loadAgentModel();
  modalAgentModelSelect.value = agentModel;
  
  renderModalActiveModels();
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
  if (saveAgentModel(selectedModel)) {
    console.log('Agent model changed to:', selectedModel);
  } else {
    alert('Failed to save agent model');
  }
}

// Modal Active Models Management
function handleModalPresetChange() {
  const presetName = modalPresetSelect.value;
  if (!presetName) return;
  
  const result = loadPreset(presetName);
  if (result.success) {
    renderModalActiveModels();
    modalPresetSelect.value = ''; // Reset dropdown
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
  } else {
    alert(result.message);
  }
}

function handleModalRemoveModel(modelId) {
  if (confirm('Remove this model?')) {
    removeActiveModel(modelId);
    renderModalActiveModels();
  }
}

// Initialize
function init() {
  // Setup session manager callbacks
  onSessionStateChange(() => getState());
  onConversationStateChange(() => autoSave());
  
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

  // Load agent model into modal
  const agentModel = loadAgentModel();
  modalAgentModelSelect.value = agentModel;

  // Initialize branch indicator
  const mainChat = document.querySelector('.main-chat');
  initBranchIndicator(mainChat);
  setupScrollSync(chatMessages);

  // Render UI
  renderModalActiveModels();
  renderSessionHistory();
  renderAgentMessages();
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
  modalPresetSelect.addEventListener('change', handleModalPresetChange);
  modalAddModelBtn.addEventListener('click', handleModalAddModel);
  
  agentSendBtn.addEventListener('click', handleAgentSend);
  agentInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAgentSend();
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
    renderAgentMessages();
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
    renderAgentMessages();
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
    renderAgentMessages();
    renderCurrentConversation();
    updateConversationIndicator();
  } catch (error) {
    console.error('Error deleting session:', error);
    alert(`Error deleting session: ${error.message}`);
  }
}



// Agent Chat
function renderAgentMessages() {
  const history = getAgentHistory();
  agentMessages.innerHTML = '';

  history.forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `agent-message ${msg.role}`;
    msgDiv.textContent = msg.content;
    agentMessages.appendChild(msgDiv);
  });

  agentMessages.scrollTop = agentMessages.scrollHeight;
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
    content.textContent = msg.content;

    bubble.appendChild(header);
    bubble.appendChild(content);
    msgDiv.appendChild(bubble);
    chatMessages.appendChild(msgDiv);
  });

  // If conversation only has user message (waiting for response), show loading
  if (conversation.history.length === 1 && conversation.history[0].role === 'user') {
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
