// Conversation Manager
// Manages TWO separate conversation histories:
// 1. Agent chat history (right panel) - now supports multiple agent chats
// 2. Model conversations (main chat, left panel)

import { sendChatCompletion, extractMessageContent, sendStreamingChatCompletion } from './openrouter-client.js';
import { loadApiKey } from './api-key-manager.js';

// State
let agentChats = []; // Array of agent chat objects { id, name, history, createdAt }
let currentAgentChatIndex = 0;
let agentChatIdCounter = 1;
let conversations = [];
let currentConversationIndex = 0;
let conversationIdCounter = 1;
let expandedConversations = []; // Track expanded conversation IDs

// Initialize with a default agent chat
function ensureAgentChat() {
  if (agentChats.length === 0) {
    agentChats.push({
      id: String(agentChatIdCounter++),
      name: 'Agent Chat 1',
      history: [],
      createdAt: Date.now()
    });
  }
}

// State change notification callback
let stateChangeCallback = null;

// Register callback for state changes (used by session manager)
export function onStateChange(callback) {
  stateChangeCallback = callback;
}

// Notify about state changes
function notifyStateChange() {
  if (stateChangeCallback) {
    stateChangeCallback();
  }
}

// Get current state (for session manager)
export function getState() {
  ensureAgentChat();
  return {
    // Support both old format (agentHistory) and new format (agentChats)
    agentChats: agentChats.map(chat => ({ ...chat, history: [...chat.history] })),
    currentAgentChatIndex,
    conversations: conversations.map(c => ({ ...c, history: [...c.history] })),
    currentConversationIndex,
    expandedConversations: [...expandedConversations]
  };
}

// Set state (for session manager)
export function setState(state) {
  if (!state) return;

  // Handle migration from old format (agentHistory) to new format (agentChats)
  if (state.agentChats) {
    agentChats = state.agentChats.map(chat => ({ ...chat, history: [...chat.history] }));
    currentAgentChatIndex = state.currentAgentChatIndex || 0;
  } else if (state.agentHistory) {
    // Migrate old format to new format
    agentChats = [{
      id: '1',
      name: 'Agent Chat 1',
      history: [...state.agentHistory],
      createdAt: Date.now()
    }];
    currentAgentChatIndex = 0;
  } else {
    agentChats = [];
  }

  // Update agent chat ID counter
  if (agentChats.length > 0) {
    const maxAgentId = Math.max(...agentChats.map(c => parseInt(c.id) || 0));
    agentChatIdCounter = maxAgentId + 1;
  }

  conversations = state.conversations ? state.conversations.map(c => ({ ...c, history: [...c.history] })) : [];
  currentConversationIndex = state.currentConversationIndex || 0;
  expandedConversations = state.expandedConversations ? [...state.expandedConversations] : [];

  // Update conversation ID counter to avoid conflicts
  if (conversations.length > 0) {
    const maxId = Math.max(...conversations.map(c => parseInt(c.id) || 0));
    conversationIdCounter = maxId + 1;
  }

  ensureAgentChat();
}

// AGENT CHAT HISTORY (right panel) - now supports multiple agent chats

export function addAgentMessage(role, content) {
  ensureAgentChat();
  const currentChat = agentChats[currentAgentChatIndex];
  const message = {
    role,
    content,
    timestamp: Date.now()
  };
  currentChat.history.push(message);
  notifyStateChange();
  return message;
}

export function getAgentHistory() {
  ensureAgentChat();
  return agentChats[currentAgentChatIndex].history;
}

// Get all agent chats
export function getAllAgentChats() {
  ensureAgentChat();
  return agentChats.map(chat => ({
    id: chat.id,
    name: chat.name,
    createdAt: chat.createdAt,
    messageCount: chat.history.length
  }));
}

// Get current agent chat
export function getCurrentAgentChat() {
  ensureAgentChat();
  return agentChats[currentAgentChatIndex];
}

// Get current agent chat index
export function getCurrentAgentChatIndex() {
  return currentAgentChatIndex;
}

// Create a new agent chat
export function createNewAgentChat(name = null) {
  const chatName = name || `Agent Chat ${agentChatIdCounter}`;
  const newChat = {
    id: String(agentChatIdCounter++),
    name: chatName,
    history: [],
    createdAt: Date.now()
  };
  agentChats.push(newChat);
  currentAgentChatIndex = agentChats.length - 1;
  notifyStateChange();
  return newChat;
}

// Switch to a specific agent chat by ID
export function switchAgentChat(chatId) {
  const index = agentChats.findIndex(chat => chat.id === chatId);
  if (index !== -1) {
    currentAgentChatIndex = index;
    notifyStateChange();
    return agentChats[currentAgentChatIndex];
  }
  return null;
}

// Delete an agent chat by ID
export function deleteAgentChat(chatId) {
  const index = agentChats.findIndex(chat => chat.id === chatId);
  if (index === -1) return false;

  // Don't delete if it's the only chat
  if (agentChats.length <= 1) {
    // Clear the history instead
    agentChats[0].history = [];
    notifyStateChange();
    return true;
  }

  agentChats.splice(index, 1);

  // Adjust current index if needed
  if (currentAgentChatIndex >= agentChats.length) {
    currentAgentChatIndex = agentChats.length - 1;
  } else if (currentAgentChatIndex > index) {
    currentAgentChatIndex--;
  }

  notifyStateChange();
  return true;
}

// Rename an agent chat
export function renameAgentChat(chatId, newName) {
  const chat = agentChats.find(c => c.id === chatId);
  if (chat) {
    chat.name = newName;
    notifyStateChange();
    return true;
  }
  return false;
}

// MODEL CONVERSATIONS (main chat, left panel)

// Create N separate conversations with specified models
// Agent writes initial 'user' message with source='agent'
export async function createConversations(modelIds, initialPrompt, onConversationCreated = null) {
  const apiKey = loadApiKey();
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const newConversations = [];
  
  // Create conversation objects
  for (const modelId of modelIds) {
    const conversation = {
      id: String(conversationIdCounter++),
      modelId: modelId.id,
      modelName: modelId.name,
      parentId: null,
      branchPoint: null,
      history: [
        {
          role: 'user',
          content: initialPrompt,
          timestamp: Date.now(),
          source: 'agent'
        }
      ]
    };
    newConversations.push(conversation);
  }

  // Add to conversations array IMMEDIATELY
  conversations.push(...newConversations);
  
  // Set current to first new conversation
  if (conversations.length > 0) {
    currentConversationIndex = conversations.length - newConversations.length;
  }
  
  // Notify about state change
  notifyStateChange();
  
  // Notify UI that conversations are created (before responses arrive)
  if (onConversationCreated) {
    onConversationCreated(newConversations);
  }
  
  // Send initial prompts to all models in parallel (in background)
  const promises = newConversations.map(async (conv) => {
    try {
      const response = await sendChatCompletion(
        conv.modelId,
        [{ role: 'user', content: initialPrompt }],
        apiKey
      );
      
      const assistantMessage = {
        role: 'assistant',
        content: extractMessageContent(response),
        timestamp: Date.now()
      };
      
      conv.history.push(assistantMessage);
      
      // Notify about state change
      notifyStateChange();
      
      // Notify UI that this conversation got a response
      if (onConversationCreated) {
        onConversationCreated(newConversations);
      }
    } catch (error) {
      console.error(`Error in conversation ${conv.id}:`, error);
      conv.history.push({
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: Date.now()
      });
      
      // Notify about state change
      notifyStateChange();
      
      // Notify UI about error
      if (onConversationCreated) {
        onConversationCreated(newConversations);
      }
    }
  });

  await Promise.all(promises);
  
  return newConversations;
}

// User sends message to CURRENT conversation
// Adds 'user' message with source='user'
export async function sendUserMessage(message, onStreamChunk = null) {
  const apiKey = loadApiKey();
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const conversation = conversations[currentConversationIndex];
  if (!conversation) {
    throw new Error('No active conversation');
  }

  // Add user message
  const userMessage = {
    role: 'user',
    content: message,
    timestamp: Date.now(),
    source: 'user'
  };
  conversation.history.push(userMessage);
  notifyStateChange();

  // Prepare messages for API (without source field)
  const apiMessages = conversation.history.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Send to model with streaming
  try {
    let fullContent = '';
    
    if (onStreamChunk) {
      // Use streaming
      await sendStreamingChatCompletion(
        conversation.modelId,
        apiMessages,
        apiKey,
        (chunk) => {
          fullContent += chunk;
          onStreamChunk(chunk, fullContent);
        }
      );
    } else {
      // Fallback to non-streaming
      const response = await sendChatCompletion(
        conversation.modelId,
        apiMessages,
        apiKey
      );
      fullContent = extractMessageContent(response);
    }
    
    const assistantMessage = {
      role: 'assistant',
      content: fullContent,
      timestamp: Date.now()
    };
    
    conversation.history.push(assistantMessage);
    notifyStateChange();
    return assistantMessage;
  } catch (error) {
    console.error('Error sending message:', error);
    const errorMessage = {
      role: 'assistant',
      content: `Error: ${error.message}`,
      timestamp: Date.now()
    };
    conversation.history.push(errorMessage);
    notifyStateChange();
    throw error;
  }
}

// Navigation
export function getCurrentConversation() {
  return conversations[currentConversationIndex] || null;
}

export function switchToNextConversation() {
  if (conversations.length === 0) return null;
  currentConversationIndex = (currentConversationIndex + 1) % conversations.length;
  notifyStateChange();
  return getCurrentConversation();
}

export function switchToPreviousConversation() {
  if (conversations.length === 0) return null;
  currentConversationIndex = (currentConversationIndex - 1 + conversations.length) % conversations.length;
  notifyStateChange();
  return getCurrentConversation();
}

export function getCurrentIndex() {
  return currentConversationIndex;
}

export function getTotalConversations() {
  return conversations.length;
}

// Retrieves conversation history for specific conversation
export function getConversationHistory(conversationId) {
  const conv = conversations.find(c => c.id === conversationId);
  return conv ? [...conv.history] : [];
}

// Gets all conversations
export function getAllConversations() {
  return [...conversations];
}

// Finds conversation by model name or ID
export function findConversation(searchTerm) {
  const term = searchTerm.toLowerCase();
  return conversations.find(c => 
    c.modelName.toLowerCase().includes(term) ||
    c.modelId.toLowerCase().includes(term) ||
    c.id === searchTerm
  );
}

// TREE SUPPORT FUNCTIONS

// Gets root conversations (those without parents)
export function getRootConversations() {
  return conversations.filter(conv => conv.parentId === null);
}

// Gets children of a specific conversation
export function getConversationChildren(parentId) {
  return conversations.filter(conv => conv.parentId === parentId);
}

// Calculates the depth/nesting level of a conversation
export function getConversationDepth(conversationId) {
  const conversationMap = new Map(conversations.map(c => [c.id, c]));
  let depth = 0;
  let current = conversationMap.get(conversationId);
  
  while (current && current.parentId) {
    depth++;
    current = conversationMap.get(current.parentId);
  }
  
  return depth;
}

// Gets expanded conversation IDs
export function getExpandedConversations() {
  return [...expandedConversations];
}

// Sets expanded conversation IDs
export function setExpandedConversations(expanded) {
  expandedConversations = [...expanded];
}

// BRANCHING SUPPORT

// Creates branches from an existing conversation
// Copies history from parent, then adds new prompts from agent or user
export async function branchConversation(parentConversationId, branchCount, prompts, options = {}) {
  const apiKey = loadApiKey();
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const parentConv = conversations.find(c => c.id === parentConversationId);
  if (!parentConv) {
    throw new Error('Parent conversation not found');
  }

  const { source = 'agent', onBranchCreated = null, onStreamChunk = null } = options;
  const newBranches = [];
  
  // Create branch conversations
  for (let i = 0; i < branchCount; i++) {
    const prompt = prompts[i] || prompts[0]; // Use first prompt if not enough provided
    
    const branch = {
      id: String(conversationIdCounter++),
      modelId: parentConv.modelId,
      modelName: parentConv.modelName,
      parentId: parentConversationId,
      branchPoint: parentConv.history.length,
      history: [
        ...parentConv.history.map(msg => ({ ...msg })), // Copy parent history
        {
          role: 'user',
          content: prompt,
          timestamp: Date.now(),
          source: source // Can be 'agent' or 'user'
        }
      ]
    };
    
    newBranches.push(branch);
  }

  // Add to conversations array
  conversations.push(...newBranches);
  notifyStateChange();
  
  // Notify that branches are created (before responses)
  if (onBranchCreated) {
    onBranchCreated(newBranches);
  }
  
  // Send prompts to all branches
  const promises = newBranches.map(async (branch, index) => {
    try {
      // Prepare messages for API
      const apiMessages = branch.history.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Use streaming if callback provided and this is the first branch
      if (onStreamChunk && index === 0) {
        let fullContent = '';
        await sendStreamingChatCompletion(
          branch.modelId,
          apiMessages,
          apiKey,
          (chunk) => {
            fullContent += chunk;
            onStreamChunk(chunk, fullContent, branch);
          }
        );
        
        const assistantMessage = {
          role: 'assistant',
          content: fullContent,
          timestamp: Date.now()
        };
        branch.history.push(assistantMessage);
      } else {
        // Non-streaming for other branches
        const response = await sendChatCompletion(
          branch.modelId,
          apiMessages,
          apiKey
        );
        
        const assistantMessage = {
          role: 'assistant',
          content: extractMessageContent(response),
          timestamp: Date.now()
        };
        branch.history.push(assistantMessage);
      }
      
      notifyStateChange();
    } catch (error) {
      console.error(`Error in branch ${branch.id}:`, error);
      branch.history.push({
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: Date.now()
      });
      notifyStateChange();
    }
  });

  await Promise.all(promises);
  
  return newBranches;
}
