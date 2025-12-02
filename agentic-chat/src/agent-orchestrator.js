// Agent Orchestrator
// Interprets user commands and manages agent decision-making

import { sendChatCompletion, extractMessageContent } from './openrouter-client.js';
import { loadApiKey } from './api-key-manager.js';
import { getActiveModels } from './active-models.js';
import { getAllConversations } from './conversation-manager.js';
import { getAgentModel } from './agent-model-manager.js';

// Build system prompt for the agent
function buildAgentSystemPrompt(activeModels, existingConversations, currentConversation) {
  const modelsList = activeModels.map(m => `- ${m.name} (${m.id})`).join('\n');
  
  // Build current conversation context
  let currentContext = 'No conversation currently selected';
  if (currentConversation) {
    const historyText = currentConversation.history.map(msg => {
      const sender = msg.role === 'user' 
        ? (msg.source === 'agent' ? 'Agent' : 'User')
        : currentConversation.modelName;
      return `    ${sender}: ${msg.content}`;
    }).join('\n');
    
    currentContext = `**CURRENTLY VIEWING:**
- Conversation ID: ${currentConversation.id}
- Model: ${currentConversation.modelName}
- History:
${historyText}`;
  }
  
  // Build detailed conversation list with full history
  let conversationsList = 'No existing conversations';
  if (existingConversations.length > 0) {
    conversationsList = existingConversations.map((c, i) => {
      const historyText = c.history.map(msg => {
        const sender = msg.role === 'user' 
          ? (msg.source === 'agent' ? 'Agent' : 'User')
          : c.modelName;
        return `    ${sender}: ${msg.content}`;
      }).join('\n');
      
      const isCurrent = currentConversation && c.id === currentConversation.id ? ' [CURRENT]' : '';
      return `- Conversation ${i + 1}: ${c.modelName} (ID: ${c.id})${isCurrent}
${historyText}`;
    }).join('\n\n');
  }

  return `You are an AI agent orchestrator that helps users explore multiple AI models.

## AVAILABLE ACTIVE MODELS
${modelsList}

## CURRENT CONVERSATION CONTEXT
${currentContext}

When the user says "this one", "this joke", "this conversation", or similar, they are referring to the CURRENTLY VIEWING conversation above.

## ALL EXISTING CONVERSATIONS
${conversationsList}

## YOUR ACTIONS

1. **create_conversations**: Create N separate conversations for exploration
   - User says: "create 3 jokes" → Create 3 conversations with active models
   - User says: "give me 5 code examples" → Create 5 conversations
   - Distribute conversations across active models (can reuse models)
   - Generate initial prompt to send to all conversations
   
2. **continue_conversations**: Branch from existing conversation(s)
   - User says: "i like the joke of conversation 1, ask for 2 more similar jokes"
   - User says: "this one is hilarious, make a similar joke" → Use CURRENT conversation
   - User says: "this is great, give me 3 more like this" → Use CURRENT conversation
   - Identify source conversation by ID, model name, or "this/current"
   - Create N branches from that conversation
   - Generate new prompts for each branch based on the conversation's history
   - Original conversation preserved (non-destructive)
   
3. **chat**: Respond to general questions about the system
   - User says: "how does this work?" → Explain the system
   - User says: "what models do I have active?" → List active models
   - No conversations created

## CONVERSATION DISTRIBUTION RULES
- Parse user request for COUNT (how many conversations/responses they want)
- If user has 2 active models and requests 3 conversations → distribute as [model1, model2, model1]
- If user has 3 active models and requests 5 conversations → [model1, model2, model3, model1, model2]
- Round-robin distribution across active models

## PROMPT GENERATION
- Convert user request into actual prompt for models
- "create 3 jokes" → "Generate a funny joke"
- "give me 5 code examples for sorting" → "Provide a code example for sorting an array"
- Same prompt sent to all conversations initially

## RESPONSE FORMAT

For create_conversations:
{
  "action": "create_conversations",
  "conversationCount": 3,
  "modelIds": ["model1", "model2", "model1"],
  "initialPrompt": "Generate a funny joke",
  "response": "Created 3 conversations with Claude (x2) and GPT-4!"
}

For continue_conversations:
{
  "action": "continue_conversations",
  "sourceConversationId": "1",
  "branchCount": 2,
  "prompts": [
    "Tell me another similar joke",
    "Give me one more joke like that"
  ],
  "response": "Created 2 branches from conversation 1 to explore more similar jokes!"
}

For chat:
{
  "action": "chat",
  "response": "Your helpful response here"
}

Always return valid JSON only. Be concise and helpful.`;
}

// Interpret user command
export async function interpretCommand(userMessage, conversationHistory, currentConversation = null) {
  const apiKey = loadApiKey();
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const activeModels = getActiveModels();
  if (activeModels.length === 0) {
    return {
      action: 'chat',
      response: 'You need to add some active models first! Click "Add Model" to get started.'
    };
  }

  const existingConversations = getAllConversations();
  const systemPrompt = buildAgentSystemPrompt(activeModels, existingConversations, currentConversation);

  // Prepare messages for agent
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: userMessage }
  ];

  try {
    const agentModel = getAgentModel();
    const response = await sendChatCompletion(
      agentModel,
      messages,
      apiKey,
      { response_format: { type: 'json_object' } }
    );

    const content = extractMessageContent(response);
    const cleanedContent = cleanJsonResponse(content);
    const commandJson = JSON.parse(cleanedContent);

    // Process the command based on action
    if (commandJson.action === 'create_conversations') {
      // Distribute models
      const modelIds = distributeModels(activeModels, commandJson.conversationCount);
      commandJson.modelIds = modelIds;
    }

    return commandJson;
  } catch (error) {
    console.error('Agent interpretation error:', error);
    throw error;
  }
}

// Distribute active models across N conversations (round-robin)
function distributeModels(activeModels, count) {
  const distributed = [];
  for (let i = 0; i < count; i++) {
    distributed.push(activeModels[i % activeModels.length]);
  }
  return distributed;
}

// Clean JSON response by removing markdown code blocks
function cleanJsonResponse(content) {
  if (!content) return content;

  let cleaned = content.trim();

  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    // Find the end of the first line (might be ```json or just ```)
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    }
    // Remove trailing ```
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();
  }

  return cleaned;
}

// Find target conversation for branching
export function findTargetConversation(reference, existingConversations, currentConversation = null) {
  const term = reference.toLowerCase();
  
  // Check if referring to current conversation
  if (currentConversation && (term === 'current' || term === 'this' || term.includes('this one'))) {
    return currentConversation;
  }
  
  // Try to find by ID first
  let found = existingConversations.find(c => c.id === reference);
  if (found) return found;
  
  // Try to find by model name
  found = existingConversations.find(c => 
    c.modelName.toLowerCase().includes(term)
  );
  if (found) return found;
  
  // Try to find by index (e.g., "conversation 1")
  const indexMatch = reference.match(/(\d+)/);
  if (indexMatch) {
    const index = parseInt(indexMatch[1]) - 1;
    if (index >= 0 && index < existingConversations.length) {
      return existingConversations[index];
    }
  }
  
  return null;
}
