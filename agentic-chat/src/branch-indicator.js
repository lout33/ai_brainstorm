// Branch Indicator Component
// Visual indicator showing conversation flow with dots and lines on the right side

// State
let currentMessageId = null;
let messages = [];
let branchIndicatorElement = null;

/**
 * Initialize the branch indicator
 * @param {HTMLElement} container - Container element to append the indicator to
 */
export function initBranchIndicator(container) {
  // Create branch indicator structure
  branchIndicatorElement = document.createElement('div');
  branchIndicatorElement.className = 'branch-indicator';
  branchIndicatorElement.innerHTML = `
    <div class="branch-line"></div>
    <div class="branch-dots-container"></div>
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
  dot.dataset.messageId = message.id || index;
  dot.dataset.messageIndex = index;
  
  // Check if this is the active message
  if (message.id === currentMessageId || index === messages.length - 1) {
    dot.classList.add('active');
  }
  
  // Check if this is a branch point (placeholder for now)
  if (message.isBranchPoint) {
    dot.classList.add('branch-point');
  }
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'branch-tooltip';
  tooltip.textContent = getMessagePreview(message);
  dot.appendChild(tooltip);
  
  // Add click handler
  dot.addEventListener('click', () => handleDotClick(message.id || index));
  
  return dot;
}

/**
 * Get preview text for a message
 * @param {Object} message - Message object
 * @returns {string} Preview text
 */
function getMessagePreview(message) {
  const content = message.content || '';
  const maxLength = 50;
  
  if (content.length > maxLength) {
    return content.substring(0, maxLength) + '...';
  }
  
  return content || 'Message';
}

/**
 * Handle dot click - scroll to message
 * @param {string|number} messageId - Message ID or index
 */
function handleDotClick(messageId) {
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  
  if (messageElement) {
    messageElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
    
    // Update active dot
    updateActiveDot(messageId);
  }
}

/**
 * Update which dot is marked as active
 * @param {string|number} messageId - Message ID or index
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
 * @param {HTMLElement} scrollContainer - Container that scrolls
 */
export function setupScrollSync(scrollContainer) {
  let scrollTimeout;
  
  const handleScroll = () => {
    // Debounce scroll events
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      updateActiveDotFromScroll(scrollContainer);
    }, 100);
  };
  
  scrollContainer.addEventListener('scroll', handleScroll);
  
  // Return cleanup function
  return () => {
    scrollContainer.removeEventListener('scroll', handleScroll);
  };
}

/**
 * Update active dot based on scroll position
 * @param {HTMLElement} scrollContainer - Container that scrolls
 */
function updateActiveDotFromScroll(scrollContainer) {
  const messageElements = scrollContainer.querySelectorAll('.message');
  if (messageElements.length === 0) return;
  
  const viewportCenter = scrollContainer.scrollTop + scrollContainer.clientHeight / 2;
  
  let closestMessage = null;
  let closestDistance = Infinity;
  
  messageElements.forEach(msgEl => {
    const rect = msgEl.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const messageCenter = msgEl.offsetTop + msgEl.offsetHeight / 2;
    const distance = Math.abs(messageCenter - viewportCenter);
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestMessage = msgEl;
    }
  });
  
  if (closestMessage) {
    const messageId = closestMessage.dataset.messageId || closestMessage.dataset.messageIndex;
    if (messageId) {
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
