// Session Manager
// Manages session persistence, creation, loading, and deletion using localStorage

const STORAGE_KEY = 'chat-sessions';
const DEBOUNCE_DELAY = 1000; // 1 second

let currentSessionId = null;
let autoSaveTimeout = null;
let stateChangeCallback = null;

// Generate UUID for session IDs
function generateUUID() {
  return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Get all sessions from localStorage
function getSessionsData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return {
        sessions: {},
        currentSessionId: null,
        sessionOrder: []
      };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading sessions:', error);
    return {
      sessions: {},
      currentSessionId: null,
      sessionOrder: []
    };
  }
}

// Save sessions data to localStorage
function saveSessionsData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving sessions:', error);
    if (error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please delete some old sessions.');
    }
    throw error;
  }
}

// Register callback for state changes
export function onStateChange(callback) {
  stateChangeCallback = callback;
}

// Get current session state from conversation manager
function getCurrentState() {
  if (stateChangeCallback) {
    return stateChangeCallback();
  }
  return null;
}

// Creates a new session and saves current session
export function createNewSession() {
  try {
    // Save current session first
    if (currentSessionId) {
      saveCurrentSession();
    }

    // Create new session
    const newSessionId = generateUUID();
    const sessionsData = getSessionsData();

    const newSession = {
      id: newSessionId,
      name: `Session ${Object.keys(sessionsData.sessions).length + 1}`,
      createdAt: Date.now(),
      lastModified: Date.now(),
      agentHistory: [],
      conversations: [],
      currentConversationIndex: 0
    };

    sessionsData.sessions[newSessionId] = newSession;
    sessionsData.currentSessionId = newSessionId;
    sessionsData.sessionOrder.unshift(newSessionId); // Add to front

    saveSessionsData(sessionsData);
    currentSessionId = newSessionId;

    return newSession;
  } catch (error) {
    console.error('Error creating new session:', error);
    throw error;
  }
}

// Saves current session state to localStorage
export function saveCurrentSession() {
  if (!currentSessionId) {
    return false;
  }

  try {
    const state = getCurrentState();
    if (!state) {
      console.warn('No state to save');
      return false;
    }

    const sessionsData = getSessionsData();
    const session = sessionsData.sessions[currentSessionId];

    if (!session) {
      console.warn('Current session not found');
      return false;
    }

    // Update session with current state
    session.agentHistory = state.agentHistory;
    session.conversations = state.conversations;
    session.currentConversationIndex = state.currentConversationIndex;
    session.lastModified = Date.now();

    saveSessionsData(sessionsData);
    return true;
  } catch (error) {
    console.error('Error saving current session:', error);
    throw error;
  }
}

// Loads a specific session by ID
export function loadSession(sessionId) {
  try {
    const sessionsData = getSessionsData();
    const session = sessionsData.sessions[sessionId];

    if (!session) {
      throw new Error('Session not found');
    }

    // Save current session before switching
    if (currentSessionId && currentSessionId !== sessionId) {
      saveCurrentSession();
    }

    // Update current session
    currentSessionId = sessionId;
    sessionsData.currentSessionId = sessionId;

    // Move to front of session order
    sessionsData.sessionOrder = sessionsData.sessionOrder.filter(id => id !== sessionId);
    sessionsData.sessionOrder.unshift(sessionId);

    saveSessionsData(sessionsData);

    return session;
  } catch (error) {
    console.error('Error loading session:', error);
    throw error;
  }
}

// Deletes a session from localStorage
export function deleteSession(sessionId) {
  try {
    const sessionsData = getSessionsData();

    if (!sessionsData.sessions[sessionId]) {
      throw new Error('Session not found');
    }

    // Remove session
    delete sessionsData.sessions[sessionId];
    sessionsData.sessionOrder = sessionsData.sessionOrder.filter(id => id !== sessionId);

    // If deleting current session, load most recent or create new
    if (currentSessionId === sessionId) {
      if (sessionsData.sessionOrder.length > 0) {
        const nextSessionId = sessionsData.sessionOrder[0];
        sessionsData.currentSessionId = nextSessionId;
        currentSessionId = nextSessionId;
      } else {
        // No sessions left, create new one
        sessionsData.currentSessionId = null;
        currentSessionId = null;
      }
    }

    saveSessionsData(sessionsData);

    // Return the session to load next (or null if none)
    if (currentSessionId) {
      return sessionsData.sessions[currentSessionId];
    }
    return null;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

// Gets all saved sessions
export function getAllSessions() {
  const sessionsData = getSessionsData();
  return sessionsData.sessionOrder.map(id => sessionsData.sessions[id]).filter(Boolean);
}

// Gets current session ID
export function getCurrentSessionId() {
  return currentSessionId;
}

// Auto-saves current session (debounced)
export function autoSave() {
  // Clear existing timeout
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  // Set new timeout
  autoSaveTimeout = setTimeout(() => {
    try {
      saveCurrentSession();
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, DEBOUNCE_DELAY);
}

// Restores most recent session on app load
export function restoreMostRecentSession() {
  try {
    const sessionsData = getSessionsData();

    // If there's a current session ID, load it
    if (sessionsData.currentSessionId && sessionsData.sessions[sessionsData.currentSessionId]) {
      currentSessionId = sessionsData.currentSessionId;
      return sessionsData.sessions[sessionsData.currentSessionId];
    }

    // Otherwise, load most recent session
    if (sessionsData.sessionOrder.length > 0) {
      const mostRecentId = sessionsData.sessionOrder[0];
      currentSessionId = mostRecentId;
      sessionsData.currentSessionId = mostRecentId;
      saveSessionsData(sessionsData);
      return sessionsData.sessions[mostRecentId];
    }

    // No sessions exist, create new one
    return createNewSession();
  } catch (error) {
    console.error('Error restoring session:', error);
    // Fallback: create new session
    return createNewSession();
  }
}
