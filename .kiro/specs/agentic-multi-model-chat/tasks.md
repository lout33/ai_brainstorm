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

- [ ] 11. Implement Session Manager
  - [x] 11.1 Create session-manager.js module
    - Implement localStorage-based session storage
    - Create createNewSession function
    - Implement saveCurrentSession function
    - Add loadSession function
    - Implement deleteSession function
    - Add getAllSessions function
    - Create auto-save functionality
    - Implement restoreMostRecentSession for app initialization
    - _Requirements: 7.1, 7.2, 7.6, 7.7_

  - [x] 11.2 Integrate session manager with conversation manager
    - Add getState function to conversation manager
    - Add setState function to conversation manager
    - Connect session manager to conversation manager for state persistence
    - Implement state change notifications for auto-save
    - _Requirements: 7.1, 7.7_

- [ ] 12. Build Session History UI
  - [x] 12.1 Update HTML layout for three-panel design
    - Add left sidebar div for session history (~250px width)
    - Update main chat to center position
    - Adjust CSS for three-column flexbox layout
    - _Requirements: 7.3_

  - [x] 12.2 Create session-history-ui.js module
    - Implement renderSessionList function
    - Add "New Session" button at top
    - Create session item rendering with name and timestamp
    - Add delete button for each session
    - Implement current session highlighting
    - Add click handlers for session selection
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 12.3 Wire session UI to session manager
    - Connect "New Session" button to createNewSession
    - Connect session selection to loadSession
    - Connect delete buttons to deleteSession
    - Update UI when sessions change
    - Show confirmation dialog for session deletion
    - _Requirements: 7.2, 7.4, 7.5_

- [ ] 13. Implement Session Lifecycle
  - [x] 13.1 Add session initialization on app load
    - Call restoreMostRecentSession when app starts
    - Create new session if none exists
    - Render session history UI
    - _Requirements: 7.6_

  - [x] 13.2 Implement auto-save on state changes
    - Trigger auto-save when agent messages are added
    - Trigger auto-save when conversations are created
    - Trigger auto-save when user sends messages
    - Debounce auto-save to avoid excessive writes
    - _Requirements: 7.7_

  - [x] 13.3 Handle session switching
    - Save current session before switching
    - Load selected session state
    - Update all UI components with new session data
    - Update session history to highlight new current session
    - _Requirements: 7.2, 7.4, 7.7_

- [ ] 14. Add Session Error Handling
  - [x] 14.1 Handle localStorage quota errors
    - Catch quota exceeded errors
    - Display user-friendly message
    - Suggest deleting old sessions
    - _Requirements: 7.1_

  - [ ] 14.2 Handle session load failures
    - Catch errors when loading corrupted sessions
    - Display error message
    - Create new session as fallback
    - Log error for debugging
    - _Requirements: 7.4_

- [x] 15. Implement Hierarchical Conversation Tree Navigation
  - [x] 15.1 Create conversation-tree-ui.js module
    - Implement buildConversationTree function to convert flat list to tree structure
    - Create renderConversationTree function with indentation and expand/collapse UI
    - Add toggleConversationExpand to manage collapse state
    - Implement getVisibleConversations to filter based on collapsed parents
    - Add findConversationPath to get ancestor chain
    - Implement expandPathToConversation for auto-expand on selection
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 15.2 Update conversation manager for tree support
    - Add getConversationChildren function to find child conversations
    - Add getRootConversations function to get conversations without parents
    - Implement getConversationDepth to calculate nesting level
    - Add state for tracking expanded/collapsed conversations
    - _Requirements: 8.1, 8.2_

  - [x] 15.3 Update main UI to use tree navigation
    - Replace flat navigation with tree view component
    - Update conversation indicator to show visible/hidden counts
    - Modify next/previous buttons to navigate visible conversations only
    - Add click handlers for tree node selection and expand/collapse
    - Update CSS for tree indentation and visual hierarchy
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.7_

  - [x] 15.4 Implement auto-expand on navigation
    - When user navigates to a branch, expand its parent automatically
    - When agent creates branches, expand parent to show new children
    - Preserve expand/collapse state in session storage
    - _Requirements: 8.6_

  - [x] 15.5 Add visual indicators for tree structure
    - Add expand/collapse arrows (▼/▶) for conversations with children
    - Implement indentation styling (20px per depth level)
    - Add visual distinction between root and branch conversations
    - Highlight active conversation in tree
    - Show conversation labels with depth numbering (1.1, 1.2.1, etc.)
    - _Requirements: 8.2, 8.3, 8.5_

- [ ] 16. MVP Testing
  - [ ] 16.1 Test core workflows manually
    - Test create_conversations with "create 3 jokes"
    - Test navigation between conversations
    - Test direct chat in current conversation
    - Test basic branching
    - Test tree view shows branches as children
    - Test expand/collapse functionality
    - Test navigation with collapsed branches
    - Test auto-expand when selecting hidden branch
    - Test session creation and switching
    - Test session deletion
    - Test session persistence across page reloads
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 7.2, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 16.2 Add simple README
    - Basic setup instructions
    - How to add API key
    - Example agent commands
    - _Requirements: 6.3_
