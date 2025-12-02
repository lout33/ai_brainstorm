// Branch Indicator Component
// Visual indicator showing conversation message flow on the right side of chat

// State
let currentMessageId = null;
let messages = [];
let branchIndicatorElement = null;
let scrollContainer = null;

/**
 * Initialize the branch indicator
 * @param {HTMLElement} container - Container element to append the indicator to
 */
export function initBranchIndicator(container) {
  // Create branch indicator structure
  branchIndicatorElement = document.createElement('div');
  branchIndicatorElement.className = 'branch-indicator';
  branchIndicatorElement.innerHTML = `
    <div class="branch-indicator-track">
      <div class="branch-line"></div>
      <div class="branch-dots-container"></div>
    </div>
  `;

  container.appendChild(branchIndicatorElement);

  return branchIndicatorElement;
}

/**
 * Update branch indicator with new messages
 * @param {Array} messageList - Array of message objects
 * @param {string} activeMessageId - ID of the currently active message
 */
export function updateBranchIndicator(messageList, activeMessageId = null) {
  if (!branchIndicatorElement) {
    console.warn('Branch indicator not initialized');
    return;
  }

  messages = messageList;
  currentMessageId = activeMessageId;

  // Toggle compact mode for many messages
  if (messages.length > 8) {
    branchIndicatorElement.classList.add('compact');
  } else {
    branchIndicatorElement.classList.remove('compact');
  }

  renderDots();
}

/**
 * Render dots based on current messages
 */
function renderDots() {
  const dotsContainer = branchIndicatorElement.querySelector('.branch-dots-container');
  if (!dotsContainer) return;

  // Clear existing dots
  dotsContainer.innerHTML = '';

  // Handle empty state
  if (messages.length === 0) {
    branchIndicatorElement.style.display = 'none';
    return;
  }

  branchIndicatorElement.style.display = 'flex';

  // Create dots for each message
  messages.forEach((message, index) => {
    const dot = createDot(message, index);
    dotsContainer.appendChild(dot);
  });
}

/**
 * Create a single dot element
 * @param {Object} message - Message object
 * @param {number} index - Message index
 * @returns {HTMLElement} Dot element
 */
function createDot(message, index) {
  const dot = document.createElement('div');
  dot.className = 'branch-dot';
  dot.dataset.messageId = message.id || `msg-${index}`;
  dot.dataset.messageIndex = index;

  // Add role class
  if (message.role) {
    dot.classList.add(message.role);
  }

  // Check if this is the active message
  const isActive = message.id === currentMessageId ||
                   (currentMessageId === null && index === messages.length - 1);
  if (isActive) {
    dot.classList.add('active');
  }

  // Check if this is a branch point
  if (message.isBranchPoint) {
    dot.classList.add('branch-point');
  }

  // Create tooltip with role and content
  const tooltip = document.createElement('div');
  tooltip.className = 'branch-tooltip';

  const roleLabel = document.createElement('div');
  roleLabel.className = 'branch-tooltip-role';
  roleLabel.textContent = message.role === 'user' ? 'You' : 'Assistant';

  const contentLabel = document.createElement('div');
  contentLabel.className = 'branch-tooltip-content';
  contentLabel.textContent = getMessagePreview(message);

  tooltip.appendChild(roleLabel);
  tooltip.appendChild(contentLabel);
  dot.appendChild(tooltip);

  // Add click handler
  dot.addEventListener('click', () => handleDotClick(message.id || `msg-${index}`, index));

  return dot;
}

/**
 * Get preview text for a message
 * @param {Object} message - Message object
 * @returns {string} Preview text
 */
function getMessagePreview(message) {
  const content = message.content || '';
  const maxLength = 40;

  // Remove newlines and extra whitespace
  const cleaned = content.replace(/\s+/g, ' ').trim();

  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength) + '...';
  }

  return cleaned || 'Empty message';
}

/**
 * Handle dot click - scroll to message
 * @param {string} messageId - Message ID
 * @param {number} index - Message index
 */
function handleDotClick(messageId, index) {
  // Try to find by data-message-id first
  let messageElement = document.querySelector(`[data-message-id="${messageId}"]`);

  // Fallback to finding by index
  if (!messageElement) {
    const allMessages = document.querySelectorAll('.chat-messages .message');
    if (allMessages[index]) {
      messageElement = allMessages[index];
    }
  }

  if (messageElement) {
    messageElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    // Add highlight animation
    messageElement.classList.add('highlight');
    setTimeout(() => {
      messageElement.classList.remove('highlight');
    }, 1000);

    // Update active dot
    updateActiveDot(messageId);
  }
}

/**
 * Update which dot is marked as active
 * @param {string} messageId - Message ID
 */
export function updateActiveDot(messageId) {
  if (!branchIndicatorElement) return;

  const dots = branchIndicatorElement.querySelectorAll('.branch-dot');

  dots.forEach(dot => {
    if (dot.dataset.messageId === String(messageId)) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  currentMessageId = messageId;
}

/**
 * Setup scroll synchronization
 * @param {HTMLElement} container - Container that scrolls
 */
export function setupScrollSync(container) {
  scrollContainer = container;
  let scrollTimeout;
  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateActiveDotFromScroll(container);
        ticking = false;
      });
      ticking = true;
    }
  };

  container.addEventListener('scroll', handleScroll, { passive: true });

  // Return cleanup function
  return () => {
    container.removeEventListener('scroll', handleScroll);
  };
}

/**
 * Update active dot based on scroll position
 * @param {HTMLElement} container - Container that scrolls
 */
function updateActiveDotFromScroll(container) {
  const messageElements = container.querySelectorAll('.message');
  if (messageElements.length === 0) return;

  const containerRect = container.getBoundingClientRect();
  const viewportCenter = containerRect.top + containerRect.height / 2;

  let closestMessage = null;
  let closestDistance = Infinity;

  messageElements.forEach(msgEl => {
    const rect = msgEl.getBoundingClientRect();
    const messageCenter = rect.top + rect.height / 2;
    const distance = Math.abs(messageCenter - viewportCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestMessage = msgEl;
    }
  });

  if (closestMessage) {
    const messageId = closestMessage.dataset.messageId || closestMessage.dataset.messageIndex;
    if (messageId && messageId !== currentMessageId) {
      updateActiveDot(messageId);
    }
  }
}

/**
 * Hide branch indicator
 */
export function hideBranchIndicator() {
  if (branchIndicatorElement) {
    branchIndicatorElement.style.display = 'none';
  }
}

/**
 * Show branch indicator
 */
export function showBranchIndicator() {
  if (branchIndicatorElement) {
    branchIndicatorElement.style.display = 'flex';
  }
}

/**
 * Destroy branch indicator
 */
export function destroyBranchIndicator() {
  if (branchIndicatorElement && branchIndicatorElement.parentNode) {
    branchIndicatorElement.parentNode.removeChild(branchIndicatorElement);
    branchIndicatorElement = null;
  }
}
