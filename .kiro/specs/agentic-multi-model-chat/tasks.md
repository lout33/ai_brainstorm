# Implementation Plan

- [x] 1. Set up minimal project structure
  - Initialize Vite project with vanilla JavaScript
  - Create simple directory structure: src/
  - Set up HTML with left (main chat) and right (agent panel) divs
  - Add minimal CSS for split-view (flexbox)
  - _Requirements: 5.1, 5.2, 5.6_

- [ ] 2. Implement Active Models Manager
  - [x] 2.1 Create active-models.js module
    - Implement localStorage-based active models storage
    - Create functions to add/remove active models
    - Add getActiveModels function
    - Load default models on first run (e.g., 2 popular models)
    - _Requirements: 3.2_

  - [x] 2.2 Build simple model management UI
    - Create simple list of active models in agent panel
    - Add button to add new model (model ID + name only)
    - Add remove button for each model
    - _Requirements: 3.6_

- [ ] 3. Implement OpenRouter API Client
  - [x] 3.1 Create openrouter-client.js module
    - Implement sendChatCompletion function with fetch
    - Add request formatting for OpenRouter API
    - Implement response parsing
    - Add error handling with user-friendly messages
    - _Requirements: 3.1, 5.4_

  - [x] 3.2 Add API key management
    - Create localStorage-based API key storage
    - Add UI for API key configuration
    - Implement key validation
    - _Requirements: 5.4_

- [ ] 4. Implement Conversation Manager with Two History Types
  - [x] 4.1 Create conversation-manager.js module
    - Implement TWO separate histories: agentHistory and conversations
    - Add addAgentMessage for agent chat (right panel)
    - Create createConversations function (agent writes initial 'user' message)
    - Implement sendUserMessage (actual user writes 'user' message)
    - Add navigation functions (next/previous conversation)
    - Implement findConversation for reference lookup
    - _Requirements: 1.3, 2.2, 2.5_

  - [x] 4.2 Add branching support
    - Implement branchConversation function with history copying
    - Agent writes new 'user' messages in branches
    - Track parentId and branchPoint
    - _Requirements: 2.5_

- [ ] 5. Implement Agent Orchestrator
  - [x] 5.1 Create agent-orchestrator.js module
    - Implement interpretCommand function following docs/agent.js pattern
    - Create parseUserRequest to extract count from user message
    - Implement simple distributeConversations (round-robin active models)
    - Add findTargetConversation for branching
    - _Requirements: 1.1, 1.2, 6.1, 6.2_

  - [x] 5.2 Build minimal agent system prompt
    - Create system prompt for create_conversations action
    - Add system prompt for continue_conversations action
    - Simple distribution rules (just use active models)
    - Define JSON response formats
    - _Requirements: 1.1, 6.1, 6.3_

  - [x] 5.3 Integrate agent with OpenRouter
    - Connect agent to OpenRouter API for command interpretation
    - Implement agent response parsing
    - Add error handling for agent failures
    - _Requirements: 1.1, 6.1_

- [ ] 6. Build Main Chat Interface (Left Panel)
  - [x] 6.1 Create main-chat-ui.js module
    - Implement conversation display with model labels
    - Add message rendering (user and assistant)
    - Create navigation buttons ("<" and ">")
    - Implement conversation indicator ("Response 1 of 3")
    - Add user input field and send button
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1_

  - [x] 6.2 Implement conversation navigation
    - Connect navigation buttons to conversation manager
    - Update display when switching conversations
    - Show current conversation's full history
    - Highlight current conversation indicator
    - _Requirements: 2.3, 4.1_

  - [x] 6.3 Add message sending functionality
    - Connect input field to conversation manager
    - Send message to current conversation only
    - Display loading state while waiting for response
    - Append response to current conversation
    - _Requirements: 2.2, 4.1_

- [ ] 7. Build Agent Panel Interface (Right Panel)
  - [x] 7.1 Create agent-panel-ui.js module
    - Implement agent chat display
    - Add agent message rendering with model selections
    - Create agent input field
    - Display currently active models
    - Add quick action buttons
    - _Requirements: 4.2, 4.4, 6.3_

  - [x] 7.2 Connect agent panel to orchestrator
    - Route agent commands to agent orchestrator
    - Display agent responses
    - Show model selection results
    - Handle create_conversations action
    - Handle continue_conversations action
    - _Requirements: 1.1, 1.2, 4.2_

- [ ] 8. Implement End-to-End Conversation Flow
  - [x] 8.1 Wire create_conversations flow
    - User sends command to agent: "create 3 jokes"
    - Agent interprets and selects models
    - Agent creates conversations and sends initial prompts
    - Display responses in main chat with navigation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 8.2 Wire continue_conversations (branching) flow
    - User sends branch command: "i like haiku1, ask for 2 more"
    - Agent identifies source conversation
    - Agent creates branches with copied history
    - Agent sends new prompts to branches
    - Display new branches in navigation
    - _Requirements: 1.1, 1.2, 6.1, 6.4_

  - [x] 8.3 Wire direct chat flow
    - User sends message in main chat
    - Message routes to current conversation only
    - Display response in current conversation
    - Maintain conversation history
    - _Requirements: 2.2, 2.5, 4.1_

- [ ] 9. Add Basic UX Polish
  - [x] 9.1 Implement simple loading states
    - Show "thinking..." when agent is processing
    - Display "loading..." for model responses
    - _Requirements: 6.3_

  - [x] 9.2 Add basic error handling UI
    - Display error messages inline
    - Handle API key errors with simple alert
    - _Requirements: 6.3_

- [ ] 10. Add Simple Configuration
  - [x] 10.1 Create minimal settings
    - Add API key input in agent panel
    - Save API key to localStorage
    - _Requirements: 3.2_

  - [x] 10.2 Display active models
    - Show active models list in agent panel
    - Already implemented in task 2.2
    - _Requirements: 4.4_

- [ ] 11. MVP Testing
  - [ ] 11.1 Test core workflows manually
    - Test create_conversations with "create 3 jokes"
    - Test navigation between conversations
    - Test direct chat in current conversation
    - Test basic branching
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

  - [ ]* 11.2 Add simple README
    - Basic setup instructions
    - How to add API key
    - Example agent commands
    - _Requirements: 6.3_
