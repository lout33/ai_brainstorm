import './style.css';
import { loadApiKey, saveApiKey, hasApiKey } from './api-key-manager.js';
import { getActiveModels, addActiveModel, removeActiveModel } from './active-models.js';
import { loadAgentModel, saveAgentModel, getAgentModel } from './agent-model-manager.js';
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
  getTotalConversations
} from './conversation-manager.js';
import { interpretCommand, findTargetConversation } from './agent-orchestrator.js';
import { getAllConversations } from './conversation-manager.js';

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const conversationIndicator = document.getElementById('conversation-indicator');

const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');

const agentModelSelect = document.getElementById('agent-model-select');

const activeModelsList = document.getElementById('active-models-list');
const modelIdInput = document.getElementById('model-id-input');
const modelNameInput = document.getElementById('model-name-input');
const addModelBtn = document.getElementById('add-model-btn');

const agentMessages = document.getElementById('agent-messages');
const agentInput = document.getElementById('agent-input');
const agentSendBtn = document.getElementById('agent-send-btn');

// Initialize
function init() {
  // Load API key
  const apiKey = loadApiKey();
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }

  // Load agent model
  const agentModel = loadAgentModel();
  agentModelSelect.value = agentModel;

  // Render active models
  renderActiveModels();

  // Setup event listeners
  saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
  agentModelSelect.addEventListener('change', handleAgentModelChange);
  addModelBtn.addEventListener('click', handleAddModel);
  agentSendBtn.addEventListener('click', handleAgentSend);
  agentInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAgentSend();
  });

  sendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
  });

  prevBtn.addEventListener('click', handlePrevConversation);
  nextBtn.addEventListener('click', handleNextConversation);

  updateConversationIndicator();
}

// API Key Management
function handleSaveApiKey() {
  const apiKey = apiKeyInput.value.trim();
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

// Agent Model Management
function handleAgentModelChange() {
  const selectedModel = agentModelSelect.value;
  if (saveAgentModel(selectedModel)) {
    console.log('Agent model changed to:', selectedModel);
  } else {
    alert('Failed to save agent model');
  }
}

// Active Models Management
function renderActiveModels() {
  const models = getActiveModels();
  activeModelsList.innerHTML = '';

  if (models.length === 0) {
    activeModelsList.innerHTML = '<div style="font-size: 12px; color: #666;">No active models</div>';
    return;
  }

  models.forEach(model => {
    const modelItem = document.createElement('div');
    modelItem.className = 'model-item';
    modelItem.innerHTML = `
      <div>
        <div class="model-name">${model.name}</div>
        <div class="model-id">${model.id}</div>
      </div>
      <button class="remove-btn" data-model-id="${model.id}">Remove</button>
    `;

    const removeBtn = modelItem.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => handleRemoveModel(model.id));

    activeModelsList.appendChild(modelItem);
  });
}

function handleAddModel() {
  const modelId = modelIdInput.value.trim();
  const modelName = modelNameInput.value.trim();

  if (!modelId || !modelName) {
    alert('Please enter both model ID and name');
    return;
  }

  const result = addActiveModel(modelId, modelName);
  if (result.success) {
    modelIdInput.value = '';
    modelNameInput.value = '';
    renderActiveModels();
  } else {
    alert(result.message);
  }
}

function handleRemoveModel(modelId) {
  if (confirm('Remove this model?')) {
    removeActiveModel(modelId);
    renderActiveModels();
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
    const command = await interpretCommand(message, agentHistory.slice(0, -1)); // Exclude loading message

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
    const sourceConv = findTargetConversation(command.sourceConversationId, allConversations);
    
    if (!sourceConv) {
      addAgentMessage('assistant', 'Could not find the source conversation');
      renderAgentMessages();
      return;
    }

    await branchConversation(sourceConv.id, command.branchCount, command.prompts);
    renderCurrentConversation();
    updateConversationIndicator();
  } catch (error) {
    console.error('Error branching conversations:', error);
    addAgentMessage('assistant', `Error branching: ${error.message}`);
    renderAgentMessages();
  }
}

// Main Chat
function renderCurrentConversation() {
  const conversation = getCurrentConversation();
  chatMessages.innerHTML = '';

  if (!conversation) {
    chatMessages.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No active conversation. Ask the agent to create some!</div>';
    return;
  }

  conversation.history.forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${msg.role}`;

    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = msg.role === 'user' 
      ? (msg.source === 'agent' ? 'Agent' : 'You')
      : conversation.modelName;

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = msg.content;

    msgDiv.appendChild(header);
    msgDiv.appendChild(content);
    chatMessages.appendChild(msgDiv);
  });

  // If conversation only has user message (waiting for response), show loading
  if (conversation.history.length === 1 && conversation.history[0].role === 'user') {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant loading';
    loadingDiv.innerHTML = `
      <div class="message-header">${conversation.modelName}</div>
      <div class="message-content">Thinking...</div>
    `;
    chatMessages.appendChild(loadingDiv);
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
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

  // Add user message to UI
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
    await sendUserMessage(message, (chunk, fullContent) => {
      // Update content as chunks arrive
      contentDiv.textContent = fullContent;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    
    // Final render to ensure everything is up to date
    renderCurrentConversation();
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
  updateConversationIndicator();
}

function handleNextConversation() {
  switchToNextConversation();
  renderCurrentConversation();
  updateConversationIndicator();
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

// Start the app
init();
