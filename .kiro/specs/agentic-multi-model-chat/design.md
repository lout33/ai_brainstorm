# Design Document

## Overview

The Agentic Multi-Model Chat Exploration Tool is a web application that enables users to experiment with multiple AI models simultaneously through an intelligent agent orchestrator. The system uses OpenRouter's unified API to access hundreds of AI models and provides a dual-interface approach: an agent mode for intelligent model selection and orchestration, and a direct chat mode for parallel conversations with selected models.

The architecture follows the agent pattern demonstrated in docs/agent.js, using vanilla JavaScript and Vite for a lightweight, maintainable codebase.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                          │
│  ┌──────────┐  ┌──────────────────────┐  ┌─────────────────┐       │
│  │ Session  │  │  Main Chat Interface │  │  Agent Panel    │       │
│  │ History  │  │  (Center)            │  │  (Right Side)   │       │
│  │ (Left)   │  │  - Classic Chatbot   │  │                 │       │
│  │          │  │  - User Input        │  │  - Agent Chat   │       │
│  │ - List   │  │  - Model Responses   │  │  - Commands     │       │
│  │ - New    │  │  - Conversation Nav  │  │  - Model Info   │       │
│  │ - Delete │  │                      │  │                 │       │
│  └──────────┘  └──────────────────────┘  └─────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Logic Layer                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Session Manager Module                    │   │
│  │  - Session Persistence (localStorage)                │   │
│  │  - Session Creation/Loading/Deletion                 │   │
│  │  - Auto-save/Auto-restore                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Agent Orchestrator Module                 │   │
│  │  - Command Interpretation                            │   │
│  │  - Model Selection Logic                             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Conversation Manager Module               │   │
│  │  - Multi-Model Session Handling                      │   │
│  │  - Message Routing                                   │   │
│  │  - History Management                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Integration Layer                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            OpenRouter API Client                     │   │
│  │  - Request Formatting                                │   │
│  │  - Response Parsing                                  │   │
│  │  - Error Handling                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Model Registry Service                    │   │
│  │  - Model Metadata Fetching                           │   │
│  │  - Model Capability Indexing                         │   │
│  │  - Model Ranking                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  OpenRouter API  │
                  │  (External)      │
                  └──────────────────┘
```

### Component Interaction Flow

1. **Initial Creation via Agent (Right Panel)**:
   - User has 2 active models: Claude Haiku, Gemini Pro
   - User: "create 3 jokes"
   - Agent interprets: User wants 3 separate conversations to explore responses
   - Agent creates 3 conversations using available models (can reuse):
     * Conversation 1: Claude Haiku
     * Conversation 2: Gemini Pro
     * Conversation 3: Claude Haiku (reused)
   - Agent generates prompt: "Generate a funny joke"
   - Agent sends same prompt to all 3 conversations in parallel
   - Agent responds in right panel: "Created 3 conversations with Claude Haiku (x2) and Gemini Pro!"

2. **Models Respond (Main Chat - Left)**:
   - All 3 conversations get responses simultaneously
   - Main chat shows Conversation 1: "Claude Haiku: Why did the..."
   - Navigation shows "Response 1 of 3" with "<" and ">" buttons
   - User clicks ">" to see Conversation 2 (Gemini Pro's joke)
   - User clicks ">" again to see Conversation 3 (Claude Haiku's different joke)
   - User compares all 3 responses

3. **Direct Conversation**:
   - User sends follow-up in main chat: "tell me another one"
   - Message goes ONLY to current conversation (e.g., Conversation 2)
   - Only that conversation's model responds
   - User can navigate to other conversations and chat with them separately
   - Each conversation maintains its own independent history

4. **Branching via Agent**:
   - User: "i like the joke of haiku1, ask for 2 more similar jokes"
   - Agent identifies Conversation 1 (Claude Haiku)
   - Agent creates 2 branches from Conversation 1:
     * Branch 4: Claude Haiku (copies history from Conv 1, adds new prompt)
     * Branch 5: Claude Haiku (copies history from Conv 1, adds different prompt)
   - Agent generates varied prompts: "Tell me another similar joke", "Give me one more joke like that"
   - Both branches get responses
   - Original Conversation 1 preserved
   - User now has 5 total conversations to navigate

5. **Agent Always Available**:
   - Agent panel (right) always ready for new commands
   - User can create new conversations, branch existing ones, or ask questions
   - Main chat (left) = classic chatbot showing current conversation
   - User explores different model responses by navigating between conversations
   - Non-destructive branching allows experimentation without losing work

## Components and Interfaces

### 1. Agent Orchestrator Module (`agent-orchestrator.js`)

**Purpose**: Interprets user commands and manages the agent's decision-making process.

**Key Functions**:
```javascript
// Interprets user command and extracts intent
async interpretCommand(userMessage, conversationHistory, activeModels, existingConversations)

// Parses user request to determine conversation count and task
// Example: "create 3 jokes" → count: 3, task: "jokes"
// Example: "i like haiku1, ask for 2 more" → action: branch, source: haiku1, count: 2
parseUserRequest(userMessage)

// Distributes conversations across available active models
// Example: activeModels=[A, B], count=3 → [A, B, A]
distributeConversations(activeModels, conversationCount, taskType)

// Identifies which conversation user is referring to
// Example: "haiku1" → finds conversation with Claude Haiku model
findTargetConversation(reference, existingConversations)

// Generates prompts for branching
// Example: "ask for 2 more similar jokes" → ["Tell me another similar joke", "Give me one more joke like that"]
generateBranchPrompts(userRequest, branchCount, parentHistory)

// Generates the actual prompt to send to models
// Example: "create 3 jokes" → prompt: "Generate a funny joke"
generateModelPrompt(userRequest)

// Generates agent response explaining decisions
generateAgentResponse(action, conversations, reasoning)
```

**Interface**:
```javascript
{
  action: 'create_conversations' | 'chat',
  conversations: [
    { modelId: string, modelName: string }
  ],
  initialPrompt: string,
  response: string, // Agent's conversational response
  metadata: object
}
```

**Agent Actions Explained**:

1. **create_conversations**: When user asks agent to create multiple new responses
   - Example: "create 3 jokes" → Agent creates 3 conversations using active models
   - Agent distributes conversations across available models (can reuse)
   - Agent generates initial prompt and sends to all conversations
   - Agent explains which models were used
   - Starts conversations in main chat

2. **continue_conversations**: When user asks agent to continue/branch existing conversations
   - Example: "i like the joke of haiku1, ask for 2 more similar jokes"
   - Agent identifies the conversation to branch from (haiku1)
   - Agent creates 2 new branches from that conversation
   - Agent generates prompts for each branch
   - Each branch maintains history from parent conversation
   - Non-destructive: original conversation preserved

3. **chat**: When user asks general questions to the agent
   - Example: "how does this work?"
   - Example: "what models do I have active?"
   - Agent responds conversationally without creating conversations
   - No conversations started, just information exchange

**Design Pattern**: Follows the agent pattern from docs/agent.js with system prompts that guide the agent to:
- Parse user intent from natural language
- Select appropriate models based on task type and user's model list
- Provide transparent reasoning for decisions
- Return structured JSON responses

### 2. Conversation Manager Module (`conversation-manager.js`)

**Purpose**: Manages TWO separate conversation histories - agent chat and model conversations.

**Key Functions**:
```javascript
// AGENT CHAT HISTORY (right panel)
addAgentMessage(role, content) // role: 'user' or 'assistant'
getAgentHistory()

// MODEL CONVERSATIONS (main chat, left panel)
// Creates N separate conversations with specified models
// Agent writes initial 'user' message with source='agent'
createConversations(modelIds, initialPrompt)

// Creates branches from an existing conversation
// Copies history from parent, then adds new prompts from agent
branchConversation(parentConversationId, branchCount, prompts)

// User sends message to CURRENT conversation
// Adds 'user' message with source='user'
async sendUserMessage(message)

// Gets current conversation being viewed
getCurrentConversation()

// Switches to next conversation
switchToNextConversation()

// Switches to previous conversation
switchToPreviousConversation()

// Retrieves conversation history for specific conversation
getConversationHistory(conversationId)

// Gets all conversations
getAllConversations()

// Finds conversation by model name or ID
findConversation(searchTerm)
```

**Data Structure**:
```javascript
{
  // Agent conversation history (right panel)
  agentHistory: [
    { role: 'user', content: string, timestamp: number }, // Actual user
    { role: 'assistant', content: string, timestamp: number } // Agent
  ],
  
  // Model conversations (main chat, left panel)
  conversations: [
    {
      id: string,
      modelId: string,
      modelName: string,
      parentId: string | null, // null for root conversations, ID for branches
      history: [
        // 'user' can be written by agent OR actual user
        // 'assistant' is always the model
        { role: 'user', content: string, timestamp: number, source: 'agent' | 'user' },
        { role: 'assistant', content: string, timestamp: number }
      ],
      branchPoint: number | null // Index in parent's history where branch occurred
    }
  ],
  currentConversationIndex: number,
  totalConversations: number
}
```

**Example - Initial Creation**:
User has 2 active models: [Claude Haiku, Gemini Pro]
User: "create 3 jokes"
Agent creates:
```javascript
conversations: [
  { id: '1', modelId: 'claude-haiku', modelName: 'Claude Haiku', parentId: null, history: [...] },
  { id: '2', modelId: 'gemini-pro', modelName: 'Gemini Pro', parentId: null, history: [...] },
  { id: '3', modelId: 'claude-haiku', modelName: 'Claude Haiku', parentId: null, history: [...] }
]
```

**Example - Branching**:
User: "i like the joke of haiku1, ask for 2 more similar jokes"
Agent branches from conversation '1':
```javascript
// Original conversation '1' preserved
{ id: '1', modelId: 'claude-haiku', history: [
  { role: 'user', content: 'Generate a funny joke' },
  { role: 'assistant', content: 'Why did the...' }
]}

// New branches created
{ id: '4', modelId: 'claude-haiku', parentId: '1', branchPoint: 2, history: [
  { role: 'user', content: 'Generate a funny joke' },
  { role: 'assistant', content: 'Why did the...' },
  { role: 'user', content: 'Tell me another similar joke' },
  { role: 'assistant', content: '...' }
]}

{ id: '5', modelId: 'claude-haiku', parentId: '1', branchPoint: 2, history: [
  { role: 'user', content: 'Generate a funny joke' },
  { role: 'assistant', content: 'Why did the...' },
  { role: 'user', content: 'Give me one more joke like that' },
  { role: 'assistant', content: '...' }
]}
```

### 3. Session Manager Module (`session-manager.js`)

**Purpose**: Manages session persistence, creation, loading, and deletion using localStorage.

**Key Functions**:
```javascript
// Creates a new session and saves current session
createNewSession()

// Saves current session state to localStorage
saveCurrentSession()

// Loads a specific session by ID
loadSession(sessionId)

// Deletes a session from localStorage
deleteSession(sessionId)

// Gets all saved sessions
getAllSessions()

// Gets current session ID
getCurrentSessionId()

// Auto-saves current session (called on state changes)
autoSave()

// Restores most recent session on app load
restoreMostRecentSession()
```

**Data Structure**:
```javascript
// localStorage key: 'chat-sessions'
{
  sessions: {
    'session-uuid-1': {
      id: 'session-uuid-1',
      name: 'Session 1', // Auto-generated or user-provided
      createdAt: timestamp,
      lastModified: timestamp,
      agentHistory: [...], // From conversation manager
      conversations: [...], // From conversation manager
      currentConversationIndex: number
    },
    'session-uuid-2': { ... }
  },
  currentSessionId: 'session-uuid-1',
  sessionOrder: ['session-uuid-2', 'session-uuid-1'] // Most recent first
}
```

**Session Lifecycle**:
1. **App Load**: Restore most recent session or create new if none exists
2. **User Creates New Session**: Save current session, initialize fresh state
3. **User Switches Session**: Auto-save current, load selected session
4. **User Deletes Session**: Remove from localStorage, load most recent remaining
5. **Auto-save**: Triggered on conversation changes, agent messages, etc.

**Integration with Conversation Manager**:
- Session Manager calls Conversation Manager's `getState()` to get current state
- Session Manager calls Conversation Manager's `setState()` to restore session
- Conversation Manager notifies Session Manager on state changes for auto-save

### 4. OpenRouter API Client (`openrouter-client.js`)

**Purpose**: Handles all communication with OpenRouter's unified API.

**Key Functions**:
```javascript
// Sends chat completion request
async sendChatCompletion(modelId, messages, options = {})

// Fetches available models from OpenRouter
async fetchModels()

// Handles streaming responses (future enhancement)
async streamChatCompletion(modelId, messages, onChunk)
```

**Configuration**:
```javascript
{
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: string, // From environment or user input
  defaultHeaders: {
    'HTTP-Referer': string,
    'X-Title': 'Agentic Multi-Model Chat',
    'Content-Type': 'application/json'
  }
}
```

**Error Handling**:
- Network errors: Retry with exponential backoff
- API errors: Parse error response and display user-friendly message
- Rate limits: Queue requests and inform user
- Invalid API key: Prompt user to configure

### 5. Active Models Manager (`active-models.js`)

**Purpose**: Manages user's list of active models for conversations.

**Key Functions**:
```javascript
// Loads active models from localStorage
loadActiveModels()

// Adds a model to active list
addActiveModel(modelId, modelName)

// Removes a model from active list
removeActiveModel(modelId)

// Gets all active models
getActiveModels()

// Saves active models to localStorage
saveActiveModels(models)
```

**Model Structure**:
```javascript
{
  id: string, // e.g., 'openai/gpt-4o'
  name: string, // e.g., 'GPT-4o'
  addedAt: number
}
```

**Simple Distribution**:
- Agent uses whatever models are currently active
- No tag matching or ranking needed
- Just distribute active models across requested conversations
- If user has 2 active models and requests 3 conversations → [model1, model2, model1]

### 6. Session History UI (`session-history-ui.js`)

**Purpose**: Manages the session history panel on the left side of the interface.

**Key Functions**:
```javascript
// Renders the session history list
renderSessionList(sessions)

// Handles session selection
onSessionSelect(sessionId)

// Handles new session button click
onNewSessionClick()

// Handles delete session button click
onDeleteSessionClick(sessionId)

// Updates UI to highlight current session
highlightCurrentSession(sessionId)

// Shows confirmation dialog for session deletion
showDeleteConfirmation(sessionId)
```

**UI Layout**:
- Fixed left sidebar (e.g., 250px width)
- "New Session" button at top
- Scrollable list of sessions below
- Each session item shows:
  - Session name/title (auto-generated from first message or timestamp)
  - Last modified timestamp
  - Delete button (trash icon)
- Current session highlighted
- Click session to load it
- Hover effects for better UX

**Session Display Format**:
```javascript
{
  displayName: string, // "Session 1" or first agent message preview
  timestamp: string, // "2 hours ago" or "Nov 17, 2025"
  isActive: boolean
}
```

### 7. Conversation Tree Navigator (`conversation-tree-ui.js`)

**Purpose**: Manages the hierarchical tree view of conversations with expand/collapse functionality.

**Key Functions**:
```javascript
// Builds tree structure from flat conversation list
buildConversationTree(conversations)

// Renders the conversation tree with indentation and expand/collapse controls
renderConversationTree(treeData, currentConversationId)

// Toggles expand/collapse state for a conversation
toggleConversationExpand(conversationId)

// Gets list of visible conversations (respecting collapsed state)
getVisibleConversations()

// Finds path from root to a conversation (for auto-expand)
findConversationPath(conversationId)

// Expands all ancestors of a conversation
expandPathToConversation(conversationId)

// Handles conversation selection from tree
handleConversationSelect(conversationId)
```

**Tree Data Structure**:
```javascript
{
  id: string,
  modelName: string,
  parentId: string | null,
  children: TreeNode[], // Child conversations
  isExpanded: boolean, // Collapse state
  depth: number, // Indentation level
  isActive: boolean // Currently selected
}
```

**UI Elements**:
- Expand/collapse arrow (▼ expanded, ▶ collapsed)
- Indentation based on depth (20px per level)
- Conversation label: "[depth].[index] [ModelName] - [FirstPrompt]"
- Active conversation highlighted with background color
- Click anywhere on row to select conversation
- Click arrow to toggle expand/collapse only

### 8. Chat Interface (`ui-manager.js`)

**Purpose**: Manages the main chat user interface and user interactions.

**Key Functions**:
```javascript
// Renders agent message in right panel
renderAgentMessage(message, selectedModels)

// Renders current model's response in main chat
renderModelResponse(modelId, message, timestamp)

// Navigates to next visible conversation
showNextModel()

// Navigates to previous visible conversation
showPreviousModel()

// Updates model indicator (e.g., "Response 2 of 5 (3 hidden)")
updateModelIndicator(currentIndex, totalVisible, totalHidden)

// Handles user input from main chat
handleUserInput(message)

// Handles agent commands from right panel
handleAgentCommand(command)

// Shows model management UI
showModelManagement()

// Adds model to user's list
addUserModel(modelId, modelName, tags)
```

**UI Layout**:
- **Session History (Left Sidebar)**: Session management panel
  - Fixed width sidebar (~250px)
  - "New Session" button at top
  - Scrollable list of saved sessions
  - Each session shows name and timestamp
  - Delete button for each session
  - Current session highlighted
  
- **Main Chat (Center)**: Classic chatbot interface where users chat with selected models
  - Shows one model's response at a time in conversation flow
  - Navigation buttons ("<" and ">") to switch between model responses
  - Each message labeled with current model name
  - Model indicator shows "Model 1 of 3" or similar
  - Standard chat input at bottom
  - Conversation history scrolls naturally
  - When user sends a message, all models respond but user navigates between them
  
- **Agent Panel (Right)**: Always-visible agent interface
  - Separate chat with the agent orchestrator
  - User sends commands like "give me 3 jokes" or "pick best models for coding"
  - Agent responds with model selections and reasoning
  - Shows currently active models
  - Quick actions: add models, change selection, view model info
  
- **Model Management**: Modal/overlay for adding/removing models from user's list

**Navigation Flow**:
1. User has 2 active models configured (e.g., Claude Haiku, Gemini Pro)
2. User asks agent: "create 3 jokes"
3. Agent interprets: user wants 3 different responses to explore
4. Agent creates 3 SEPARATE conversations using available models:
   - Conversation 1: Claude Haiku → "Generate a funny joke"
   - Conversation 2: Gemini Pro → "Generate a funny joke"
   - Conversation 3: Claude Haiku (reused) → "Generate a funny joke"
5. All 3 conversations get responses (3 different jokes, even if same model used twice)
6. Main chat shows Conversation 1's response (Response 1 of 3)
7. User clicks ">" to see Conversation 2's joke, then ">" for Conversation 3's joke
8. User can continue chatting - next message goes to the CURRENT conversation only
9. User navigates between conversations to compare and find the best responses

**Hierarchical Conversation Tree Navigation**:

Instead of a flat list, conversations are organized in a tree structure:

```
Conversations:
▼ 1. Claude Haiku - "Generate a funny joke"     [Active]
  ▶ 1.1 Branch - "Tell me another similar joke"
  ▼ 1.2 Branch - "Give me one more joke"
    ▶ 1.2.1 Branch - "Make it even funnier"
▶ 2. Gemini Pro - "Generate a funny joke"
▶ 3. Claude Haiku - "Generate a funny joke"
```

**Tree Navigation Features**:
- Root conversations (no parent) shown at top level
- Branches displayed as indented children under their parent
- Expand/collapse arrows (▼/▶) for conversations with branches
- Visual indentation shows hierarchy depth
- Current conversation highlighted with [Active] indicator
- Clicking a conversation switches to it and expands its parent if needed
- Navigation buttons (< >) move through visible conversations only
- Indicator shows "Response 3 of 7 (2 hidden)" when branches are collapsed

**Example Scenario**:
1. User creates 3 root conversations
2. User branches from conversation 1 → creates 2 child conversations (1.1, 1.2)
3. User branches from 1.2 → creates 1 grandchild (1.2.1)
4. Tree shows: 3 root + 2 children + 1 grandchild = 6 total conversations
5. User collapses conversation 1 → hides 1.1, 1.2, 1.2.1
6. Navigation now shows only 3 visible conversations (roots only)
7. User clicks on 1.2 → automatically expands conversation 1 to show path

## Data Models

### Conversation Message
```javascript
{
  id: string,
  role: 'user' | 'assistant' | 'agent',
  content: string,
  modelId: string | null, // null for agent messages
  timestamp: number,
  metadata: {
    modelName: string,
    provider: string,
    tokensUsed: number
  }
}
```

### Session
```javascript
{
  id: string, // UUID
  name: string, // Auto-generated or user-provided
  createdAt: number, // Timestamp
  lastModified: number, // Timestamp
  agentHistory: [
    { role: 'user' | 'assistant', content: string, timestamp: number }
  ],
  conversations: [
    {
      id: string,
      modelId: string,
      modelName: string,
      parentId: string | null,
      history: [...],
      branchPoint: number | null
    }
  ],
  currentConversationIndex: number
}
```

### Session Storage (localStorage)
```javascript
{
  sessions: {
    'session-uuid-1': Session,
    'session-uuid-2': Session,
    ...
  },
  currentSessionId: string,
  sessionOrder: string[] // Array of session IDs, most recent first
}
```

### Agent Command Result
```javascript
{
  action: string,
  selectedModels: Model[],
  reasoning: string,
  response: string,
  timestamp: number
}
```

## Error Handling

### Error Categories

1. **API Errors**:
   - Invalid API key → Prompt user to configure
   - Rate limit exceeded → Display wait time, queue requests
   - Model unavailable → Suggest alternative models
   - Network timeout → Retry with exponential backoff

2. **Agent Errors**:
   - Failed to parse command → Ask user to rephrase
   - No suitable models found → Explain and suggest alternatives
   - Invalid model selection → Fallback to default models

3. **UI Errors**:
   - Failed to render response → Log error, show fallback UI
   - Session state corruption → Reset session, preserve history

4. **Session Errors**:
   - localStorage quota exceeded → Prompt user to delete old sessions
   - Failed to load session → Show error, create new session
   - Failed to save session → Retry, notify user if persistent
   - Session not found → Load most recent or create new

### Error Display Strategy
- Non-blocking notifications for minor errors
- Modal dialogs for critical errors requiring user action
- Inline error messages in chat for context-specific issues
- Console logging for debugging (development mode)

## Testing Strategy

### Unit Tests

1. **Agent Orchestrator**:
   - Test command interpretation with various inputs
   - Test model selection logic with different task types
   - Test response generation

2. **Session Manager**:
   - Test session creation and persistence
   - Test session loading and switching
   - Test session deletion
   - Test auto-save functionality
   - Test localStorage quota handling

3. **Conversation Manager**:
   - Test conversation creation and management
   - Test message routing to multiple models
   - Test history management

4. **OpenRouter Client**:
   - Test request formatting
   - Test response parsing
   - Test error handling with mocked responses

5. **Model Registry**:
   - Test model search and ranking
   - Test capability matching
   - Test metadata parsing

### Integration Tests

1. **Agent → Model Selection → API Call**:
   - Test full flow from user command to model responses
   - Test parallel API calls to multiple models
   - Test session state management

2. **UI → Agent → Response Rendering**:
   - Test user input handling
   - Test mode switching
   - Test response display

### Manual Testing Scenarios

1. **Basic Flow**:
   - User: "agent: give me 3 jokes"
   - Agent selects 2 humor-focused models
   - User chats with both models
   - User focuses on preferred model

2. **Model Comparison**:
   - User: "agent: which models are best for coding?"
   - Agent explains and selects coding models
   - User tests both with coding question
   - User compares responses

3. **Session Management**:
   - Create new session, verify current session is saved
   - Switch between sessions, verify state is preserved
   - Delete a session, verify it's removed from list
   - Reload app, verify most recent session is restored
   - Create multiple sessions, verify they appear in chronological order

4. **Error Recovery**:
   - Test with invalid API key
   - Test with network disconnection
   - Test with unavailable model
   - Test localStorage quota exceeded scenario

## Implementation Notes

### Agent System Prompt Design

Following the pattern from docs/agent.js, the agent will use a comprehensive system prompt that:
- Defines available actions (select_models, chat, compare_models)
- Provides model selection guidelines
- Specifies JSON response format
- Includes examples of command interpretation

Example system prompt structure:
```
You are an AI agent orchestrator that helps users explore multiple AI models.

## ACTIONS
1. create_conversations: Create N separate conversations for exploration
   - User says: "create 3 jokes" → Create 3 conversations with humor models
   - User says: "give me 5 code examples" → Create 5 conversations with coding models
   - Distribute conversations across user's active models (can reuse models)
   - Generate initial prompt and send to all conversations
   - Explain which models were used

2. continue_conversations: Branch from existing conversation(s)
   - User says: "i like the joke of haiku1, ask for 2 more similar jokes"
   - Identify source conversation (haiku1)
   - Create N branches from that conversation
   - Copy history from parent conversation
   - Generate new prompts for each branch
   - Send prompts to create branches
   - Original conversation preserved (non-destructive)
   
3. chat: Respond to general questions about the system
   - User says: "how does this work?" → Explain the system
   - User says: "what models do I have active?" → List their active models
   - No conversations created

## CONVERSATION CREATION RULES
- Parse user request for COUNT and TASK
  - "create 3 jokes" → count: 3, task: "jokes"
  - "give me 5 code examples" → count: 5, task: "coding"
- Match task keywords to user's active model tags
- For jokes/humor: Prioritize models tagged 'humor', 'creative', 'conversational'
- For coding: Prioritize models tagged 'coding', 'programming', 'technical'
- For analysis: Prioritize models tagged 'reasoning', 'analysis', 'research'
- Create exactly N conversations as user requested
- If user has fewer active models than requested conversations, REUSE models
  - Example: 2 active models, user wants 3 jokes → use model1, model2, model1
- Distribute conversations across available models
- If user doesn't specify count, default to creating 2 conversations

## PROMPT GENERATION
- Convert user request into actual prompt for models
- "create 3 jokes" → "Generate a funny joke"
- "give me 5 code examples for sorting" → "Provide a code example for sorting an array"
- Same prompt sent to all conversations initially

## RESPONSE FORMATS

### Create Conversations
{
  "action": "create_conversations",
  "conversationCount": 3,
  "conversations": [
    {"modelId": "anthropic/claude-haiku", "modelName": "Claude Haiku"},
    {"modelId": "google/gemini-pro", "modelName": "Gemini Pro"},
    {"modelId": "anthropic/claude-haiku", "modelName": "Claude Haiku"}
  ],
  "initialPrompt": "Generate a funny joke",
  "response": "Created 3 conversations with Claude Haiku (x2) and Gemini Pro for jokes!"
}

### Branch Conversations
{
  "action": "continue_conversations",
  "sourceConversationId": "1",
  "branchCount": 2,
  "prompts": [
    "Tell me another similar joke",
    "Give me one more joke like that"
  ],
  "response": "Created 2 branches from haiku1 to explore more similar jokes!"
}
```

### OpenRouter Integration

- Use fetch API for all HTTP requests
- Store API key in localStorage
- Implement request queuing for rate limit management
- User manages their own model list (favorites) stored in localStorage
- Users can add any OpenRouter-compatible model ID to their list
- No automatic model discovery - users manually configure their model preferences

### State Management

- Use vanilla JavaScript with module pattern
- Store session state in memory (sessionStorage for persistence)
- Use event emitters for component communication
- Implement simple pub/sub for UI updates

### Performance Considerations

- Lazy load model registry (fetch on demand)
- Debounce user input to prevent excessive API calls
- Use request cancellation for abandoned queries
- Implement virtual scrolling for long conversation histories
- Cache model responses for identical queries (optional)

## Future Enhancements

1. **Streaming Responses**: Real-time token streaming from models
2. **Model Voting**: Users can vote on best responses
3. **Session Naming**: Allow users to rename sessions with custom names
4. **Session Search**: Search through session history by content or date
5. **Session Export/Import**: Export sessions as JSON files and import them
6. **Model Presets**: Pre-configured model combinations for common tasks
7. **Cost Tracking**: Display token usage and estimated costs
8. **Model Import/Export**: Share model lists between users
9. **Response Comparison View**: Side-by-side diff of model responses
10. **Export Conversations**: Download chat history as JSON/Markdown
11. **Model Discovery Helper**: Suggest popular OpenRouter models to add
12. **Session Tags**: Tag sessions for better organization
13. **Session Archiving**: Archive old sessions to separate storage
