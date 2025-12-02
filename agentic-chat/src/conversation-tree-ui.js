// Conversation Tree Navigator
// Manages hierarchical tree view of conversations with expand/collapse functionality

// State for tracking expanded/collapsed conversations
let expandedConversations = new Set();

/**
 * Builds tree structure from flat conversation list
 * @param {Array} conversations - Flat list of conversations
 * @returns {Array} Tree structure with root nodes
 */
export function buildConversationTree(conversations) {
  // Create a map for quick lookup
  const conversationMap = new Map();
  conversations.forEach(conv => {
    conversationMap.set(conv.id, {
      ...conv,
      children: [],
      isExpanded: expandedConversations.has(conv.id),
      depth: 0
    });
  });

  // Build parent-child relationships and calculate depth
  const roots = [];
  conversationMap.forEach(node => {
    if (node.parentId === null) {
      // Root conversation
      roots.push(node);
    } else {
      // Child conversation - add to parent's children
      const parent = conversationMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
        // Calculate depth
        node.depth = parent.depth + 1;
      } else {
        // Parent not found, treat as root
        roots.push(node);
      }
    }
  });

  // Sort children by ID to maintain consistent order
  conversationMap.forEach(node => {
    node.children.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  });

  return roots;
}

/**
 * Gets list of visible conversations (respecting collapsed state)
 * @param {Array} treeRoots - Root nodes of the tree
 * @returns {Array} Flat list of visible conversations
 */
export function getVisibleConversations(treeRoots) {
  const visible = [];
  
  function traverse(node) {
    visible.push(node);
    
    // Only traverse children if node is expanded
    if (node.isExpanded && node.children.length > 0) {
      node.children.forEach(child => traverse(child));
    }
  }
  
  treeRoots.forEach(root => traverse(root));
  return visible;
}

/**
 * Toggles expand/collapse state for a conversation
 * @param {string} conversationId - ID of conversation to toggle
 */
export function toggleConversationExpand(conversationId) {
  if (expandedConversations.has(conversationId)) {
    expandedConversations.delete(conversationId);
  } else {
    expandedConversations.add(conversationId);
  }
}

/**
 * Finds path from root to a conversation (for auto-expand)
 * @param {string} conversationId - Target conversation ID
 * @param {Array} conversations - Flat list of all conversations
 * @returns {Array} Array of conversation IDs from root to target
 */
export function findConversationPath(conversationId, conversations) {
  const path = [];
  const conversationMap = new Map(conversations.map(c => [c.id, c]));
  
  let current = conversationMap.get(conversationId);
  while (current) {
    path.unshift(current.id);
    current = current.parentId ? conversationMap.get(current.parentId) : null;
  }
  
  return path;
}

/**
 * Expands all ancestors of a conversation
 * @param {string} conversationId - Target conversation ID
 * @param {Array} conversations - Flat list of all conversations
 */
export function expandPathToConversation(conversationId, conversations) {
  const path = findConversationPath(conversationId, conversations);
  // Expand all ancestors (exclude the target itself)
  path.slice(0, -1).forEach(id => {
    expandedConversations.add(id);
  });
}

/**
 * Gets the numbering label for a conversation (e.g., "1.2.1")
 * @param {Object} node - Tree node
 * @param {Array} treeRoots - Root nodes for indexing
 * @returns {string} Numbering label
 */
function getConversationLabel(node, treeRoots) {
  const labels = [];
  
  function findLabel(targetNode, siblings, prefix = '') {
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      const currentLabel = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      
      if (sibling.id === targetNode.id) {
        return currentLabel;
      }
      
      if (sibling.children.length > 0) {
        const childLabel = findLabel(targetNode, sibling.children, currentLabel);
        if (childLabel) return childLabel;
      }
    }
    return null;
  }
  
  return findLabel(node, treeRoots) || node.id;
}

/**
 * Gets the first user prompt from conversation history
 * @param {Object} conversation - Conversation object
 * @returns {string} First prompt or placeholder
 */
function getFirstPrompt(conversation) {
  const firstUserMsg = conversation.history.find(msg => msg.role === 'user');
  if (firstUserMsg) {
    // Truncate long prompts
    const prompt = firstUserMsg.content;
    return prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
  }
  return 'New conversation';
}

/**
 * Gets the model provider class for color coding
 * @param {string} modelId - Model ID string
 * @returns {string} Provider class name
 */
function getModelProviderClass(modelId) {
  const id = modelId.toLowerCase();
  if (id.includes('openai') || id.includes('gpt')) return 'openai';
  if (id.includes('anthropic') || id.includes('claude')) return 'anthropic';
  if (id.includes('google') || id.includes('gemini')) return 'google';
  if (id.includes('x-ai') || id.includes('grok')) return 'xai';
  if (id.includes('meta') || id.includes('llama')) return 'meta';
  return '';
}

/**
 * Gets a short model name for display
 * @param {string} modelName - Full model name
 * @returns {string} Short model name
 */
function getShortModelName(modelName) {
  // Common abbreviations
  const name = modelName
    .replace('Claude ', '')
    .replace('GPT-', 'GPT')
    .replace('Gemini ', 'Gem ')
    .replace('Grok ', 'Grok')
    .replace(' Pro', '')
    .replace(' Flash', ' F')
    .replace(' Thinking', ' T');
  return name.length > 12 ? name.substring(0, 10) + '..' : name;
}

/**
 * Renders the conversation tree with indentation and expand/collapse controls
 * @param {Array} treeRoots - Root nodes of the tree
 * @param {string} currentConversationId - ID of currently active conversation
 * @param {Function} onSelect - Callback when conversation is selected
 * @param {Function} onToggle - Callback when expand/collapse is toggled
 * @returns {HTMLElement} Tree container element
 */
export function renderConversationTree(treeRoots, currentConversationId, onSelect, onToggle) {
  const container = document.createElement('div');
  container.className = 'conversation-tree';

  function renderNode(node) {
    const nodeEl = document.createElement('div');
    nodeEl.className = 'tree-node';
    nodeEl.style.paddingLeft = `${12 + node.depth * 16}px`;

    if (node.id === currentConversationId) {
      nodeEl.classList.add('active');
    }

    // Expand/collapse arrow (only if has children)
    const arrow = document.createElement('span');
    arrow.className = 'tree-arrow';
    if (node.children.length > 0) {
      arrow.textContent = node.isExpanded ? '▼' : '▶';
      arrow.style.cursor = 'pointer';
      arrow.addEventListener('click', (e) => {
        e.stopPropagation();
        onToggle(node.id);
      });
    } else {
      arrow.innerHTML = '&nbsp;';
      arrow.style.visibility = 'hidden';
    }

    // Model badge with color
    const badge = document.createElement('span');
    badge.className = 'tree-model-badge';
    const providerClass = getModelProviderClass(node.modelId);
    if (providerClass) {
      badge.classList.add(providerClass);
    }
    badge.textContent = getShortModelName(node.modelName);
    badge.title = node.modelName;

    // Conversation label
    const label = document.createElement('span');
    label.className = 'tree-label';
    const numberLabel = getConversationLabel(node, treeRoots);
    const prompt = getFirstPrompt(node);

    const numberSpan = document.createElement('span');
    numberSpan.className = 'tree-label-number';
    numberSpan.textContent = `${numberLabel}.`;

    const promptSpan = document.createElement('span');
    promptSpan.className = 'tree-label-prompt';
    promptSpan.textContent = prompt;

    label.appendChild(numberSpan);
    label.appendChild(promptSpan);

    // Branch count indicator (if has children)
    let branchCount = null;
    if (node.children.length > 0) {
      branchCount = document.createElement('span');
      branchCount.className = 'tree-branch-count';
      branchCount.textContent = `${node.children.length}`;
      branchCount.title = `${node.children.length} branch${node.children.length > 1 ? 'es' : ''}`;
    }

    // Click handler for selection
    nodeEl.addEventListener('click', () => {
      onSelect(node.id);
    });

    nodeEl.appendChild(arrow);
    nodeEl.appendChild(badge);
    nodeEl.appendChild(label);
    if (branchCount) {
      nodeEl.appendChild(branchCount);
    }
    container.appendChild(nodeEl);

    // Render children if expanded
    if (node.isExpanded && node.children.length > 0) {
      node.children.forEach(child => renderNode(child));
    }
  }

  treeRoots.forEach(root => renderNode(root));

  return container;
}

/**
 * Gets root conversations (those without parents)
 * @param {Array} conversations - Flat list of conversations
 * @returns {Array} Root conversations
 */
export function getRootConversations(conversations) {
  return conversations.filter(conv => conv.parentId === null);
}

/**
 * Gets children of a specific conversation
 * @param {string} parentId - Parent conversation ID
 * @param {Array} conversations - Flat list of conversations
 * @returns {Array} Child conversations
 */
export function getConversationChildren(parentId, conversations) {
  return conversations.filter(conv => conv.parentId === parentId);
}

/**
 * Calculates the depth/nesting level of a conversation
 * @param {string} conversationId - Conversation ID
 * @param {Array} conversations - Flat list of conversations
 * @returns {number} Depth level (0 for roots)
 */
export function getConversationDepth(conversationId, conversations) {
  const conversationMap = new Map(conversations.map(c => [c.id, c]));
  let depth = 0;
  let current = conversationMap.get(conversationId);
  
  while (current && current.parentId) {
    depth++;
    current = conversationMap.get(current.parentId);
  }
  
  return depth;
}

/**
 * Resets expand/collapse state (useful for testing or session changes)
 */
export function resetExpandState() {
  expandedConversations.clear();
}

/**
 * Gets current expand state (for persistence)
 * @returns {Array} Array of expanded conversation IDs
 */
export function getExpandState() {
  return Array.from(expandedConversations);
}

/**
 * Sets expand state (for restoration from persistence)
 * @param {Array} expandedIds - Array of conversation IDs to expand
 */
export function setExpandState(expandedIds) {
  expandedConversations = new Set(expandedIds);
}
