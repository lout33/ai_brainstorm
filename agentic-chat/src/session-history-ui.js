// Session History UI
// Manages the session history panel on the left side

// Format timestamp for display
function formatTimestamp(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

// Renders the session history list
export function renderSessionList(sessions, currentSessionId, onSessionSelect, onDeleteSession) {
  const sessionList = document.getElementById('session-list');
  sessionList.innerHTML = '';
  
  if (sessions.length === 0) {
    sessionList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">No sessions yet</div>';
    return;
  }
  
  sessions.forEach(session => {
    const sessionItem = document.createElement('div');
    sessionItem.className = `session-item ${session.id === currentSessionId ? 'active' : ''}`;
    
    const sessionName = document.createElement('div');
    sessionName.className = 'session-name';
    sessionName.textContent = session.name;
    
    const sessionTime = document.createElement('div');
    sessionTime.className = 'session-time';
    sessionTime.textContent = formatTimestamp(session.lastModified);
    
    const sessionActions = document.createElement('div');
    sessionActions.className = 'session-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-session-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent session selection
      onDeleteSession(session.id);
    };
    
    sessionActions.appendChild(deleteBtn);
    
    sessionItem.appendChild(sessionName);
    sessionItem.appendChild(sessionTime);
    sessionItem.appendChild(sessionActions);
    
    // Click to select session
    sessionItem.onclick = () => {
      if (session.id !== currentSessionId) {
        onSessionSelect(session.id);
      }
    };
    
    sessionList.appendChild(sessionItem);
  });
}

// Shows confirmation dialog for session deletion
export function showDeleteConfirmation(sessionName) {
  return confirm(`Delete session "${sessionName}"? This cannot be undone.`);
}

// Highlights current session
export function highlightCurrentSession(sessionId) {
  const sessionItems = document.querySelectorAll('.session-item');
  sessionItems.forEach(item => {
    item.classList.remove('active');
  });
  
  // Find and highlight the current session
  sessionItems.forEach(item => {
    const sessionName = item.querySelector('.session-name');
    if (sessionName && item.dataset.sessionId === sessionId) {
      item.classList.add('active');
    }
  });
}
